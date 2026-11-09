import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getStats } from '../services/api';
import AdminStats from './AdminStats';
import { byWeek } from '../utils/stats';

vi.mock('../context/CurrentUserContext', () => ({
    useCurrentUser: () => ({ hasPermission: (p) => p === 'view-stats', loading: false }),
}));
vi.mock('../context/SiteContext', () => ({ useSite: () => ({ short_title: 'NCCRD' }) }));
vi.mock('../services/api', () => ({ getStats: vi.fn() }));

const day = (d, views, downloads = 0) => ({ day: `2026-11-0${d}`, views, downloads });
const STATS = {
    since: '2026-11-03', until: '2026-11-09', views: 42, downloads: 3, people_logged_in: 5,
    days: [day(3, 0), day(4, 10, 1), day(5, 2), day(6, 0), day(7, 20, 2), day(8, 4), day(9, 6)],
    pages: [{ path: '/', name: 'Home (project search)', views: 30 }, { path: '/reports', name: 'Data reports', views: 8 }],
    projects: [{ path: '/submission/abc', name: 'Solar pumps', views: 4 }],
    sites: [{ name: 'MCCRD', views: 25 }, { name: 'NCCRD', views: 17 }],
};

describe('AdminStats', () => {
    beforeEach(() => getStats.mockReset().mockResolvedValue(STATS));

    it('shows the totals, the busiest day, top pages and projects, and each site', async () => {
        render(<MemoryRouter><AdminStats /></MemoryRouter>);
        expect(await screen.findByText('42')).toBeInTheDocument();
        expect(getStats).toHaveBeenCalledWith(30);
        expect(screen.getByRole('img', { name: /Views per day, 42 in all\. Busiest: Sat, 0?7 Nov: 20 views/ })).toBeInTheDocument();
        expect(screen.getByLabelText('Home (project search): 30 views')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Solar pumps' })).toHaveAttribute('href', '/submission/abc');
        expect(screen.getByLabelText('MCCRD: 25 views')).toBeInTheDocument();
    });

    it('changes the period', async () => {
        render(<MemoryRouter><AdminStats /></MemoryRouter>);
        await screen.findByText('42');
        fireEvent.click(screen.getByRole('tab', { name: 'Last 90 days' }));
        await waitFor(() => expect(getStats).toHaveBeenLastCalledWith(90));
    });

    it('says when nothing has been counted yet', async () => {
        getStats.mockResolvedValue({ ...STATS, views: 0, downloads: 0, days: STATS.days.map((d) => ({ ...d, views: 0, downloads: 0 })), pages: [], projects: [], sites: [] });
        render(<MemoryRouter><AdminStats /></MemoryRouter>);
        expect(await screen.findByText('No views in this period yet.')).toBeInTheDocument();
        expect(screen.getByText('No project views yet.')).toBeInTheDocument();
        expect(screen.queryByText('Views per site')).not.toBeInTheDocument();
    });
});

describe('byWeek', () => {
    it('counts days in sevens back from the last day', () => {
        const days = Array.from({ length: 10 }, (_, i) => ({ day: `d${i}`, views: 1, downloads: i % 2 }));
        expect(byWeek(days)).toEqual([
            { day: 'd0', views: 3, downloads: 1 },
            { day: 'd3', views: 7, downloads: 4 },
        ]);
    });
});
