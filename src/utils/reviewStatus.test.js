import { describe, it, expect } from 'vitest';
import { reviewState, canEditSubmission } from './reviewStatus';

describe('reviewState', () => {
    it('matches the API review states', () => {
        expect(reviewState({ issubmitted: true, submission_status: 'Accepted' })).toBe('published');
        expect(reviewState({ issubmitted: true, submission_status: 'Pending' })).toBe('awaiting_review');
        expect(reviewState({ issubmitted: true, submission_status: null })).toBe('awaiting_review');
        expect(reviewState({ issubmitted: true, submission_status: 'Not Accepted' })).toBe('not_accepted');
        expect(reviewState({ issubmitted: false, submission_status: 'Pending' })).toBe('draft');
        expect(reviewState({ issubmitted: false, submission_status: 'Accepted' })).toBe('draft');
    });
});

describe('canEditSubmission', () => {
    const none = () => false;
    it('lets owners edit their own and curators edit anyone’s', () => {
        expect(canEditSubmission({ createdby: 7 }, { id: 7 }, none)).toBe(true);
        expect(canEditSubmission({ createdby: 8 }, { id: 7 }, none)).toBe(false);
        expect(canEditSubmission({ createdby: 8 }, { id: 7 }, (p) => p === 'validate-submission')).toBe(true);
        expect(canEditSubmission({ createdby: 8 }, null, none)).toBe(false);
    });
});
