import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getReportSummary } from '../services/api';
import Reports from './Reports';

const SUMMARY = {
    total: 3199,
    by_type: [{ label: 'Mitigation', count: 1965 }, { label: 'Adaptation', count: 960 }, { label: 'Cross Cutting', count: 274 }],
    by_province: [{ label: 'Gauteng', count: 855 }, { label: 'National', count: 75 }, { label: 'Not specified', count: 1421 }],
    by_status: [{ label: 'Completed', count: 644 }],
    by_funding_type: [],
    mitigation_sectors: [{ label: 'Energy', count: 10 }],
    adaptation_sectors: [],
    hazards: [{ label: 'Drought', count: 46 }],
    under_way_by_year: { series: ['Mitigation', 'Adaptation', 'Cross Cutting'], rows: [
        { label: 2001, values: { Mitigation: 50, Adaptation: 40, 'Cross Cutting': 3 } },
        { label: 2003, values: { Mitigation: 5, Adaptation: 0, 'Cross Cutting': 0 } },
    ] },
    under_way_unknown: 1994,
    status_by_type: { series: ['Mitigation', 'Adaptation', 'Cross Cutting'], rows: [{ label: 'Completed', values: { Mitigation: 600, Adaptation: 44, 'Cross Cutting': 0 } }] },
    funding_type_by_type: { series: ['Mitigation', 'Adaptation', 'Cross Cutting'], rows: [] },
    budget_ranges: { series: ['Mitigation', 'Adaptation', 'Cross Cutting'], rows: [{ label: 'R1m - R5m', values: { Mitigation: 3, Adaptation: 2, 'Cross Cutting': 0 } }] },
    sector_budget: { mitigation: [{ label: 'Energy', amount: 86000000000, projects: 3 }], adaptation: [] },
    funding: { total_amount: 122850934970, median_amount: 1136004, projects_with_amount: 179 },
};
const QUALITY = {
    total: 3199,
    fields: [{ field: 'province', label: 'Province', filled: 1778, missing: 1421 },
        { field: 'coordinates', label: 'Map location', filled: 1008, missing: 2191 },
        { field: 'start_date', label: 'Start date', filled: 1205, missing: 1994 },
        { field: 'funding_amount', label: 'Budget amount', filled: 179, missing: 3020 },
        { field: 'project_manager_email', label: 'Contact email', filled: 1253, missing: 1946 }],
    by_source: [],
    duplicate_titles: { groups: 294, projects: 659 },
};

vi.mock('../services/api', () => ({
    getFacets: vi.fn().mockResolvedValue({ province: ['Gauteng', 'National'] }),
    getReportSummary: vi.fn(),
    getReportQuality: vi.fn(),
    getReportLocations: vi.fn().mockResolvedValue({ projects: [], without_location: 0 }),
    reportExportUrl: (params, format) => `/report/export?${new URLSearchParams({ ...params, format })}`,
}));
// Leaflet needs a real browser; the map has its own checks in the screenshot run.
vi.mock('../components/ProjectMap', () => ({ default: () => <div data-testid="project-map" /> }));

describe('Reports', () => {
    beforeEach(async () => {
        const api = await import('../services/api');
        api.getReportSummary.mockReset().mockResolvedValue(SUMMARY);
        api.getReportQuality.mockReset().mockResolvedValue(QUALITY);
    });

    it('shows headline figures, breakdowns and data quality', async () => {
        render(<MemoryRouter><Reports /></MemoryRouter>);

        expect(await screen.findByText('3,199')).toBeInTheDocument();
        expect(screen.getByLabelText(/South Africa \(National\): 75 projects/)).toBeInTheDocument();
        expect(screen.getByText('1,994 projects have no start date and are not shown.')).toBeInTheDocument();
        expect(screen.getByLabelText('Completed, Mitigation: 600')).toBeInTheDocument();
        expect(screen.getByText('From the 3 mitigation projects that report an actual budget amount.')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /Download data/ }).length).toBeGreaterThan(5);
        expect(screen.getByText(/294 titles are shared/)).toBeInTheDocument();
    });

    it('reloads with the chosen filters and passes them to the downloads', async () => {
        render(<MemoryRouter><Reports /></MemoryRouter>);
        await screen.findByText('3,199');

        fireEvent.change(await screen.findByLabelText('Province'), { target: { value: 'Gauteng' } });
        await waitFor(() => expect(getReportSummary).toHaveBeenLastCalledWith({ province: 'Gauteng' }, expect.anything()));

        expect(screen.getByRole('link', { name: /Download Excel/ })).toHaveAttribute('href', '/report/export?province=Gauteng&format=xlsx');
        expect(screen.getByRole('link', { name: /Download CSV/ })).toHaveAttribute('href', '/report/export?province=Gauteng&format=csv');
    });
});
