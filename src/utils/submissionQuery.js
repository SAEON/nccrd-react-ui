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

    // ── Mitigation child-table filters ────────────────────────────────
    if (filters.mitigation_sector) queryParams.mitigation_sector = filters.mitigation_sector;
    if (filters.mitigation_project_type) queryParams.mitigation_project_type = filters.mitigation_project_type;
    if (filters.mitigation_program) queryParams.mitigation_program = filters.mitigation_program;
    if (filters.mitigation_national_policy) queryParams.mitigation_national_policy = filters.mitigation_national_policy;

    // ── Adaptation child-table filters ────────────────────────────────
    if (filters.adaptation_sector) queryParams.adaptation_sector = filters.adaptation_sector;
    if (filters.adaptation_hazard) queryParams.adaptation_hazard = filters.adaptation_hazard;
    if (filters.adaptation_national_policy) queryParams.adaptation_national_policy = filters.adaptation_national_policy;
    return queryParams;
};
