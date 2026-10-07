import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getPipelineStatus, getPipelineIssueProjects } from '../services/api';
import DataPipeline from './DataPipeline';

const auth = { curator: true };
vi.mock('../context/CurrentUserContext', () => ({
    useCurrentUser: () => ({ hasPermission: (p) => auth.curator && p === 'validate-submission', loading: false }),
}));
vi.mock('../services/api', () => ({ getPipelineStatus: vi.fn(), getPipelineIssueProjects: vi.fn() }));

const status = {
    available: true,
    loads: [{ source: 'legacy', file_name: 'nccrd_stable.bak', loaded_at: '2026-10-06T09:03:00Z' }],
    sources: [{ data_source: 'sqlserver_legacy', in_source: 2540, excluded: 865, in_app: 1435, public: 1051 }],
    runs: [{ kind: 'gold', ran_at: '2026-10-06T09:05:00Z', summary: { actions: { update: 43, insert: 125 } } }],
    conflicts: [{ id: 'c1', title: 'Solar clinic', reason: 'changed in the app since the last sync', fields: ['title'] }],
    issues: [{ data_source: 'sqlserver_legacy', field: 'geo_location.province', issue: 'no province', projects: 380 }],
};

describe('DataPipeline', () => {
    beforeEach(() => {
        auth.curator = true;
        getPipelineStatus.mockReset().mockResolvedValue(status);
        getPipelineIssueProjects.mockReset().mockResolvedValue({
            total: 380, projects: [{ id: 'p1', title: 'Coastal plan', implementation_organization: 'City', public: true, value: null }],
        });
    });

    it('shows sources, runs, conflicts and issues, and opens a worklist', async () => {
        render(<MemoryRouter><DataPipeline /></MemoryRouter>);
        expect(await screen.findAllByText('Legacy NCCRD')).toHaveLength(2); // sources and issues tables
        expect(screen.getByText('2,540')).toBeInTheDocument();
        expect(screen.getByText(/update 43, insert 125/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Solar clinic' })).toHaveAttribute('href', '/submission/c1');
        expect(screen.getByText('Province')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Show projects' }));
        expect(await screen.findByRole('link', { name: /Coastal plan/ })).toHaveAttribute('href', '/submission/p1');
        expect(getPipelineIssueProjects).toHaveBeenCalledWith(expect.objectContaining({ field: 'geo_location.province', issue: 'no province', offset: 0 }));
        expect(screen.getByRole('button', { name: /Show more \(379 remaining\)/ })).toBeInTheDocument();
    });

    it('says so when the pipeline has never run', async () => {
        getPipelineStatus.mockResolvedValue({ available: false });
        render(<MemoryRouter><DataPipeline /></MemoryRouter>);
        expect(await screen.findByText(/hasn’t been run on this database yet/)).toBeInTheDocument();
    });

    it('turns away non-curators', () => {
        auth.curator = false;
        render(<MemoryRouter><DataPipeline /></MemoryRouter>);
        expect(screen.getByText('Curators only')).toBeInTheDocument();
        expect(getPipelineStatus).not.toHaveBeenCalled();
    });
});
