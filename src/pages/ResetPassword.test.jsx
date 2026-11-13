import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { requestPasswordReset, resetPassword } from '../services/api';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';

vi.mock('../services/api', () => ({ requestPasswordReset: vi.fn(), resetPassword: vi.fn() }));

const Address = () => {
    const { pathname, hash } = useLocation();
    return <div data-testid="address">{pathname + hash}</div>;
};

const at = (entry, page) => render(
    <MemoryRouter initialEntries={[entry]}>
        <Routes><Route path="*" element={<>{page}<Address /></>} /></Routes>
    </MemoryRouter>,
);

const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = (name) => fireEvent.submit(screen.getByRole('button', { name }).closest('form'));

describe('ForgotPassword', () => {
    beforeEach(() => requestPasswordReset.mockReset().mockResolvedValue({ detail: 'If an account uses that email address, we’ve sent it a link.' }));

    it('starts from the email typed on the login form and shows the reply', async () => {
        at({ pathname: '/forgot-password', state: { email: 'thandi@example.org' } }, <ForgotPassword />);
        expect(screen.getByLabelText('Email')).toHaveValue('thandi@example.org');
        submit('Send link');
        expect(await screen.findByRole('status')).toHaveTextContent('we’ve sent it a link');
        expect(requestPasswordReset).toHaveBeenCalledWith('thandi@example.org');
    });
});

describe('ResetPassword', () => {
    beforeEach(() => resetPassword.mockReset().mockResolvedValue({ detail: 'Your password is set.' }));

    it('sets the password with the token from the link, and takes the token out of the address', async () => {
        at('/reset-password#token=abc.def', <ResetPassword />);
        expect(screen.getByTestId('address')).toHaveTextContent(/^\/reset-password$/);
        change('New password', 'a-new-password');
        change('Confirm new password', 'a-new-password');
        submit('Set password');
        expect(await screen.findByRole('status')).toHaveTextContent('Your password is set.');
        expect(resetPassword).toHaveBeenCalledWith('abc.def', 'a-new-password');
    });

    it('catches mismatched passwords before sending', () => {
        at('/reset-password#token=abc.def', <ResetPassword />);
        change('New password', 'a-new-password');
        change('Confirm new password', 'something-else');
        submit('Set password');
        expect(screen.getByRole('alert')).toHaveTextContent('don’t match');
        expect(resetPassword).not.toHaveBeenCalled();
    });

    it('offers a new link when this one has expired', async () => {
        resetPassword.mockRejectedValueOnce(new Error('This link has expired or has already been used. Ask for a new one.'));
        at('/reset-password#token=old', <ResetPassword />);
        change('New password', 'a-new-password');
        change('Confirm new password', 'a-new-password');
        submit('Set password');
        expect(await screen.findByRole('link', { name: 'Ask for a new link' })).toHaveAttribute('href', '/forgot-password');
    });

    it('says so when the link has no token', () => {
        at('/reset-password', <ResetPassword />);
        expect(screen.getByRole('alert')).toHaveTextContent('This link is incomplete');
    });
});
