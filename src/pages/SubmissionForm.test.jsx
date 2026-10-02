import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { updateSubmission, getSubmissionById, getProvinces, getDistrictsByProvince } from '../services/api';
import { draftKey, loadDraft, saveDraft } from '../utils/draftStorage';
import SubmissionForm from './SubmissionForm';

const LOADED = {
    id: 'abc', title: 'Original title', intervention_measurement: 'Mitigation',
    implementation_status: 'Planned', updatedate: '2026-10-02T08:00:00', mitigation: {},
};
const login = vi.fn().mockResolvedValue({});

vi.mock('../services/api', () => ({
    getSubmissionById: vi.fn(() => Promise.resolve({ ...LOADED })),
    updateSubmission: vi.fn(),
    createSubmission: vi.fn(),
    getProvinces: vi.fn().mockResolvedValue([]),
    getDistrictsByProvince: vi.fn().mockResolvedValue([]),
    getLocalDistrictsByDistrict: vi.fn().mockResolvedValue([]),
    getVocabulary: vi.fn().mockResolvedValue([]),
    uploadProgressReport: vi.fn(),
    API_BASE_URL: '',
}));
vi.mock('../context/CurrentUserContext', () => ({
    useCurrentUser: () => ({
        user: { id: 7, email: 'capturer@example.org' },
        loading: false,
        hasPermission: () => true,
        login,
    }),
}));

const apiError = (status, detail) => Object.assign(new Error(detail?.message || 'error'), { status, detail });

const renderForm = () => render(
    <MemoryRouter initialEntries={['/submission/edit/abc']}>
        <Routes>
            <Route path="/submission/edit/:id" element={<SubmissionForm />} />
            <Route path="/submission/:id" element={<p>Saved page</p>} />
        </Routes>
    </MemoryRouter>
);

const editTitle = async (value) => {
    const title = await screen.findByDisplayValue('Original title');
    fireEvent.change(title, { target: { value } });
};
const submit = () => fireEvent.submit(document.getElementById('submission-form'));

describe('SubmissionForm safe capture', () => {
    beforeEach(() => {
        localStorage.clear();
        updateSubmission.mockReset();
        login.mockClear();
    });

    it('sends the loaded updatedate so the API can detect conflicts', async () => {
        updateSubmission.mockResolvedValue({ updatedate: '2026-10-02T09:00:00' });
        renderForm();
        await editTitle('Mine');
        submit();
        expect(await screen.findByText('Saved page')).toBeInTheDocument();
        expect(updateSubmission.mock.calls[0][1]).toMatchObject({ title: 'Mine', expected_updatedate: '2026-10-02T08:00:00' });
    });

    it('on an expired session, logs in over the form and retries the save', async () => {
        updateSubmission
            .mockRejectedValueOnce(apiError(401, 'Token expired'))
            .mockResolvedValueOnce({ updatedate: '2026-10-02T09:00:00' });
        renderForm();
        await editTitle('Mine');
        submit();

        expect(await screen.findByText('Your session has expired')).toBeInTheDocument();
        expect(loadDraft(draftKey(7, 'abc')).data.title).toBe('Mine');

        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
        fireEvent.click(screen.getByRole('button', { name: 'Log in and save' }));

        expect(await screen.findByText('Saved page')).toBeInTheDocument();
        expect(login).toHaveBeenCalledWith('capturer@example.org', 'secret');
        expect(updateSubmission.mock.calls[1][1].title).toBe('Mine');
        expect(loadDraft(draftKey(7, 'abc'))).toBeNull();
    });

    it('on a conflict, names the other editor and only overwrites when asked', async () => {
        updateSubmission
            .mockRejectedValueOnce(apiError(409, { message: 'changed', updatedby: 'Thandi M', updatedate: '2026-10-02T08:30:00' }))
            .mockResolvedValueOnce({ updatedate: '2026-10-02T09:00:00' });
        renderForm();
        await editTitle('Mine');
        submit();

        expect(await screen.findByText('Thandi M')).toBeInTheDocument();
        expect(screen.queryByText('Saved page')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Replace with mine' }));
        expect(await screen.findByText('Saved page')).toBeInTheDocument();
        expect(updateSubmission.mock.calls[1][1]).not.toHaveProperty('expected_updatedate');
    });

    it('offers to restore an unsaved draft, keeping its original base version', async () => {
        saveDraft(draftKey(7, 'abc'), { ...LOADED, title: 'Half-finished edit', mitigation_data: {} }, '2026-10-02T07:00:00');
        updateSubmission.mockResolvedValue({ updatedate: '2026-10-02T09:00:00' });
        renderForm();

        fireEvent.click(await screen.findByRole('button', { name: 'Restore my changes' }));
        await waitFor(() => expect(screen.getByDisplayValue('Half-finished edit')).toBeInTheDocument());
        submit();
        await screen.findByText('Saved page');
        expect(updateSubmission.mock.calls[0][1].expected_updatedate).toBe('2026-10-02T07:00:00');
    });

    it('selects stored region names in the code-keyed dropdowns without flagging a change', async () => {
        getSubmissionById.mockResolvedValueOnce({
            ...LOADED, geo_location: { province: 'Western Cape', district: 'City of Cape Town', coordinates: [18.4, -33.9] },
        });
        getProvinces.mockResolvedValueOnce([{ code: 'WC', name: 'Western Cape' }, { code: 'GT', name: 'Gauteng' }]);
        getDistrictsByProvince.mockImplementation(async (code) => (code === 'WC' ? [{ code: 'CPT', name: 'City of Cape Town' }] : []));
        updateSubmission.mockResolvedValue({ updatedate: '2026-10-02T09:00:00' });
        renderForm();

        await waitFor(() => expect(screen.getByDisplayValue('Western Cape')).toHaveValue('WC'));
        await waitFor(() => expect(screen.getByDisplayValue('City of Cape Town')).toHaveValue('CPT'));
        await new Promise((r) => setTimeout(r, 900)); // past the draft auto-save delay
        expect(loadDraft(draftKey(7, 'abc'))).toBeNull();

        submit();
        await screen.findByText('Saved page');
        expect(updateSubmission.mock.calls[0][1].geo_location).toMatchObject({ province: 'WC', district: 'CPT' });
    });
});
