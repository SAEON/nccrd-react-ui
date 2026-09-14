import { useState, useEffect, useRef, useId, Children, cloneElement, isValidElement } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    getSubmissionById, createSubmission, updateSubmission,
    getProvinces, getDistrictsByProvince, getLocalDistrictsByDistrict,
    getVocabulary, uploadProgressReport, API_BASE_URL,
} from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import { ArrowLeft, Save, Activity, AlertTriangle, FileDown, Paperclip, X } from 'lucide-react';

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
function sanitizePayload(raw) {
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
        '_id'];
    RESPONSE_ONLY.forEach((f) => delete payload[f]);

    return payload;
}

const DEFAULT_COORDINATES = [30.374, -27.936];

/**
 * Coerce a submission's geo_location into the plain shape the Location form
 * fields expect: string region codes + a [lon, lat] pair.
 *
 * Some legacy (SQL-Server-migrated) rows store province/district as
 * vocabulary-term objects (e.g. `{ term: "North West" }`) instead of a
 * region code, and coordinates as a raw WKT string
 * (`"GEOMETRYCOLLECTION (POINT (24.27 -26.63))"`) instead of an array —
 * neither maps onto the region-code dropdowns, so they're dropped rather
 * than fed in as garbage. The user can re-pick the correct value from the
 * dropdown while editing.
 */
function normalizeGeoLocation(geo) {
    const asCode = (v) => (typeof v === 'string' ? v : '');
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

// ─────────────────────────────────────────────────────────────────────────────
// Reusable form-field components to reduce repetition
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Wraps a single form control with a <label htmlFor>. The wrapped control
 * must accept and forward an `id` prop (native elements do so automatically;
 * TextInput/NestedField/RegionSelect/VocabularySelect are written to forward
 * it below). Falls back to a label-derived id when the control has no `name`
 * (e.g. VocabularySelect), since `name` alone isn't always present/unique.
 */
const Field = ({ label, required, children }) => {
    const autoId = useId();
    const child = Children.only(children);
    const id = (isValidElement(child) && child.props.name) || autoId;
    return (
        <div>
            <label className="input-label" htmlFor={id}>{label}{required && ' *'}</label>
            {isValidElement(child) ? cloneElement(child, { id }) : child}
        </div>
    );
};

const TextInput = ({ id, name, value, onChange, placeholder, type = 'text', required }) => (
    <input
        id={id}
        type={type}
        name={name}
        className="input-field"
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
    />
);

/** Text input or textarea bound to a nested object (mitigation_data / adaptation_data). */
const NestedField = ({ id, section, name, value, onChange, textarea, rows = 3, required }) => {
    const shared = {
        id,
        name,
        className: 'input-field',
        value: value ?? '',
        onChange: (e) => onChange(e, section),
        required,
    };
    return textarea ? <textarea rows={rows} {...shared} /> : <input type="text" {...shared} />;
};

/** Native <select> populated from a { code, name }[] region lookup list. */
const RegionSelect = ({ id, value, onChange, options, placeholder, disabled, required }) => (
    <select
        id={id}
        className="input-field"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
    >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
            <option key={opt.code} value={opt.code}>{opt.name}</option>
        ))}
    </select>
);

/**
 * Native <select> populated from a { term }[] vocabulary lookup list.
 * `term` is both the option label and the value — Mitigation/Adaptation
 * taxonomy columns store the term text itself, not a separate code.
 * A stored value that doesn't match any current term (legacy free text)
 * simply renders unselected rather than crashing.
 */
const VocabularySelect = ({ id, value, onChange, options, placeholder = '-- Select --', required }) => (
    <select
        id={id}
        className="input-field"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
    >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
            <option key={opt.id} value={opt.term}>{opt.term}</option>
        ))}
    </select>
);

// ─────────────────────────────────────────────────────────────────────────────
// Section divider
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeading = ({ title }) => (
    <div className="col-span-2" style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: 0 }}>{title}</h3>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const SubmissionForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;
    const requiredPermission = isEdit ? 'update-submission' : 'create-submission';
    const { hasPermission, loading: authLoading } = useCurrentUser();

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // ── Progress reports (MRV) — staged locally, uploaded after the
    // submission itself is saved (they're children of it via submission_id,
    // so there's nothing to attach to until a real id exists). ────────────
    const [pendingReports, setPendingReports] = useState([]); // [{ file, notes }]
    const [reportFile, setReportFile] = useState(null);
    const [reportNotes, setReportNotes] = useState('');
    const reportFileInputRef = useRef(null);

    const addPendingReport = () => {
        if (!reportFile) return;
        setPendingReports((prev) => [...prev, { file: reportFile, notes: reportNotes }]);
        setReportFile(null);
        setReportNotes('');
        if (reportFileInputRef.current) reportFileInputRef.current.value = '';
    };

    const removePendingReport = (index) => {
        setPendingReports((prev) => prev.filter((_, i) => i !== index));
    };

    const [formData, setFormData] = useState({
        title: '',
        intervention_measurement: 'Adaptation',
        description: '',
        implementation_status: 'Under Implementation',
        implementation_organization: '',
        implementation_partners_other: '',
        start_date: '',
        end_date: '',
        link: '',
        funding_organization: '',
        funding_type: '',           // "" → null via sanitizePayload
        funding_amount: '',         // "" → null via sanitizePayload
        estimated_budget_cost: '',
        project_manager_name: '',
        project_manager_organization: '',
        project_manager_email: '',
        project_manager_contact_number: '',
        research: '',
        platform: '',
        mitigation_data: null,
        adaptation_data: null,
        geo_location: normalizeGeoLocation(),
    });

    // ── Location: cascading Province → District → Local Municipality ────────
    // Region lookups are keyed by the parent's `code`, not its display `name`
    // (see nccrd/api/routers/region.py) — e.g. /districts/by_province/GT.
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [localDistricts, setLocalDistricts] = useState([]);

    useEffect(() => {
        getProvinces().then(setProvinces).catch((err) => console.warn('[NCCRD] Could not load provinces.', err));
    }, []);

    const provinceCode = formData.geo_location?.province;
    const districtCode = formData.geo_location?.district;

    useEffect(() => {
        if (!provinceCode) { setDistricts([]); return; }
        getDistrictsByProvince(provinceCode)
            .then(setDistricts)
            .catch((err) => console.warn('[NCCRD] Could not load districts.', err));
    }, [provinceCode]);

    useEffect(() => {
        if (!districtCode) { setLocalDistricts([]); return; }
        getLocalDistrictsByDistrict(districtCode)
            .then(setLocalDistricts)
            .catch((err) => console.warn('[NCCRD] Could not load local municipalities.', err));
    }, [districtCode]);

    // ── Controlled vocabulary (sector / hazard / policy / co-benefit / CDM) ──
    // Fetched once on mount; each tree degrades independently to an empty
    // list (VocabularySelect just shows the placeholder) if its request fails.
    const VOCAB_TREES = [
        'budgetRanges', 'mitigationSectors', 'mitigationType', 'mitigationProgramme',
        'mitigationPolicies', 'coBenefits', 'cdmMethodology', 'executiveStatus',
        'carbonCreditStandards', 'adaptationSectors', 'adaptationPolicies', 'hazards',
    ];
    const [vocab, setVocab] = useState({});

    useEffect(() => {
        VOCAB_TREES.forEach((treeName) => {
            getVocabulary(treeName)
                .then((terms) => setVocab((prev) => ({ ...prev, [treeName]: terms })))
                .catch((err) => console.warn(`[NCCRD] Could not load vocabulary '${treeName}'.`, err));
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Update one geo_location field. Changing province/district invalidates
     * whatever was selected below it, so those are cleared here rather than
     * left pointing at a code that belongs to a different parent.
     */
    const handleGeoChange = (field, value) => {
        setFormData((prev) => {
            const geo = { ...(prev.geo_location || {}), [field]: value };
            if (field === 'province') {
                geo.district = '';
                geo.local_municipality = '';
            } else if (field === 'district') {
                geo.local_municipality = '';
            }
            return { ...prev, geo_location: geo };
        });
    };

    // ── Load existing project when editing ──────────────────────────────────
    useEffect(() => { if (isEdit) loadProject(); }, [id]);

    const loadProject = async () => {
        try {
            const data = await getSubmissionById(id);
            if (data) {
                // Normalise date fields for <input type="date">
                if (data.start_date) data.start_date = new Date(data.start_date).toISOString().split('T')[0];
                if (data.end_date) data.end_date = new Date(data.end_date).toISOString().split('T')[0];

                setFormData({
                    ...data,
                    // The API returns nested records as "mitigation"/"adaptation";
                    // the form submit expects them as "mitigation_data"/"adaptation_data".
                    mitigation_data: data.mitigation || null,
                    adaptation_data: data.adaptation || null,
                    // Preserve empty string for funding_type so the select shows "-- Select --"
                    funding_type: data.funding_type || '',
                    funding_amount: data.funding_amount ?? '',
                    geo_location: normalizeGeoLocation(data.geo_location),
                });
            }
        } catch (err) {
            setError('Failed to load project for editing.');
        } finally {
            setLoading(false);
        }
    };

    // ── Field change handlers ───────────────────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleNestedChange = (e, section) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [section]: { ...(prev[section] || {}), [name]: value },
        }));
    };

    /** VocabularySelect reports a plain value, not an event — bridge to handleNestedChange. */
    const handleNestedVocabChange = (name, section) => (value) =>
        handleNestedChange({ target: { name, value } }, section);

    // ── Submit ──────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const payload = sanitizePayload(formData);
            let submissionId = id;
            if (isEdit) {
                await updateSubmission(id, payload);
            } else {
                const created = await createSubmission(payload);
                submissionId = created.submission_id;
            }

            if (pendingReports.length > 0) {
                const results = await Promise.allSettled(
                    pendingReports.map((r) => uploadProgressReport(submissionId, r.file, r.notes))
                );
                const failures = results.filter((r) => r.status === 'rejected');
                if (failures.length > 0) {
                    setError(
                        `Submission saved, but ${failures.length} of ${pendingReports.length} file(s) failed to upload. `
                        + 'You can retry the upload from the Edit page.'
                    );
                    return;
                }
            }

            navigate('/');
        } catch (err) {
            // Surface the backend's message directly — it's more useful than a generic string
            setError(err.message || 'Failed to save submission. Please check all required fields.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    // ── Loading spinner ─────────────────────────────────────────────────────
    if (loading || authLoading) return (
        <div className="container text-center" style={{ paddingTop: '5rem' }}>
            <Activity size={48} color="var(--accent-primary)" className="mx-auto block" style={{ animation: 'pulse 2s infinite' }} />
            <p className="mt-4" style={{ color: 'var(--text-muted)' }}>Loading project details…</p>
        </div>
    );

    // ── Permission guard ─────────────────────────────────────────────────────
    // Backend already enforces this (403) — this just avoids a confusing
    // dead-end submit for a user whose entry point was reachable directly
    // (e.g. pasted URL) rather than via a hidden button.
    if (!hasPermission(requiredPermission)) return (
        <div className="container" style={{ paddingTop: '2rem' }}>
            <Link to="/" className="btn btn-outline mb-6" style={{ display: 'inline-flex', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' }}>
                <ArrowLeft size={16} /> Back to Projects
            </Link>
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid #ef4444' }}>
                <h3 style={{ color: '#b91c1c' }}>Access Denied</h3>
                <p>You don't have permission to {isEdit ? 'edit' : 'create'} submissions.</p>
            </div>
        </div>
    );

    const im = formData.intervention_measurement;
    const showMitigation = im === 'Mitigation' || im === 'Cross Cutting';
    const showAdaptation = im === 'Adaptation' || im === 'Cross Cutting';

    // ──────────────────────────────────────────────────────────────────────────
    return (
        <div className="container" style={{ paddingBottom: '6rem' /* room for sticky bar */ }}>

            {/* Top back-link */}
            <Link
                to={isEdit ? `/submission/${id}` : '/'}
                className="btn btn-outline mb-6"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', marginTop: '2rem' }}
            >
                <ArrowLeft size={15} /> Back
            </Link>

            <div className="glass-panel animate-fade-in" style={{ padding: '2rem 2.5rem' }}>
                <h1 style={{ marginBottom: '1.5rem' }}>{isEdit ? 'Edit Project' : 'Add New Project'}</h1>

                {/* Error banner */}
                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)',
                        borderLeft: '4px solid #f87171',
                        background: 'rgba(239,68,68,0.07)',
                        marginBottom: '1.5rem',
                    }}>
                        <AlertTriangle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                        <span style={{ color: '#fca5a5', fontSize: '0.9rem' }}>{error}</span>
                    </div>
                )}

                {/*
                  * The <form> has an id so the sticky footer button can target it
                  * with the HTML `form` attribute — even though the button lives
                  * outside the <form> element in the DOM.
                  */}
                <form id="submission-form" onSubmit={handleSubmit}>

                    {/* ── General Details ────────────────────────────────── */}
                    <div className="grid grid-cols-2 gap-6">

                        <div className="col-span-2">
                            <Field label="Project Title" required>
                                <TextInput name="title" value={formData.title} onChange={handleChange} required />
                            </Field>
                        </div>

                        <div className="col-span-2">
                            <Field label="Description">
                                <textarea
                                    name="description"
                                    className="input-field"
                                    rows="4"
                                    value={formData.description || ''}
                                    onChange={handleChange}
                                />
                            </Field>
                        </div>

                        <Field label="Intervention Type" required>
                            <select
                                name="intervention_measurement"
                                className="input-field"
                                value={formData.intervention_measurement}
                                onChange={handleChange}
                                required
                            >
                                <option value="Mitigation">Mitigation</option>
                                <option value="Adaptation">Adaptation</option>
                                <option value="Cross Cutting">Cross Cutting</option>
                            </select>
                        </Field>

                        <Field label="Implementation Status">
                            <select
                                name="implementation_status"
                                className="input-field"
                                value={formData.implementation_status || ''}
                                onChange={handleChange}
                            >
                                <option value="Planned">Planned</option>
                                <option value="Under Implementation">Under Implementation</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                                <option value="On Hold">On Hold</option>
                            </select>
                        </Field>

                        <Field label="Start Date">
                            <TextInput type="date" name="start_date" value={formData.start_date} onChange={handleChange} />
                        </Field>

                        <Field label="End Date">
                            <TextInput type="date" name="end_date" value={formData.end_date} onChange={handleChange} />
                        </Field>

                        <div className="col-span-2">
                            <Field label="Link to Project Website">
                                <TextInput type="url" name="link" value={formData.link} onChange={handleChange} placeholder="https://…" />
                            </Field>
                        </div>

                        {/* ── Location ───────────────────────────────────── */}
                        <SectionHeading title="Location" />

                        <Field label="Province" required>
                            <RegionSelect
                                value={provinceCode}
                                onChange={(v) => handleGeoChange('province', v)}
                                options={provinces}
                                placeholder="-- Select Province --"
                                required
                            />
                        </Field>

                        <Field label="District Municipality">
                            <RegionSelect
                                value={districtCode}
                                onChange={(v) => handleGeoChange('district', v)}
                                options={districts}
                                placeholder={provinceCode ? '-- Select District --' : '-- Select a province first --'}
                                disabled={!provinceCode}
                            />
                        </Field>

                        <Field label="Local Municipality">
                            <RegionSelect
                                value={formData.geo_location?.local_municipality}
                                onChange={(v) => handleGeoChange('local_municipality', v)}
                                options={localDistricts}
                                placeholder={districtCode ? '-- Select Local Municipality --' : '-- Select a district first --'}
                                disabled={!districtCode}
                            />
                        </Field>

                        <Field label="Town / Suburb">
                            <TextInput
                                name="town_suburb"
                                value={formData.geo_location?.town_suburb}
                                onChange={(e) => handleGeoChange('town_suburb', e.target.value)}
                            />
                        </Field>

                        <Field label="Longitude">
                            <input
                                type="number" className="input-field" step="0.0001"
                                value={formData.geo_location?.coordinates?.[0] ?? ''}
                                onChange={(e) => {
                                    const lon = parseFloat(e.target.value);
                                    const lat = formData.geo_location?.coordinates?.[1] ?? -27.936;
                                    handleGeoChange('coordinates', [Number.isFinite(lon) ? lon : 0, lat]);
                                }}
                            />
                        </Field>

                        <Field label="Latitude">
                            <input
                                type="number" className="input-field" step="0.0001"
                                value={formData.geo_location?.coordinates?.[1] ?? ''}
                                onChange={(e) => {
                                    const lat = parseFloat(e.target.value);
                                    const lon = formData.geo_location?.coordinates?.[0] ?? 30.374;
                                    handleGeoChange('coordinates', [lon, Number.isFinite(lat) ? lat : 0]);
                                }}
                            />
                        </Field>

                        {/* ── Management & Funding ──────────────────────── */}
                        <SectionHeading title="Management &amp; Funding" />

                        <Field label="Implementation Organization" required>
                            <TextInput name="implementation_organization" value={formData.implementation_organization} onChange={handleChange} required />
                        </Field>

                        <Field label="Other Implementation Partners">
                            <TextInput name="implementation_partners_other" value={formData.implementation_partners_other} onChange={handleChange} />
                        </Field>

                        <Field label="Funding Organization">
                            <TextInput name="funding_organization" value={formData.funding_organization} onChange={handleChange} />
                        </Field>

                        <Field label="Funding Type">
                            {/* "" is the "not selected" sentinel; sanitizePayload converts it to null */}
                            <select
                                name="funding_type"
                                className="input-field"
                                value={formData.funding_type || ''}
                                onChange={handleChange}
                            >
                                <option value="">-- Select --</option>
                                <option value="Grant">Grant</option>
                                <option value="Loan">Loan</option>
                                <option value="Own Funding">Own Funding</option>
                                <option value="Public-Private Partnership">Public-Private Partnership</option>
                                <option value="None">None</option>
                                <option value="Other">Other</option>
                            </select>
                        </Field>

                        <Field label="Actual Budget (ZAR)">
                            {/* Kept as text so the user can clear it; sanitizePayload handles the cast */}
                            <input
                                type="number"
                                name="funding_amount"
                                className="input-field"
                                value={formData.funding_amount ?? ''}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                            />
                        </Field>

                        <Field label="Estimated Budget Range">
                            <VocabularySelect
                                value={formData.estimated_budget_cost}
                                onChange={(v) => setFormData((prev) => ({ ...prev, estimated_budget_cost: v }))}
                                options={vocab.budgetRanges || []}
                            />
                        </Field>

                        {/* ── Project Manager ───────────────────────────── */}
                        <SectionHeading title="Project Manager" />

                        <Field label="Name" required>
                            <TextInput name="project_manager_name" value={formData.project_manager_name} onChange={handleChange} required />
                        </Field>

                        <Field label="Organization">
                            <TextInput name="project_manager_organization" value={formData.project_manager_organization} onChange={handleChange} />
                        </Field>

                        <Field label="Email" required>
                            <TextInput type="email" name="project_manager_email" value={formData.project_manager_email} onChange={handleChange} required />
                        </Field>

                        <Field label="Contact Number">
                            <TextInput name="project_manager_contact_number" value={formData.project_manager_contact_number} onChange={handleChange} placeholder="e.g. 082 123 4567" />
                        </Field>

                        {/* ── Additional Information ────────────────────── */}
                        <SectionHeading title="Additional Information" />

                        <Field label="Research">
                            <TextInput name="research" value={formData.research} onChange={handleChange} />
                        </Field>

                        <Field label="Platform">
                            <TextInput name="platform" value={formData.platform} onChange={handleChange} />
                        </Field>
                    </div>

                    {/* ── Progress Reports (MRV) ─────────────────────────────── */}
                    <div className="mt-8 glass-panel animate-fade-in" style={{ padding: '1.5rem' }}>
                        <h3 className="mb-5 flex items-center gap-2">
                            <Paperclip size={18} /> Progress Reports (MRV)
                        </h3>

                        {isEdit && formData.progress_reports && formData.progress_reports.length > 0 && (
                            <div className="mb-4">
                                <div className="input-label mb-2">Already uploaded</div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {formData.progress_reports.map((report) => (
                                        <li key={report.id} className="flex items-center gap-2 mb-2">
                                            <FileDown size={15} />
                                            <a
                                                href={`${API_BASE_URL}${report.file_url}`}
                                                target="_blank" rel="noreferrer"
                                                style={{ color: 'var(--accent-primary)' }}
                                            >
                                                {report.file_name}
                                            </a>
                                            {report.notes && (
                                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>— {report.notes}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {pendingReports.length > 0 && (
                            <div className="mb-4">
                                <div className="input-label mb-2">To be uploaded on save</div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {pendingReports.map((r, i) => (
                                        <li key={i} className="flex items-center gap-2 mb-2">
                                            <Paperclip size={15} />
                                            <span>{r.file.name}</span>
                                            {r.notes && (
                                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>— {r.notes}</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removePendingReport(i)}
                                                aria-label={`Remove ${r.file.name}`}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'inline-flex' }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-6">
                            <Field label="File">
                                <input
                                    ref={reportFileInputRef}
                                    type="file"
                                    className="input-field"
                                    onChange={(e) => setReportFile(e.target.files[0] || null)}
                                />
                            </Field>
                            <Field label="Notes (optional)">
                                <TextInput
                                    value={reportNotes}
                                    onChange={(e) => setReportNotes(e.target.value)}
                                    placeholder="e.g. Q1 2024 monitoring report"
                                />
                            </Field>
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline mt-4"
                            onClick={addPendingReport}
                            disabled={!reportFile}
                        >
                            Add File
                        </button>
                    </div>

                    {/* ── Mitigation Details ─────────────────────────────────── */}
                    {showMitigation && (
                        <div className="mt-8 glass-panel animate-fade-in" style={{ padding: '1.5rem', border: '1px solid rgba(251,191,36,0.2)' }}>
                            <h3 className="mb-5" style={{ color: '#fbbf24' }}>Mitigation Details</h3>
                            <div className="grid grid-cols-2 gap-6">

                                <Field label="Mitigation Sector" required>
                                    <VocabularySelect required
                                        value={formData.mitigation_data?.sector}
                                        onChange={handleNestedVocabChange('sector', 'mitigation_data')}
                                        options={vocab.mitigationSectors || []}
                                    />
                                </Field>

                                <Field label="Subsector">
                                    <NestedField section="mitigation_data" name="subsector"
                                        value={formData.mitigation_data?.subsector} onChange={handleNestedChange} />
                                </Field>

                                <Field label="Secondary">
                                    <NestedField section="mitigation_data" name="secondary"
                                        value={formData.mitigation_data?.secondary} onChange={handleNestedChange} />
                                </Field>

                                <Field label="Project Type">
                                    <VocabularySelect
                                        value={formData.mitigation_data?.project_type}
                                        onChange={handleNestedVocabChange('project_type', 'mitigation_data')}
                                        options={vocab.mitigationType || []}
                                    />
                                </Field>

                                <Field label="Project Subtype">
                                    <NestedField section="mitigation_data" name="project_subtype"
                                        value={formData.mitigation_data?.project_subtype} onChange={handleNestedChange} />
                                </Field>

                                <Field label="Mitigation Programme">
                                    <VocabularySelect
                                        value={formData.mitigation_data?.mitigation_program}
                                        onChange={handleNestedVocabChange('mitigation_program', 'mitigation_data')}
                                        options={vocab.mitigationProgramme || []}
                                    />
                                </Field>

                                <Field label="National Policy">
                                    <VocabularySelect
                                        value={formData.mitigation_data?.national_policy}
                                        onChange={handleNestedVocabChange('national_policy', 'mitigation_data')}
                                        options={vocab.mitigationPolicies || []}
                                    />
                                </Field>

                                <Field label="Provincial / Municipal Policy">
                                    <NestedField section="mitigation_data" name="provincial_municipal"
                                        value={formData.mitigation_data?.provincial_municipal} onChange={handleNestedChange} />
                                </Field>

                                <div className="col-span-2">
                                    <Field label="Primary Intended Outcome">
                                        <NestedField section="mitigation_data" name="primary_intended_outcome"
                                            value={formData.mitigation_data?.primary_intended_outcome} onChange={handleNestedChange} />
                                    </Field>
                                </div>

                                <div className="col-span-2">
                                    <Field label="Progress Calculator">
                                        <NestedField section="mitigation_data" name="progress_calculator" textarea rows={2}
                                            value={formData.mitigation_data?.progress_calculator} onChange={handleNestedChange} />
                                    </Field>
                                </div>

                                {/* ── Co-Benefits ──────────────────────────────── */}
                                <SectionHeading title="Co-Benefits" />

                                <Field label="Environmental Co-benefit">
                                    <VocabularySelect
                                        value={formData.mitigation_data?.environmental_co_benefit}
                                        onChange={handleNestedVocabChange('environmental_co_benefit', 'mitigation_data')}
                                        options={vocab.coBenefits || []}
                                    />
                                </Field>
                                <Field label="Environmental Co-benefit Description">
                                    <NestedField section="mitigation_data" name="environmental_co_benefit_description"
                                        value={formData.mitigation_data?.environmental_co_benefit_description} onChange={handleNestedChange} />
                                </Field>

                                <Field label="Social Co-benefit">
                                    <VocabularySelect
                                        value={formData.mitigation_data?.social_co_benefit}
                                        onChange={handleNestedVocabChange('social_co_benefit', 'mitigation_data')}
                                        options={vocab.coBenefits || []}
                                    />
                                </Field>
                                <Field label="Social Co-benefit Description">
                                    <NestedField section="mitigation_data" name="social_co_benefit_description"
                                        value={formData.mitigation_data?.social_co_benefit_description} onChange={handleNestedChange} />
                                </Field>

                                <Field label="Economic Co-benefit">
                                    <VocabularySelect
                                        value={formData.mitigation_data?.economic_co_benefit}
                                        onChange={handleNestedVocabChange('economic_co_benefit', 'mitigation_data')}
                                        options={vocab.coBenefits || []}
                                    />
                                </Field>
                                <Field label="Economic Co-benefit Description">
                                    <NestedField section="mitigation_data" name="economic_co_benefit_description"
                                        value={formData.mitigation_data?.economic_co_benefit_description} onChange={handleNestedChange} />
                                </Field>

                                {/* ── Carbon Credit / CDM ──────────────────────── */}
                                <SectionHeading title="Carbon Credit / CDM" />

                                <Field label="Carbon Credit">
                                    <VocabularySelect
                                        value={formData.mitigation_data?.carbon_credit}
                                        onChange={handleNestedVocabChange('carbon_credit', 'mitigation_data')}
                                        options={vocab.carbonCreditStandards || []}
                                    />
                                </Field>
                                <Field label="CDM / Voluntary">
                                    <NestedField section="mitigation_data" name="cdm_voluntary"
                                        value={formData.mitigation_data?.cdm_voluntary} onChange={handleNestedChange} />
                                </Field>

                                <Field label="CDM Executive Board Status">
                                    <VocabularySelect
                                        value={formData.mitigation_data?.cdm_executive_board_status}
                                        onChange={handleNestedVocabChange('cdm_executive_board_status', 'mitigation_data')}
                                        options={vocab.executiveStatus || []}
                                    />
                                </Field>
                                <Field label="CDM Methodology">
                                    <VocabularySelect
                                        value={formData.mitigation_data?.cdm_methodology}
                                        onChange={handleNestedVocabChange('cdm_methodology', 'mitigation_data')}
                                        options={vocab.cdmMethodology || []}
                                    />
                                </Field>

                                <Field label="Organization Issuing Credits">
                                    <NestedField section="mitigation_data" name="organization_issuing_credits"
                                        value={formData.mitigation_data?.organization_issuing_credits} onChange={handleNestedChange} />
                                </Field>
                                <Field label="Voluntary Methodology">
                                    <NestedField section="mitigation_data" name="voluntary_methodology"
                                        value={formData.mitigation_data?.voluntary_methodology} onChange={handleNestedChange} />
                                </Field>

                                <Field label="CDM Project Number">
                                    <NestedField section="mitigation_data" name="cdm_project_number"
                                        value={formData.mitigation_data?.cdm_project_number} onChange={handleNestedChange} />
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* ── Adaptation Details ─────────────────────────────────── */}
                    {showAdaptation && (
                        <div className="mt-8 glass-panel animate-fade-in" style={{ padding: '1.5rem', border: '1px solid rgba(52,211,153,0.2)' }}>
                            <h3 className="mb-5" style={{ color: '#34d399' }}>Adaptation Details</h3>
                            <div className="grid grid-cols-2 gap-6">

                                <Field label="Adaptation Sector" required>
                                    <VocabularySelect required
                                        value={formData.adaptation_data?.sector}
                                        onChange={handleNestedVocabChange('sector', 'adaptation_data')}
                                        options={vocab.adaptationSectors || []}
                                    />
                                </Field>

                                <Field label="Hazard">
                                    <VocabularySelect
                                        value={formData.adaptation_data?.hazard}
                                        onChange={handleNestedVocabChange('hazard', 'adaptation_data')}
                                        options={vocab.hazards || []}
                                    />
                                </Field>

                                <Field label="National Policy">
                                    <VocabularySelect
                                        value={formData.adaptation_data?.national_policy}
                                        onChange={handleNestedVocabChange('national_policy', 'adaptation_data')}
                                        options={vocab.adaptationPolicies || []}
                                    />
                                </Field>

                                <Field label="Provincial / Municipal Policy">
                                    <NestedField section="adaptation_data" name="provincial_municipal"
                                        value={formData.adaptation_data?.provincial_municipal} onChange={handleNestedChange} />
                                </Field>

                                <div className="col-span-2">
                                    <Field label="Overall Intervention Goal">
                                        <NestedField section="adaptation_data" name="intervention_goal"
                                            value={formData.adaptation_data?.intervention_goal} onChange={handleNestedChange} />
                                    </Field>
                                </div>

                                <div className="col-span-2">
                                    <Field label="Progress Calculator">
                                        <NestedField section="adaptation_data" name="progress_calculator" textarea rows={2}
                                            value={formData.adaptation_data?.progress_calculator} onChange={handleNestedChange} />
                                    </Field>
                                </div>

                                {/* ── Climate Impact ───────────────────────────── */}
                                <SectionHeading title="Climate Impact" />

                                <div className="col-span-2">
                                    <Field label="Observed and Projected Climate Change Impacts">
                                        <NestedField section="adaptation_data" name="climate_impact" textarea
                                            value={formData.adaptation_data?.climate_impact} onChange={handleNestedChange} />
                                    </Field>
                                </div>

                                <div className="col-span-2">
                                    <Field label="How the Impact is Addressed">
                                        <NestedField section="adaptation_data" name="address_climate_impact" textarea
                                            value={formData.adaptation_data?.address_climate_impact} onChange={handleNestedChange} />
                                    </Field>
                                </div>

                                <div className="col-span-2">
                                    <Field label="Response to Impact">
                                        <NestedField section="adaptation_data" name="impact_response" textarea
                                            value={formData.adaptation_data?.impact_response} onChange={handleNestedChange} />
                                    </Field>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {/*
              * ── Sticky Action Bar (Phase 3) ────────────────────────────────
              * Lives outside the glass-panel so it overlays the page as the
              * user scrolls.  The button targets the form via the `form`
              * attribute instead of being a child of <form>.
              */}
            <div style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 50,
                background: 'var(--bg-secondary, #0f172a)',
                borderTop: '1px solid var(--border-light)',
                padding: '1rem 2.5rem',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.75rem',
                /* Compensate for container horizontal padding so the bar spans full width */
                margin: '0 -1.5rem',
            }}>
                <Link
                    to={isEdit ? `/submission/${id}` : '/'}
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <ArrowLeft size={15} /> Cancel
                </Link>

                <button
                    form="submission-form"
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    {saving
                        ? <><Activity size={16} style={{ animation: 'pulse 1.5s infinite' }} /> Saving…</>
                        : <><Save size={16} /> {isEdit ? 'Save Changes' : 'Create Submission'}</>
                    }
                </button>
            </div>
        </div>
    );
};

export default SubmissionForm;
