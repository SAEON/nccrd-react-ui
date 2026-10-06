import { describe, it, expect } from 'vitest';
import { buildQueryParams } from './submissionQuery';

const empty = { mine: false, intervention_measurement: [] };

describe('buildQueryParams', () => {
    it('sends only the filters that are set, including budget range and regional policies', () => {
        expect(buildQueryParams({ ...empty, estimated_budget_cost: 'R1m - R5m', mitigation_regional_policy: 'City of Joburg', province: '' }, '  dams '))
            .toEqual({ q: 'dams', estimated_budget_cost: 'R1m - R5m', mitigation_regional_policy: 'City of Joburg' });
        expect(buildQueryParams({ ...empty, mine: true, intervention_measurement: ['Mitigation', 'Adaptation'], adaptation_regional_policy: 'West Rand' }))
            .toEqual({ mine: 'true', intervention_measurement: 'Mitigation,Adaptation', adaptation_regional_policy: 'West Rand' });
    });
});

describe('singleProjectParams', () => {
    it('adds the owner or reviewer scope only for unpublished projects', async () => {
        const { singleProjectParams } = await import('./submissionQuery');
        const published = { id: 'p', issubmitted: true, submission_status: 'Accepted' };
        const pending = { id: 'q', issubmitted: true, submission_status: 'Pending' };
        expect(singleProjectParams(published, { isOwner: true })).toEqual({ submission_id: 'p' });
        expect(singleProjectParams(pending, { isOwner: true })).toEqual({ submission_id: 'q', mine: 'true' });
        expect(singleProjectParams(pending, { isReviewer: true })).toEqual({ submission_id: 'q', review_status: 'all' });
    });
});
