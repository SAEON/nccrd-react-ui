import { reviewState } from './reviewStatus';

/**
 * Build GET /submission/list_submission (and /report/*) query params from the
 * Home filter state plus the keyword, skipping every empty value so the
 * backend only receives filters the user actually set.
 */
export const buildQueryParams = (filters, keyword = '') => {
    const queryParams = {};

    // Only the logged-in user's own submissions (the API requires the login).
    if (filters.mine) queryParams.mine = 'true';

    // ── Full-text keyword search ─────────────────────────────────────
    if (keyword.trim()) {
        queryParams.q = keyword.trim();
    }

    // ── Intervention type (multi-select → CSV for the backend) ────────
    if (filters.intervention_measurement.length > 0) {
        queryParams.intervention_measurement =
            filters.intervention_measurement.join(',');
    }

    // ── Project-level scalar filters ─────────────────────────────────
    if (filters.province) queryParams.province = filters.province;
    if (filters.implementation_status) queryParams.implementation_status = filters.implementation_status;
    if (filters.funding_type) queryParams.funding_type = filters.funding_type;
    if (filters.estimated_budget_cost) queryParams.estimated_budget_cost = filters.estimated_budget_cost;

    // ── Mitigation child-table filters ────────────────────────────────
    if (filters.mitigation_sector) queryParams.mitigation_sector = filters.mitigation_sector;
    if (filters.mitigation_project_type) queryParams.mitigation_project_type = filters.mitigation_project_type;
    if (filters.mitigation_program) queryParams.mitigation_program = filters.mitigation_program;
    if (filters.mitigation_national_policy) queryParams.mitigation_national_policy = filters.mitigation_national_policy;
    if (filters.mitigation_regional_policy) queryParams.mitigation_regional_policy = filters.mitigation_regional_policy;

    // ── Adaptation child-table filters ────────────────────────────────
    if (filters.adaptation_sector) queryParams.adaptation_sector = filters.adaptation_sector;
    if (filters.adaptation_hazard) queryParams.adaptation_hazard = filters.adaptation_hazard;
    if (filters.adaptation_national_policy) queryParams.adaptation_national_policy = filters.adaptation_national_policy;
    if (filters.adaptation_regional_policy) queryParams.adaptation_regional_policy = filters.adaptation_regional_policy;
    return queryParams;
};

/**
 * Query params to export one project. Published projects are public; an
 * unpublished one needs the owner's ("mine") or a reviewer's scope.
 */
export const singleProjectParams = (submission, { isOwner = false, isReviewer = false } = {}) => {
    const params = { submission_id: submission.id };
    if (reviewState(submission) !== 'published') {
        if (isOwner) params.mine = 'true';
        else if (isReviewer) params.review_status = 'all';
    }
    return params;
};
