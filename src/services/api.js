/**
 * NCCRD API client
 *
 * All functions throw on non-OK responses so callers can display
 * meaningful error messages to the user.  The thrown Error has an
 * optional `.detail` property that carries the parsed backend payload
 * (useful for 422 validation-error objects).
 */

import { getToken, clearToken } from './authStorage';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2022';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authorization header for the current session, or {} if not logged in.
 * On a 401 the token is stale — clear it so the next getCurrentUser() call
 * correctly resolves to "logged out" instead of retrying forever.
 */
function _authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function _throwOnErrorWithAuthCheck(res) {
    if (res.status === 401) clearToken();
    await _throwOnError(res);
}

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
 * @param {AbortSignal} [options.signal] - Cancels the request when a newer one supersedes it
 */
export const getSubmissions = async (params = {}, { signal } = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(
        `${API_BASE_URL}/submission/list_submission${query ? '?' + query : ''}`,
        // Public, but sends the login when there is one: `mine=true` needs it.
        { signal, headers: { ..._authHeaders() } }
    );
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
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
    // Sends the login when there is one: unpublished projects are visible to
    // their owner and to reviewers only.
    const res = await fetch(`${API_BASE_URL}/submission/read_submission/${id}`, {
        headers: { ..._authHeaders() },
    });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    return res.json();
};

/**
 * Record a review decision. Backed by POST /submission/{id}/review
 * (needs the validate-submission permission).
 *
 * @param {'Accepted'|'Not accepted'} decision
 * @param {string} [comments] - shown to the submitter; required for 'Not accepted'
 */
export const reviewSubmission = async (id, decision, comments) => {
    const res = await fetch(`${API_BASE_URL}/submission/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ..._authHeaders() },
        body: JSON.stringify({ decision, comments }),
    });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    return res.json();
};

/** Submissions per review state, for the review queue. GET /submission/review/counts. */
export const getPipelineStatus = async () => {
    const res = await fetch(`${API_BASE_URL}/pipeline/status`, { headers: { ..._authHeaders() } });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    return res.json();
};

/** Projects behind one data-quality issue: { data_source, field, issue, limit, offset }. */
export const getPipelineIssueProjects = async (params) => {
    const res = await fetch(`${API_BASE_URL}/pipeline/issues?${new URLSearchParams(params)}`, { headers: { ..._authHeaders() } });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    return res.json();
};

export const getReviewCounts = async () => {
    const res = await fetch(`${API_BASE_URL}/submission/review/counts`, { headers: { ..._authHeaders() } });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
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
        headers: { 'Content-Type': 'application/json', ..._authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
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
            headers: { 'Content-Type': 'application/json', ..._authHeaders() },
            body: JSON.stringify(data),
        }
    );
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
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
        headers: { ..._authHeaders() },
    });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
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
// Auth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exchange email + password for a JWT access token. Backed by POST /auth/login.
 * Returns { access_token, token_type, expires_in, must_change_password }.
 */
export const login = async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

/**
 * Swap the current, still-valid token for a fresh one so an active session
 * never hits the fixed token lifetime. Backed by POST /auth/refresh.
 */
export const refreshToken = async () => {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { ..._authHeaders() },
    });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    return res.json();
};

/**
 * Change the current user's password. Backed by POST /auth/change-password.
 */
export const changePassword = async (currentPassword, newPassword) => {
    const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ..._authHeaders() },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
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
    const res = await fetch(`${API_BASE_URL}/rbac/me`, {
        headers: { ..._authHeaders() },
    });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    return res.json();
};

/**
 * Provision a new user with a one-time temporary password, optionally
 * granting them a role on a tenant in the same call. Requires the
 * `assign-role` permission. Backed by POST /rbac/users.
 * Returns { user, temp_password, role_assignment } — the password is shown
 * once and not retrievable afterwards.
 *
 * @param {string} name
 * @param {string} email
 * @param {{roleId?: number, tenantId?: number}} [roleGrant] - pass both or neither.
 */
export const createUser = async (name, email, roleGrant = {}) => {
    const body = { name, email };
    if (roleGrant.roleId != null && roleGrant.tenantId != null) {
        body.role_id = roleGrant.roleId;
        body.tenant_id = roleGrant.tenantId;
    }
    const res = await fetch(`${API_BASE_URL}/rbac/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ..._authHeaders() },
        body: JSON.stringify(body),
    });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    return res.json();
};

/**
 * List roles. Requires `view-roles`. Backed by GET /rbac/roles.
 */
export const getRoles = async () => {
    const res = await fetch(`${API_BASE_URL}/rbac/roles`, {
        headers: { ..._authHeaders() },
    });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    return res.json();
};

/**
 * List tenants. Requires `view-tenants`. Backed by GET /rbac/tenants.
 */
export const getTenants = async () => {
    const res = await fetch(`${API_BASE_URL}/rbac/tenants`, {
        headers: { ..._authHeaders() },
    });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
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
        { method: 'POST', headers: { ..._authHeaders() }, body: formData }
    );
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
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
        { method: 'POST', headers: { ..._authHeaders() }, body: formData }
    );
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    return res.json();
};

// ─────────────────────────────────────────────────────────────────────────────
// Data reports (public; take the same filters as getSubmissions)
// ─────────────────────────────────────────────────────────────────────────────

const _reportQuery = (params) => {
    const query = new URLSearchParams(params).toString();
    return query ? `?${query}` : '';
};

/** Headline figures and breakdowns. Backed by GET /report/summary. */
export const getReportSummary = async (params = {}, { signal } = {}) => {
    const res = await fetch(`${API_BASE_URL}/report/summary${_reportQuery(params)}`, { signal });
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

/**
 * Map points for the filtered projects: { projects: [{id, title, type, points}],
 * without_location }. Backed by GET /report/locations. Sends the login so the
 * "mine" filter works here too.
 */
export const getReportLocations = async (params = {}, { signal } = {}) => {
    const res = await fetch(`${API_BASE_URL}/report/locations${_reportQuery(params)}`, {
        signal, headers: { ..._authHeaders() },
    });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    return res.json();
};

/** Field completeness overall and per data source. Backed by GET /report/quality. */
export const getReportQuality = async (params = {}, { signal } = {}) => {
    const res = await fetch(`${API_BASE_URL}/report/quality${_reportQuery(params)}`, { signal });
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

/** The offline-submission workbook (public). Backed by GET /submission/upload_template. */
export const UPLOAD_TEMPLATE_URL = `${API_BASE_URL}/submission/upload_template`;

/**
 * URL that downloads the filtered projects (the API sends it as an
 * attachment). Used as a plain link so the browser handles the download.
 *
 * @param {'xlsx'|'csv'} format
 */
export const reportExportUrl = (params = {}, format = 'xlsx') =>
    `${API_BASE_URL}/report/export${_reportQuery({ ...params, format })}`;

/**
 * Download the filtered projects through fetch, so the request carries the
 * login (needed for `mine=true`), then hand the file to the browser.
 *
 * @param {'xlsx'|'csv'} format
 */
export const downloadExport = async (params = {}, format = 'xlsx') => {
    const res = await fetch(reportExportUrl(params, format), { headers: { ..._authHeaders() } });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    const filename = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1]
        || `nccrd-projects.${format}`;
    const url = URL.createObjectURL(await res.blob());
    const link = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────────────────────────────────────
// Self sign-up (POST /auth/register) and its admin review (/rbac/registrations)
// ─────────────────────────────────────────────────────────────────────────────

/** Request an account: { name, email, organisation, password, note }. Returns { detail }. */
export const registerAccount = async (body) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) await _throwOnError(res);
    return res.json();
};

/** Account requests by status ('pending' | 'approved' | 'rejected'); needs assign-role. */
export const getRegistrations = async (status = 'pending') => {
    const res = await fetch(`${API_BASE_URL}/rbac/registrations?status=${status}`, { headers: { ..._authHeaders() } });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    return res.json();
};

/** Approve a request, granting `roleId` on the current tenant. */
export const approveRegistration = async (userId, roleId) => {
    const res = await fetch(`${API_BASE_URL}/rbac/registrations/${userId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ..._authHeaders() },
        body: JSON.stringify({ role_id: roleId }),
    });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    return res.json();
};

export const rejectRegistration = async (userId) => {
    const res = await fetch(`${API_BASE_URL}/rbac/registrations/${userId}/reject`, {
        method: 'POST',
        headers: { ..._authHeaders() },
    });
    if (!res.ok) await _throwOnErrorWithAuthCheck(res);
    return res.json();
};
