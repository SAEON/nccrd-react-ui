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
    by_start_year: [{ year: 2001, count: 93 }, { year: 2003, count: 5 }],
    start_year_unknown: 1994,
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
    reportExportUrl: (params, format) => `/report/export?${new URLSearchParams({ ...params, format })}`,
}));

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
