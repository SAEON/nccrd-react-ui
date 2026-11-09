import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { removeSiteImage, updateSite, uploadSiteImage } from '../services/api';
import AdminSite from './AdminSite';

const applySite = vi.fn();
let site;
vi.mock('../context/CurrentUserContext', () => ({
    useCurrentUser: () => ({ hasPermission: (p) => p === 'edit-site', loading: false }),
}));
vi.mock('../context/SiteContext', () => ({ useSite: () => site, useSiteUpdate: () => applySite }));
vi.mock('../services/api', () => ({ updateSite: vi.fn(), uploadSiteImage: vi.fn(), removeSiteImage: vi.fn() }));

const MCCRD = {
    hostname: 'mccrd.environment.gov.za', title: 'Mpumalanga Climate Change Response Database', short_title: 'MCCRD',
    contact_email: 'nccrd@environment.gov.za', theme: { 'accent-primary': '#622700' },
    front_matter: { about: { title: 'Welcome', content: 'Old text' } },
    logo_url: '/sites/mccrd/arms.png', flag_url: '/flag.svg', hero_image: { url: '/sites/mccrd/hero.jpg', credit: 'Dietmar Rabich' },
};

describe('AdminSite', () => {
    beforeEach(() => {
        site = MCCRD;
        applySite.mockReset();
        updateSite.mockReset().mockResolvedValue({ ...MCCRD, title: 'Saved' });
        uploadSiteImage.mockReset().mockResolvedValue(MCCRD);
        removeSiteImage.mockReset().mockResolvedValue(MCCRD);
    });

    it('starts from the site and saves its texts, names and colour, showing them at once', async () => {
        render(<MemoryRouter><AdminSite /></MemoryRouter>);
        expect(screen.getByLabelText('Short name')).toHaveValue('MCCRD');
        expect(screen.getByLabelText('Main colour')).toHaveValue('#622700');
        expect(screen.getAllByLabelText('Text')[0]).toHaveValue('Old text');

        fireEvent.change(screen.getAllByLabelText('Text')[0], { target: { value: 'New first.\n\nNew second.' } });
        fireEvent.change(screen.getByLabelText('Contact email address'), { target: { value: 'mccrd@mpg.gov.za' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

        await waitFor(() => expect(updateSite).toHaveBeenCalled());
        const body = updateSite.mock.calls[0][0];
        expect(body.sections.about).toEqual({ title: 'Welcome', content: 'New first.\n\nNew second.' });
        expect(body.sections.context.title).toBe('Climate change here');
        expect(body.contact_email).toBe('mccrd@mpg.gov.za');
        expect(body.hero_credit).toEqual({ credit: 'Dietmar Rabich', license: null, source_url: null, license_url: null });
        await waitFor(() => expect(applySite).toHaveBeenCalledWith({ ...MCCRD, title: 'Saved' }));
        expect(screen.getByRole('status')).toHaveTextContent('Saved.');
    });

    it('uploads an image and removes the flag only when the site has its own', async () => {
        render(<MemoryRouter><AdminSite /></MemoryRouter>);
        const file = new File(['png'], 'arms.png', { type: 'image/png' });
        fireEvent.change(screen.getByLabelText('Upload a new emblem'), { target: { files: [file] } });
        await waitFor(() => expect(uploadSiteImage).toHaveBeenCalledWith('logo', file));
        expect(applySite).toHaveBeenCalledWith(MCCRD);

        // The emblem can be removed; the flag is the national default, so there's nothing to remove.
        expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(1);
        fireEvent.click(screen.getByRole('button', { name: 'Use the default photo' }));
        await waitFor(() => expect(removeSiteImage).toHaveBeenCalledWith('hero'));
    });

    it('waits for the site before showing the form', () => {
        site = { ...MCCRD, hostname: undefined };
        render(<MemoryRouter><AdminSite /></MemoryRouter>);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
        expect(screen.queryByLabelText('Short name')).not.toBeInTheDocument();
    });
});
