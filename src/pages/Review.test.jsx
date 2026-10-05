import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getSubmissions } from '../services/api';
import Review from './Review';

const auth = { reviewer: true };
vi.mock('../context/CurrentUserContext', () => ({
    useCurrentUser: () => ({ hasPermission: (p) => auth.reviewer && p === 'validate-submission', loading: false }),
}));
vi.mock('../services/api', () => ({
    getSubmissions: vi.fn(),
    getReviewCounts: vi.fn().mockResolvedValue({ awaiting_review: 2, not_accepted: 1, draft: 0, published: 5, all: 8 }),
}));

const sub = (id, title, createdate) => ({ id, title, createdate, issubmitted: true, submission_status: 'Pending', data_source: 'react_app' });

describe('Review', () => {
    beforeEach(() => {
        auth.reviewer = true;
        getSubmissions.mockReset().mockResolvedValue([sub('b', 'Newer', '2026-10-02T10:00:00'), sub('a', 'Older', '2026-09-01T10:00:00')]);
    });

    it('lists the queue oldest first with counts per tab', async () => {
        render(<MemoryRouter><Review /></MemoryRouter>);
        const titles = await screen.findAllByRole('link', { name: /Older|Newer/ });
        expect(titles.map((t) => t.textContent)).toEqual([expect.stringContaining('Older'), expect.stringContaining('Newer')]);
        expect(getSubmissions).toHaveBeenCalledWith({ review_status: 'awaiting_review' }, expect.anything());
        expect(await screen.findByRole('tab', { name: /Awaiting review\s*2/ })).toHaveAttribute('aria-selected', 'true');

        fireEvent.click(screen.getByRole('tab', { name: /Not accepted/ }));
        await waitFor(() => expect(getSubmissions).toHaveBeenLastCalledWith({ review_status: 'not_accepted' }, expect.anything()));
    });

    it('turns away non-reviewers', () => {
        auth.reviewer = false;
        render(<MemoryRouter><Review /></MemoryRouter>);
        expect(screen.getByText('Reviewers only')).toBeInTheDocument();
        expect(getSubmissions).not.toHaveBeenCalled();
    });
});
