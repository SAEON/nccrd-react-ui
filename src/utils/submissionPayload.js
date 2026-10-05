// ─────────────────────────────────────────────────────────────────────────────
// Payload sanitizer  (Phase 3)
//
// The Pydantic backend rejects empty strings ("") for enum-typed fields,
// treating them as invalid enum values and returning a 422.  We therefore
// convert them to null so the field is simply omitted from the JSON body.
//
// Rules applied:
//   • funding_type      — FundingTypeEnum; "" → null
//   • implementation_status — ImplementationStatusEnum; "" → null
//   • funding_amount    — must be a float or null; ""/0/NaN → null
//   • All other empty-string optional fields are left as-is (the backend
//     accepts "" for plain string columns or ignores them gracefully).
// ─────────────────────────────────────────────────────────────────────────────
export function sanitizePayload(raw) {
    const payload = { ...raw };

    // Enum fields: empty string → null
    const ENUM_FIELDS = ['funding_type', 'implementation_status'];
    ENUM_FIELDS.forEach((field) => {
        if (payload[field] === '') payload[field] = null;
    });

    // Datetime fields:
    //   • Pydantic v1's datetime regex requires a time component (T00:00:00).
    //     <input type="date"> returns "YYYY-MM-DD" (date-only) which Pydantic
    //     rejects → 422.  Append midnight so the string is a valid ISO datetime.
    //   • Empty / falsy values become null (Pydantic rejects "" for datetime).
    const DATE_FIELDS = ['start_date', 'end_date'];
    DATE_FIELDS.forEach((field) => {
        const val = payload[field];
        if (!val) {
            payload[field] = null;
        } else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
            payload[field] = `${val}T00:00:00`;
        }
    });

    // Numeric field: cast to float or null
    const amount = parseFloat(payload.funding_amount);
    payload.funding_amount = Number.isFinite(amount) && amount !== 0 ? amount : null;

    // Ensure geo_location has the canonical GeoJSON structure.
    // If the user hasn't edited it the default is already correct; we just
    // guarantee the "type" discriminator is present.
    if (payload.geo_location && typeof payload.geo_location === 'object') {
        payload.geo_location = {
            country: payload.geo_location.country || undefined,
            province: payload.geo_location.province || undefined,
            district: payload.geo_location.district || undefined,
            local_municipality: payload.geo_location.local_municipality || undefined,
            town_suburb: payload.geo_location.town_suburb || undefined,
            type: 'Point',
            coordinates: payload.geo_location.coordinates || [30.374, -27.936],
        };
        // Remove undefined keys so they are not serialised as "null" in JSON
        Object.keys(payload.geo_location).forEach(
            (k) => payload.geo_location[k] === undefined && delete payload.geo_location[k]
        );
    }

    // Strip nested data objects that belong to the wrong intervention type
    const im = (payload.intervention_measurement || '').toLowerCase();
    if (im === 'mitigation') payload.adaptation_data = null;
    if (im === 'adaptation') payload.mitigation_data = null;

    // Remove extra response-only fields that would cause backend 422s
    // (these come from GET responses but are not accepted by POST/PATCH)
    const RESPONSE_ONLY = ['mitigation', 'adaptation', 'progress_reports', 'deleted',
        'deletedate', 'deletedby', 'createdate', 'createdby',
        'updatedate', 'updatedby', 'submission_status', 'issubmitted',
        'submission_comments', 'submission_status_updated_by', 'reviewed_by',
        '_id'];
    RESPONSE_ONLY.forEach((f) => delete payload[f]);

    return payload;
}

export const DEFAULT_COORDINATES = [30.374, -27.936];

/**
 * Coerce a submission's geo_location into the plain shape the Location form
 * fields expect: string region codes + a [lon, lat] pair.
 *
 * Some legacy (SQL-Server-migrated) rows store province/district as
 * a list of vocabulary-term objects (e.g. `[{ term: "North West" }]`), and
 * stored projects generally hold region *names* (the API converts form codes
 * to names on save). Both are reduced to a plain string here. Coordinates
 * stored as a raw WKT string (`"GEOMETRYCOLLECTION (POINT (24.27 -26.63))"`)
 * don't map onto the form and fall back to the default point.
 */
export function normalizeGeoLocation(geo) {
    // Legacy rows may hold a list of vocabulary terms; keep the first term (a
    // region *name*), which the form then maps to its code once the region
    // lists load (see SubmissionForm).
    const asCode = (v) => {
        if (typeof v === 'string') return v;
        if (Array.isArray(v) && typeof v[0]?.term === 'string') return v[0].term;
        return '';
    };
    return {
        type: 'Point',
        country: asCode(geo?.country) || 'ZAF',
        province: asCode(geo?.province),
        district: asCode(geo?.district),
        local_municipality: asCode(geo?.local_municipality),
        town_suburb: asCode(geo?.town_suburb),
        coordinates: Array.isArray(geo?.coordinates) && geo.coordinates.length === 2
            ? geo.coordinates
            : DEFAULT_COORDINATES,
    };
}
