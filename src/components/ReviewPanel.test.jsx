import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { reviewSubmission } from '../services/api';
import { ReviewPanel, ReviewStatusNote } from './ReviewPanel';

vi.mock('../services/api', () => ({ reviewSubmission: vi.fn() }));

const pending = { id: 'abc', issubmitted: true, submission_status: 'Pending' };

describe('ReviewPanel', () => {
    beforeEach(() => reviewSubmission.mockReset().mockResolvedValue({}));

    it('requires a reason before not accepting', async () => {
        const onReviewed = vi.fn();
        render(<ReviewPanel submission={pending} onReviewed={onReviewed} />);
        fireEvent.click(screen.getByRole('button', { name: /Not accept/ }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Give a reason');
        expect(reviewSubmission).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText(/Comments for the submitter/), { target: { value: 'Add a budget' } });
        fireEvent.click(screen.getByRole('button', { name: /Not accept/ }));
        await waitFor(() => expect(onReviewed).toHaveBeenCalledWith('Not accepted'));
        expect(reviewSubmission).toHaveBeenCalledWith('abc', 'Not accepted', 'Add a budget');
    });

    it('accepts without comments, and hides Accept on published projects', async () => {
        const onReviewed = vi.fn();
        const { rerender } = render(<ReviewPanel submission={pending} onReviewed={onReviewed} />);
        fireEvent.click(screen.getByRole('button', { name: /Accept and publish/ }));
        await waitFor(() => expect(onReviewed).toHaveBeenCalledWith('Accepted'));

        rerender(<ReviewPanel submission={{ ...pending, submission_status: 'Accepted' }} onReviewed={onReviewed} />);
        expect(screen.queryByRole('button', { name: /Accept and publish/ })).not.toBeInTheDocument();
    });
});

describe('ReviewStatusNote', () => {
    it('shows the reviewer’s reason on a not-accepted project, nothing when published', () => {
        const { rerender, container } = render(
            <ReviewStatusNote submission={{ issubmitted: true, submission_status: 'Not accepted', submission_comments: 'Add a budget', reviewed_by: 'Thandi M' }} />
        );
        expect(screen.getByText('Add a budget')).toBeInTheDocument();
        expect(screen.getByText('Thandi M, reviewer')).toBeInTheDocument();

        rerender(<ReviewStatusNote submission={{ issubmitted: true, submission_status: 'Accepted' }} />);
        expect(container).toBeEmptyDOMElement();
    });
});
