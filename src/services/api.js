/**
 * NCCRD API client
 *
 * All functions throw on non-OK responses so callers can display
 * meaningful error messages to the user.  The thrown Error has an
 * optional `.detail` property that carries the parsed backend payload
 * (useful for 422 validation-error objects).
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2022';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a non-OK response and throw a descriptive Error.
 * Attaches the raw `detail` payload so callers can render structured errors
 * (e.g. the 422 taxonomy-error array from the bulk-upload endpoint).
 */

async function _throwOnError(res) {
    let payload = {};
    try {
        payload = await res.json();
    } catch {
        // Response body is not JSON – use status text as fallback.
    }

    const message =
        typeof payload.detail === 'string'
            ? payload.detail
            : payload.detail?.message || `HTTP ${res.status}: ${res.statusText}`;

    const error = new Error(message);
    error.status = res.status;
    error.detail = payload.detail; // may be a string, object, or array
    throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// READ endpoints (public)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List all submissions, optionally filtered.
 *
 * Throws on network or API error so the caller (Home.jsx) can set
 * its error state and show a user-facing message.
 *
 * @param {object} params - Query parameters (q, intervention_measurement, …)
 */
export const getSubmissions = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(
        `${API_BASE_URL}/submission/list_submission${query ? '?' + query : ''}`
    );
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

/**
 * Return distinct facet values for building dynamic filter menus.
 */
export const getFacets = async () => {
    const res = await fetch(`${API_BASE_URL}/submission/facets/submission`);
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

/**
 * Fetch a single submission by its UUID (includes nested mitigation/adaptation).
 *
 * @param {string} id - UUID of the submission
 */
export const getSubmissionById = async (id) => {
    const res = await fetch(`${API_BASE_URL}/submission/read_submission/${id}`);
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

// ─────────────────────────────────────────────────────────────────────────────
// WRITE endpoints (require PROJECT_ADMIN scope)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new submission.
 *
 * @param {object} data - SubmissionCreate payload
 */
export const createSubmission = async (data) => {
    const res = await fetch(`${API_BASE_URL}/submission/new_submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

/**
 * Partially update an existing submission (PATCH semantics).
 *
 * @param {string} id   - UUID of the submission to update
 * @param {object} data - SubmissionUpdate payload (only changed fields)
 */
export const updateSubmission = async (id, data) => {
    const res = await fetch(
        `${API_BASE_URL}/submission/update_new_submission/${id}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }
    );
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

/**
 * Soft-delete a submission (sets deleted=true on the server).
 *
 * @param {string} id - UUID of the submission to delete
 */
export const deleteSubmission = async (id) => {
    const res = await fetch(`${API_BASE_URL}/submission/delete/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

// ─────────────────────────────────────────────────────────────────────────────
// Region lookups (for the submission form's Location fields)
//
// Districts/local-districts are keyed by the parent's `code` (not `name`) —
// e.g. GET /districts/by_province/GT, not /districts/by_province/Gauteng.
// ─────────────────────────────────────────────────────────────────────────────

export const getProvinces = async () => {
    const res = await fetch(`${API_BASE_URL}/region/names/provinces`);
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

export const getDistrictsByProvince = async (provinceCode) => {
    const res = await fetch(`${API_BASE_URL}/region/names/districts/by_province/${encodeURIComponent(provinceCode)}`);
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

export const getLocalDistrictsByDistrict = async (districtCode) => {
    const res = await fetch(`${API_BASE_URL}/region/names/local_districts/by_district/${encodeURIComponent(districtCode)}`);
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

// ─────────────────────────────────────────────────────────────────────────────
// Vocabulary lookups (controlled taxonomy for sector/hazard/policy/etc.)
//
// Unlike region lookups, there's no separate code to key on — `term` is
// both the display label and the value stored on the submission record
// (Mitigation.sector etc. are plain text columns holding the term itself).
// ─────────────────────────────────────────────────────────────────────────────

export const getVocabulary = async (treeName) => {
    const res = await fetch(`${API_BASE_URL}/vocabulary/${encodeURIComponent(treeName)}`);
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

// ─────────────────────────────────────────────────────────────────────────────
// RBAC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the caller's identity, current tenant, and roles/permissions
 * on that tenant. Backed by GET /rbac/me.
 */
export const getCurrentUser = async () => {
    const res = await fetch(`${API_BASE_URL}/rbac/me`);
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

// ─────────────────────────────────────────────────────────────────────────────
// Bulk upload (Phase 4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload an Excel workbook for bulk submission creation.
 *
 * The backend validates every row against the Vocabulary table before
 * persisting anything.  A 422 response means validation failed; the
 * thrown Error's `.detail` property will be an object:
 *   {
 *     message: string,
 *     errors: [{ row, column, value, message }, …]
 *   }
 *
 * DO NOT set a Content-Type header — the browser must set it automatically
 * so it includes the multipart boundary string.
 *
 * @param {File} file - The .xlsx file selected by the user
 */
export const uploadBulkSubmissions = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(
        `${API_BASE_URL}/submission/create_submission_upload-xlsx/`,
        { method: 'POST', body: formData }
    );
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

// ─────────────────────────────────────────────────────────────────────────────
// Progress reports (MRV documents attached to a submission)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attach a progress / MRV document to an existing submission. The submission
 * must already exist (progress reports are children of it), so this can only
 * be called with a real submission id — not while a "new" submission is
 * still unsaved.
 *
 * @param {string} submissionId - UUID of the submission to attach to
 * @param {File}   file         - The file selected by the user
 * @param {string} [notes]      - Optional free-text note for this document
 */
export const uploadProgressReport = async (submissionId, file, notes) => {
    const formData = new FormData();
    formData.append('file', file);
    if (notes) formData.append('notes', notes);

    const res = await fetch(
        `${API_BASE_URL}/submission/${submissionId}/progress_reports`,
        { method: 'POST', body: formData }
    );
    if (!res.ok) await _throwOnError(res);
    return res.json();
};
