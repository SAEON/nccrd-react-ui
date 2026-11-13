import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SiteProvider } from './SiteProvider';
import { getSite } from '../services/api';
import { loadPage } from '../utils/site';

vi.mock('../services/api', () => ({ getSite: vi.fn(), API_BASE_URL: 'http://localhost:2022' }));
vi.mock('../utils/site', async (importOriginal) => ({ ...(await importOriginal()), loadPage: vi.fn() }));

/** The page at `address` (what the browser shows), routed at `route` (what the router sees under its basename). */
const renderAt = (address, route) => {
    window.history.replaceState(null, '', address);
    return render(<MemoryRouter initialEntries={[route]}><SiteProvider>page</SiteProvider></MemoryRouter>);
};

describe('SiteProvider and the address', () => {
    beforeEach(() => {
        getSite.mockReset();
        loadPage.mockReset();
    });

    it('moves a province site found by its hostname to its province path, keeping the page', async () => {
        getSite.mockResolvedValue({ short_title: 'MCCRD', province: 'Mpumalanga' });
        renderAt('/reports?a=1#top', { pathname: '/reports', search: '?a=1', hash: '#top' });
        await waitFor(() => expect(loadPage).toHaveBeenCalledWith('/mpumalanga/reports?a=1#top'));
    });

    it('moves its home page to the bare province path', async () => {
        getSite.mockResolvedValue({ short_title: 'WCCRD', province: 'Western Cape' });
        renderAt('/', '/');
        await waitFor(() => expect(loadPage).toHaveBeenCalledWith('/western-cape'));
    });

    it('stays on a province path', async () => {
        getSite.mockResolvedValue({ short_title: 'MCCRD', province: 'Mpumalanga' });
        renderAt('/mpumalanga/reports', '/reports');
        await waitFor(() => expect(document.title).toBe('MCCRD'));
        expect(loadPage).not.toHaveBeenCalled();
    });

    it('leaves the national site where it is', async () => {
        getSite.mockResolvedValue({ short_title: 'NCCRD', province: null });
        renderAt('/reports', '/reports');
        await waitFor(() => expect(document.title).toBe('NCCRD'));
        expect(loadPage).not.toHaveBeenCalled();
    });
});
