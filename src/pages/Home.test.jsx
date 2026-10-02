import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getSubmissions } from '../services/api';
import Home from './Home';

vi.mock('../services/api', () => ({
    getSubmissions: vi.fn(),
    getFacets: vi.fn().mockResolvedValue({ province: ['Gauteng', 'National'] }),
    downloadExport: vi.fn(),
}));
const auth = { isAuthenticated: false };
vi.mock('../context/CurrentUserContext', () => ({
    useCurrentUser: () => ({ hasPermission: () => false, isAuthenticated: auth.isAuthenticated, loading: false }),
}));
vi.mock('../components/Navbar', () => ({ default: () => null }));

const project = (id, title) => ({ id, title, intervention_measurement: 'Mitigation' });

/** A promise plus its resolver, rejecting with AbortError if its signal fires. */
const deferred = (signal) => {
    let resolve;
    const promise = new Promise((res, rej) => {
        resolve = res;
        signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    });
    return { promise, resolve };
};

describe('Home filtering', () => {
    beforeEach(() => {
        getSubmissions.mockReset();
        auth.isAuthenticated = false;
    });

    it('applies filters on change, combining them, and ignores superseded responses', async () => {
        const calls = [];
        getSubmissions.mockImplementation((params, { signal } = {}) => {
            const d = deferred(signal);
            calls.push({ params, ...d });
            return d.promise;
        });

        render(<MemoryRouter><Home /></MemoryRouter>);
        await waitFor(() => expect(calls).toHaveLength(1));
        calls[0].resolve([project('a', 'Everything')]);
        expect(await screen.findByText('Everything')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('Mitigation'));
        await waitFor(() => expect(calls).toHaveLength(2));
        fireEvent.change(await screen.findByLabelText('Province'), { target: { value: 'Gauteng' } });
        await waitFor(() => expect(calls).toHaveLength(3));

        expect(calls[2].params).toEqual({ intervention_measurement: 'Mitigation', province: 'Gauteng' });

        // Newest response lands first; the stale Mitigation-only one arrives late.
        calls[2].resolve([project('b', 'Mitigation in Gauteng')]);
        calls[1].resolve([project('c', 'Mitigation anywhere')]);

        expect(await screen.findByText('Mitigation in Gauteng')).toBeInTheDocument();
        expect(screen.queryByText('Mitigation anywhere')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /apply filters/i })).not.toBeInTheDocument();
    });

    it('labels National as South Africa', async () => {
        getSubmissions.mockResolvedValue([]);
        render(<MemoryRouter><Home /></MemoryRouter>);
        expect(await screen.findByRole('option', { name: 'South Africa (National)' })).toHaveValue('National');
    });

    it('offers "Only my submissions" to logged-in users and sends it as mine', async () => {
        getSubmissions.mockResolvedValue([]);
        const { unmount } = render(<MemoryRouter><Home /></MemoryRouter>);
        await waitFor(() => expect(getSubmissions).toHaveBeenCalled());
        expect(screen.queryByLabelText('Only my submissions')).not.toBeInTheDocument();
        unmount();

        auth.isAuthenticated = true;
        render(<MemoryRouter><Home /></MemoryRouter>);
        fireEvent.click(await screen.findByLabelText('Only my submissions'));
        await waitFor(() => expect(getSubmissions).toHaveBeenLastCalledWith({ mine: 'true' }, expect.anything()));
    });

    it('turns the filter on from the header link (/?mine=1)', async () => {
        auth.isAuthenticated = true;
        getSubmissions.mockResolvedValue([]);
        render(<MemoryRouter initialEntries={['/?mine=1']}><Home /></MemoryRouter>);
        await waitFor(() => expect(getSubmissions).toHaveBeenLastCalledWith({ mine: 'true' }, expect.anything()));
        expect(screen.getByLabelText('Only my submissions')).toBeChecked();
    });
});
