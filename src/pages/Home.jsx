/**
 * Home.jsx — NCCRD Project Directory with Faceted Search Engine
 *
 * Phases implemented:
 *   1. State Management & API Integration
 *      – `facets` state populated from GET /submission/facets/submission on mount.
 *      – `filters` state is a flat object covering every supported backend param.
 *      – `openSections` state drives accordion open/close (Project open by default).
 *
 *   2. Custom UI Helper Components (defined OUTSIDE the main component)
 *      – FilterSection: collapsible accordion wrapper with rotating ChevronDown.
 *      – FacetSelect:   labelled native <select> built from the facets vocabulary.
 *
 *   3. Faceted Sidebar Layout
 *      – Sidebar header: "Filters" with active-filter count badge + "Clear All".
 *      – Full-text keyword search preserved.
 *      – Project Filters accordion:    checkboxes + 3 FacetSelects.
 *      – Mitigation Filters accordion: 4 FacetSelects.
 *      – Adaptation Filters accordion: 3 FacetSelects.
 *      – Prominent "Apply Filters" button at the bottom.
 *
 *   4. Data Fetching Optimization
 *      – loadData() builds query params at call-time from `filters` + `searchQuery`,
 *        skipping every empty/null value so the backend only receives active filters.
 *
 * Constraints:
 *   ✓ No MUI / Bootstrap — only existing CSS classes (.glass-panel, .input-field,
 *     .input-label, .btn, .btn-primary, .btn-outline, .badge, etc.) and inline styles.
 *   ✓ Icons via lucide-react only.
 *   ✓ Fully copy-pasteable — no external state managers or new CSS required.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getSubmissions, getFacets, uploadBulkSubmissions } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import Navbar from '../components/Navbar';
import {
    Search, ChevronDown, ChevronRight, Activity, Leaf, FileText,
    UploadCloud, Compass, Database, Zap, GitMerge,
    X, AlertTriangle, CheckCircle2, Upload, Filter,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Colour tokens for the per-submission intervention type badge. */
const INTERVENTION_BADGE = {
    Mitigation: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    Adaptation: { color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    'Cross Cutting': { color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
};

/**
 * Canonical empty filter state.
 * Used both for initialisation and for the "Clear All" action.
 *
 * Every key maps 1-to-1 to a query parameter accepted by
 * GET /submission/list_submission (see nccrd/api/routers/submission.py).
 * `intervention_measurement` is the only array — it is joined as CSV before
 * being appended to the URL.
 */
const EMPTY_FILTERS = {
    // ── Project-level ──────────────────────────────────────────────────────────
    intervention_measurement: [],   // string[] — Mitigation | Adaptation | Cross Cutting
    province: '',     // JSONB containment filter on the backend
    implementation_status: '',     // facetised — distinct values from Submission table
    funding_type: '',     // facetised — distinct values from Submission table

    // ── Mitigation child table ─────────────────────────────────────────────────
    mitigation_sector: '',
    mitigation_project_type: '',
    mitigation_program: '',
    mitigation_national_policy: '',

    // ── Adaptation child table ─────────────────────────────────────────────────
    adaptation_sector: '',
    adaptation_hazard: '',
    adaptation_national_policy: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// InterventionBadge — coloured pill chip per intervention type
// ─────────────────────────────────────────────────────────────────────────────

const InterventionBadge = ({ type }) => {
    const style = INTERVENTION_BADGE[type] || { color: 'var(--text-muted)', bg: 'transparent' };
    return (
        <span style={{
            display: 'inline-block',
            padding: '0.15rem 0.6rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: style.color,
            background: style.bg,
            border: `1px solid ${style.color}40`,
        }}>
            {type || 'General'}
        </span>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2a: FilterSection — collapsible accordion wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders a titled section with a toggleable body.
 * The ChevronDown icon rotates 180° when the section is open, providing
 * an unambiguous expand/collapse affordance without any JavaScript animation
 * library — just a CSS transition on the `transform` property.
 *
 * @param {string}   title    – Section heading (e.g. "Project Filters")
 * @param {boolean}  isOpen   – Whether the accordion body is visible
 * @param {function} onToggle – Callback invoked on header button click
 * @param {node}     children – Filter controls rendered inside the body
 */
const FilterSection = ({ title, isOpen, onToggle, children }) => (
    <div style={{ borderBottom: '1px solid var(--border-light)' }}>

        {/* ── Accordion trigger button ──────────────────────────────────────── */}
        <button
            onClick={onToggle}
            aria-expanded={isOpen}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.875rem 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontFamily: 'inherit',
            }}
        >
            {title}
            <ChevronDown
                size={15}
                style={{
                    /* CSS transition drives the rotation — no JS animation needed. */
                    transition: 'transform var(--transition-normal)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    color: 'var(--text-muted)',
                    flexShrink: 0,
                }}
            />
        </button>

        {/* ── Accordion body — rendered conditionally ───────────────────────── */}
        {isOpen && (
            <div style={{ paddingBottom: '0.75rem' }}>
                {children}
            </div>
        )}
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2b: FacetSelect — labelled native <select> from backend vocabulary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A controlled, labelled <select> whose options are sourced dynamically from
 * the `facets` API response.  Gracefully degrades to "(ALL)" only when the
 * options array is empty (e.g. no data yet, or the backend doesn't expose that
 * facet — province is an example of the latter because it lives in a JSONB blob).
 *
 * Null / undefined entries in `options` are filtered out before rendering to
 * guard against sparse DB columns.  Options are sorted alphabetically for
 * consistent UX.
 *
 * @param {string}   label    – Human-readable label rendered above the select
 * @param {string}   value    – Controlled value (from `filters` state)
 * @param {string[]} options  – Array of distinct string values from the API
 * @param {function} onChange – Callback receiving the newly selected string value
 */
const FacetSelect = ({ label, value, options = [], onChange }) => (
    <div style={{ marginBottom: '0.875rem' }}>
        <label className="input-label">{label}</label>
        <select
            className="input-field"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
                cursor: 'pointer',
                fontSize: '0.9rem',
                padding: '0.6rem 0.8rem',
            }}
        >
            {/* Default "no filter" sentinel — always present */}
            <option value="">(ALL)</option>

            {/* Dynamic options: filter nulls, sort, then render */}
            {options
                .filter(Boolean)
                .sort()
                .map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))
            }
        </select>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// BulkUploadModal — drag-and-drop Excel import dialog (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

const BulkUploadModal = ({ onClose, onSuccess }) => {
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    // result: null | { type: 'success', message } | { type: 'error', message, errors[] }
    const [result, setResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = (f) => {
        if (!f) return;
        if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
            setResult({ type: 'error', message: 'Only .xlsx or .xls files are accepted.', errors: [] });
            return;
        }
        setFile(f);
        setResult(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setResult(null);
        try {
            const data = await uploadBulkSubmissions(file);
            setResult({ type: 'success', message: data.detail || 'Upload successful.' });
            onSuccess();
        } catch (err) {
            const detail = err.detail;
            if (detail && typeof detail === 'object' && Array.isArray(detail.errors)) {
                setResult({ type: 'error', message: detail.message, errors: detail.errors });
            } else {
                setResult({ type: 'error', message: err.message || 'Upload failed.', errors: [] });
            }
        } finally {
            setUploading(false);
        }
    };

    return (
        /* Backdrop — click outside to close */
        <div
            onClick={(e) => e.target === e.currentTarget && onClose()}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
            }}
        >
            {/* Dialog panel */}
            <div className="glass-panel animate-fade-in" style={{
                width: '100%', maxWidth: '640px',
                padding: '2rem', position: 'relative',
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: '0.25rem',
                    }}
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                <h2 style={{ marginBottom: '0.5rem' }}>
                    <Upload size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                    Bulk Upload Submissions
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Upload a consolidated <strong>.xlsx</strong> workbook with sheets:
                    &ldquo;General project details&rdquo;, &ldquo;Adaptation details&rdquo; (optional),
                    &ldquo;Mitigation details&rdquo; (optional). Row 1 must contain column headers.
                    All rows are validated before any record is saved.
                </p>

                {/* Drop zone */}
                <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    style={{
                        border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '2.5rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                        background: dragOver ? 'rgba(28,61,47,0.08)' : 'transparent',
                        marginBottom: '1.25rem',
                    }}
                >
                    <UploadCloud size={36} color="var(--accent-primary)" style={{ margin: '0 auto 0.75rem' }} />
                    {file
                        ? <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</p>
                        : <>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                Drag &amp; drop your <strong>.xlsx</strong> file here
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>or click to browse</p>
                        </>
                    }
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFile(e.target.files[0])}
                    />
                </div>

                {/* Success feedback */}
                {result?.type === 'success' && (
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        padding: '1rem', borderRadius: 'var(--radius-md)',
                        background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
                        marginBottom: '1rem',
                    }}>
                        <CheckCircle2 size={20} color="#34d399" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                        <p style={{ color: '#34d399', margin: 0 }}>{result.message}</p>
                    </div>
                )}

                {/* Error feedback — with optional per-row validation table */}
                {result?.type === 'error' && (
                    <div style={{
                        padding: '1rem', borderRadius: 'var(--radius-md)',
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                        marginBottom: '1rem',
                    }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: result.errors.length ? '1rem' : 0 }}>
                            <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                            <p style={{ color: '#f87171', margin: 0 }}>{result.message}</p>
                        </div>

                        {result.errors.length > 0 && (
                            <div style={{ maxHeight: '220px', overflowY: 'auto', borderRadius: 'var(--radius-sm)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
                                            <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: '#f87171' }}>Row</th>
                                            <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: '#f87171' }}>Column</th>
                                            <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: '#f87171' }}>Value</th>
                                            <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: '#f87171' }}>Issue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.errors.map((err, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '0.4rem 0.6rem' }}>{err.row ?? '—'}</td>
                                                <td style={{ padding: '0.4rem 0.6rem' }}>{err.column ?? '—'}</td>
                                                <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'monospace' }}>{String(err.value ?? '')}</td>
                                                <td style={{ padding: '0.4rem 0.6rem' }}>{err.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {uploading
                            ? <><Activity size={16} style={{ animation: 'pulse 1.5s infinite' }} /> Uploading…</>
                            : <><UploadCloud size={16} /> Upload</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component: Home
// ─────────────────────────────────────────────────────────────────────────────

const Home = () => {

    const { hasPermission } = useCurrentUser();

    // ── Phase 1: Core data state ──────────────────────────────────────────────
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Phase 1: Facets vocabulary ────────────────────────────────────────────
    /**
     * Shape mirrors the response from GET /submission/facets/submission:
     * {
     *   implementation_status:      string[],
     *   funding_type:               string[],
     *   adaptation_sector:          string[],
     *   adaptation_hazard:          string[],
     *   adaptation_national_policy: string[],
     *   mitigation_sector:          string[],
     *   mitigation_project_type:    string[],
     *   mitigation_program:         string[],
     *   mitigation_national_policy: string[],
     *   … (additional keys ignored by the UI)
     * }
     * NOTE: `province` is NOT in this response because the backend stores
     * geographic data in a JSONB blob.  Province FacetSelect will gracefully
     * display "(ALL)" only until this facet is added to the backend.
     */
    const [facets, setFacets] = useState({});

    // ── Phase 1: Search state ─────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');

    // ── Phase 1: Filter state ─────────────────────────────────────────────────
    const [filters, setFilters] = useState(EMPTY_FILTERS);

    // ── Phase 1: Accordion state ──────────────────────────────────────────────
    /**
     * `openSections` drives which FilterSection accordions are expanded.
     * Project is open by default; the others are closed to keep the sidebar
     * compact on first load.
     */
    const [openSections, setOpenSections] = useState({
        project: true,
        mitigation: false,
        adaptation: false,
    });

    // ── UI state ──────────────────────────────────────────────────────────────
    const [showUploadModal, setShowUploadModal] = useState(false);

    // ─────────────────────────────────────────────────────────────────────────
    // Effects
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        // Both calls are independent — fire them in parallel on first mount.
        loadData();
        loadFacets();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 1: Data fetching
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Fetch the controlled vocabulary from the backend once on mount.
     * Non-critical: if the request fails, all FacetSelects degrade to "(ALL)"
     * and the user can still perform keyword search.
     */
    const loadFacets = async () => {
        try {
            const data = await getFacets();
            setFacets(data);
        } catch (err) {
            console.warn('[NCCRD] Could not load facets — filter dropdowns will be empty.', err);
        }
    };

    /**
     * Phase 4: Build query params from the current filter + search state,
     * then fetch the matching submissions.
     *
     * Design decision: build the params object imperatively at call-time rather
     * than as a derived `useMemo` value.  This avoids an extra render cycle and
     * keeps the fetch logic co-located and easy to reason about.
     *
     * Only non-empty values are included so the backend receives clean URLs and
     * only applies the filters the user actually wants.
     */
    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = {};

            // ── Full-text keyword search ─────────────────────────────────────
            if (searchQuery.trim()) {
                queryParams.q = searchQuery.trim();
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

            const data = await getSubmissions(queryParams);
            setSubmissions(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(`Failed to connect to the backend. Make sure nccrd-api is running on port 2022.`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Event handlers
    // ─────────────────────────────────────────────────────────────────────────

    /** Submit keyword search via Enter key or the magnifier button. */
    const handleSearch = (e) => {
        e.preventDefault();
        loadData();
    };

    /**
     * Toggle a value in the `intervention_measurement` checkbox array.
     * Uses an immutable update pattern to avoid direct state mutation.
     */
    const toggleIntervention = (type) => {
        setFilters((prev) => ({
            ...prev,
            intervention_measurement: prev.intervention_measurement.includes(type)
                ? prev.intervention_measurement.filter((t) => t !== type)
                : [...prev.intervention_measurement, type],
        }));
    };

    /**
     * Generic scalar-filter setter used by every FacetSelect onChange.
     * e.g.  setFilter('implementation_status', 'Under Implementation')
     */
    const setFilter = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    /** Flip the open/closed state of a named accordion section. */
    const toggleSection = (key) => {
        setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    /** Reset every filter and the search query back to their initial blank state. */
    const clearAll = () => {
        setSearchQuery('');
        setFilters(EMPTY_FILTERS);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Derived / memoised state
    // ─────────────────────────────────────────────────────────────────────────

    /** Per-type submission counts for the stats strip — computed live from data. */
    const stats = useMemo(() => {
        const counts = { Mitigation: 0, Adaptation: 0, 'Cross Cutting': 0 };
        submissions.forEach((s) => {
            const t = s.intervention_measurement;
            if (t in counts) counts[t]++;
        });
        return { total: submissions.length, ...counts };
    }, [submissions]);

    /**
     * Count of currently active filters (including the search query).
     * Displayed as a badge on the sidebar heading so users immediately know
     * that some filters are in effect — important after page re-loads.
     */
    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (searchQuery.trim()) n++;
        if (filters.intervention_measurement.length > 0) n++;
        if (filters.province) n++;
        if (filters.implementation_status) n++;
        if (filters.funding_type) n++;
        if (filters.mitigation_sector) n++;
        if (filters.mitigation_project_type) n++;
        if (filters.mitigation_program) n++;
        if (filters.mitigation_national_policy) n++;
        if (filters.adaptation_sector) n++;
        if (filters.adaptation_hazard) n++;
        if (filters.adaptation_national_policy) n++;
        return n;
    }, [filters, searchQuery]);

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div style={{ width: '100%' }}>

            {/* ── Bulk upload modal ────────────────────────────────────────── */}
            {showUploadModal && (
                <BulkUploadModal
                    onClose={() => setShowUploadModal(false)}
                    onSuccess={() => { setShowUploadModal(false); loadData(); }}
                />
            )}

            {/* ── Official Top Banner ───────────────────────────────────────── */}
            <Navbar />

            {/* ── Hero Section with Background ───────────────────────────────── */}
            <section
                className="hero-container"
                style={{ backgroundImage: 'url("/hero-bg.png")' }}
            >
                <div className="hero-overlay animate-fade-in">
                    <h1 style={{ fontSize: '3.2rem', marginBottom: '1.5rem', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '-0.03em' }}>
                        National Climate Change Response Database
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--accent-secondary)', fontWeight: 500, maxWidth: '600px', margin: '0 auto' }}>
                        Tracking South Africa’s climate change adaptation and mitigation projects.
                    </p>
                </div>
            </section>

            {/* ── Action cards ──────────────────────────────────────────────── */}
            <div className="container" style={{ marginTop: '-5rem', position: 'relative', zIndex: 10 }}>
                <div className="flex gap-6 animate-fade-in stagger-2">

                    {/* Data Reports */}
                    <div className="glass-panel" style={{ flex: 1, padding: '2.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ background: 'var(--accent-surface)', padding: '1rem', borderRadius: 'var(--radius-full)', marginBottom: '1.5rem', border: '1px solid var(--accent-border)' }}>
                            <FileText size={28} color="var(--accent-primary)" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>Data Reports</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem', height: '3rem' }}>View progress on South Africa's climate change response.</p>
                        <button className="card-btn" disabled style={{ opacity: 0.6, cursor: 'not-allowed', background: '#f8fafc' }}>
                            COMING SOON
                        </button>
                    </div>

                    {/* Contribute */}
                    <div className="glass-panel" style={{ flex: 1, padding: '2.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ background: 'var(--accent-surface)', padding: '1rem', borderRadius: 'var(--radius-full)', marginBottom: '1.5rem', border: '1px solid var(--accent-border)' }}>
                            <UploadCloud size={28} color="var(--accent-primary)" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>Contribute</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem', height: '3rem' }}>Add your organisation's climate change projects to the national database.</p>
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {hasPermission('create-submission') && (
                                <Link to="/submission/new" className="card-btn" style={{ background: 'var(--accent-primary)', color: 'white', border: 'none' }}>
                                    NEW SUBMISSION
                                </Link>
                            )}
                            {hasPermission('upload-template') && (
                                <button className="card-btn" onClick={() => setShowUploadModal(true)}>
                                    <Upload size={14} style={{ marginRight: '0.5rem' }} /> BULK UPLOAD
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Search Data */}
                    <div className="glass-panel" style={{ flex: 1, padding: '2.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ background: 'var(--accent-surface)', padding: '1rem', borderRadius: 'var(--radius-full)', marginBottom: '1.5rem', border: '1px solid var(--accent-border)' }}>
                            <Compass size={28} color="var(--accent-primary)" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>Search Data</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem', height: '3rem' }}>Explore, filter and download detailed project data across all sectors and regions.</p>
                        <button
                            className="card-btn"
                            onClick={() => document.getElementById('project-directory')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            SEARCH DATA
                        </button>
                    </div>

                </div>
            </div>

            {/* ── Stats bar ────────────────────────────────────────────────── */}
            <div className="container" style={{ marginTop: '3rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                    <div className="stat-tag">
                        <div style={{ background: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--accent-border)' }}>
                            <Database size={18} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <div className="stat-val">{stats.total}</div>
                            <div className="stat-label">Total Projects</div>
                        </div>
                    </div>
                    <div className="stat-tag">
                        <div style={{ background: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--accent-border)' }}>
                            <Zap size={18} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <div className="stat-val">{stats.Mitigation || 0}</div>
                            <div className="stat-label">Mitigation</div>
                        </div>
                    </div>
                    <div className="stat-tag">
                        <div style={{ background: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--accent-border)' }}>
                            <Leaf size={18} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <div className="stat-val">{stats.Adaptation || 0}</div>
                            <div className="stat-label">Adaptation</div>
                        </div>
                    </div>
                    <div className="stat-tag">
                        <div style={{ background: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--accent-border)' }}>
                            <GitMerge size={18} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <div className="stat-val">{stats['Cross Cutting'] || 0}</div>
                            <div className="stat-label">Cross Cutting</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                Project Directory — main two-column layout
                id is the scroll target for the hero and the Navbar.
                ═══════════════════════════════════════════════════════════════ */}
            <div id="project-directory" className="container" style={{ padding: '3rem 1.5rem 5rem' }}>
                <h2 style={{ textAlign: 'center', fontSize: '2.2rem', marginBottom: '2.5rem', color: 'var(--accent-primary)' }}>
                    Project Directory
                </h2>

                <div className="flex gap-8">

                    {/* ══════════════════════════════════════════════════════════
                        Phase 3: Faceted Search Sidebar
                        ══════════════════════════════════════════════════════════ */}
                    <div style={{ width: '300px', flexShrink: 0 }}>
                        <div
                            className="glass-panel"
                            style={{
                                padding: '1.5rem',
                                position: 'sticky',
                                top: '100px',
                                /*
                                 * Override the .glass-panel:hover lift effect.
                                 * Inline styles have higher specificity than
                                 * class pseudo-class rules, so this works without
                                 * touching index.css.
                                 */
                                transform: 'none',
                                /* Scroll the panel itself when there are many filters
                                   and the viewport is short. */
                                maxHeight: 'calc(100vh - 120px)',
                                overflowY: 'auto',
                            }}
                        >
                            {/* ── Sidebar header ───────────────────────────── */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: '1px solid var(--border-light)',
                                paddingBottom: '1rem',
                                marginBottom: '1rem',
                            }}>
                                {/* Title + active-filter count badge */}
                                <h3 style={{
                                    fontSize: '1rem',
                                    margin: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}>
                                    <Filter size={16} />
                                    Filters

                                    {/* Badge: shown only when at least one filter is active */}
                                    {activeFilterCount > 0 && (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minWidth: '20px',
                                            height: '20px',
                                            borderRadius: '9999px',
                                            background: 'var(--accent-primary)',
                                            color: 'white',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            padding: '0 4px',
                                        }}>
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </h3>

                                {/* Clear All — only visible when filters are active */}
                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={clearAll}
                                        title="Reset all filters"
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--accent-secondary)',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            padding: '0.2rem 0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        <X size={13} /> Clear All
                                    </button>
                                )}
                            </div>

                            {/* ── Full-text keyword search ─────────────────── */}
                            <form style={{ marginBottom: '0.5rem' }} onSubmit={handleSearch}>
                                <label className="input-label">Keywords</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Search by title…"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ paddingRight: '2.5rem' }}
                                    />
                                    <button
                                        type="submit"
                                        aria-label="Search"
                                        style={{
                                            position: 'absolute', right: '5px', top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none', border: 'none',
                                            cursor: 'pointer', color: 'var(--accent-primary)',
                                            padding: '0.5rem',
                                        }}
                                    >
                                        <Search size={15} />
                                    </button>
                                </div>
                            </form>

                            {/* ══════════════════════════════════════════════
                                ACCORDION GROUP 1: Project Filters
                                ══════════════════════════════════════════════ */}
                            <FilterSection
                                title="Project Filters"
                                isOpen={openSections.project}
                                onToggle={() => toggleSection('project')}
                            >
                                {/* Intervention Type — multi-select checkboxes */}
                                <div style={{ marginBottom: '0.875rem' }}>
                                    <label className="input-label">Intervention Type</label>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem',
                                        marginTop: '0.4rem',
                                    }}>
                                        {['Mitigation', 'Adaptation', 'Cross Cutting'].map((type) => (
                                            <label
                                                key={type}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.92rem',
                                                    color: 'var(--text-secondary)',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={filters.intervention_measurement.includes(type)}
                                                    onChange={() => toggleIntervention(type)}
                                                    style={{
                                                        accentColor: 'var(--accent-primary)',
                                                        width: '15px',
                                                        height: '15px',
                                                        cursor: 'pointer',
                                                    }}
                                                />
                                                {type}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/*
                                 * Province
                                 * The backend filter param `province` uses JSONB containment
                                 * (@>) on geo_location, but /facets/submission does not enumerate
                                 * province values because geo_location is a JSONB blob.
                                 * FacetSelect gracefully shows "(ALL)" only when options is [].
                                 * Once the backend exposes a `province` facet, this just works.
                                 */}
                                <FacetSelect
                                    label="Province"
                                    value={filters.province}
                                    options={facets.province ?? []}
                                    onChange={(v) => setFilter('province', v)}
                                />

                                {/*
                                 * Estimated Budget (estimated_budget_cost)
                                 * This field exists on the Submission model but is NOT currently
                                 * exposed as a filter parameter on GET /list_submission.
                                 * It is omitted here to avoid rendering a non-functional control.
                                 * Re-enable once the backend supports budget range filtering.
                                 */}

                                <FacetSelect
                                    label="Implementation Status"
                                    value={filters.implementation_status}
                                    options={facets.implementation_status ?? []}
                                    onChange={(v) => setFilter('implementation_status', v)}
                                />

                                <FacetSelect
                                    label="Funding Type"
                                    value={filters.funding_type}
                                    options={facets.funding_type ?? []}
                                    onChange={(v) => setFilter('funding_type', v)}
                                />
                            </FilterSection>

                            {/* ══════════════════════════════════════════════
                                ACCORDION GROUP 2: Mitigation Filters
                                ══════════════════════════════════════════════ */}
                            <FilterSection
                                title="Mitigation Filters"
                                isOpen={openSections.mitigation}
                                onToggle={() => toggleSection('mitigation')}
                            >
                                {/* Host Sector → mitigation_sector query param */}
                                <FacetSelect
                                    label="Host Sector"
                                    value={filters.mitigation_sector}
                                    options={facets.mitigation_sector ?? []}
                                    onChange={(v) => setFilter('mitigation_sector', v)}
                                />

                                {/* Mitigation Type → mitigation_project_type query param */}
                                <FacetSelect
                                    label="Mitigation Type (Project Type)"
                                    value={filters.mitigation_project_type}
                                    options={facets.mitigation_project_type ?? []}
                                    onChange={(v) => setFilter('mitigation_project_type', v)}
                                />

                                <FacetSelect
                                    label="Mitigation Program"
                                    value={filters.mitigation_program}
                                    options={facets.mitigation_program ?? []}
                                    onChange={(v) => setFilter('mitigation_program', v)}
                                />

                                {/* National Policy → mitigation_national_policy */}
                                <FacetSelect
                                    label="National Policy"
                                    value={filters.mitigation_national_policy}
                                    options={facets.mitigation_national_policy ?? []}
                                    onChange={(v) => setFilter('mitigation_national_policy', v)}
                                />

                                {/*
                                 * Regional Policy (provincial_municipal)
                                 * The field exists on the Mitigation model but is not a supported
                                 * filter param on GET /list_submission yet.  Omitted to avoid
                                 * a non-functional control.  Add back when the backend supports it.
                                 */}
                            </FilterSection>

                            {/* ══════════════════════════════════════════════
                                ACCORDION GROUP 3: Adaptation Filters
                                ══════════════════════════════════════════════ */}
                            <FilterSection
                                title="Adaptation Filters"
                                isOpen={openSections.adaptation}
                                onToggle={() => toggleSection('adaptation')}
                            >
                                {/* Sector → adaptation_sector */}
                                <FacetSelect
                                    label="Sector"
                                    value={filters.adaptation_sector}
                                    options={facets.adaptation_sector ?? []}
                                    onChange={(v) => setFilter('adaptation_sector', v)}
                                />

                                {/* Hazard → adaptation_hazard */}
                                <FacetSelect
                                    label="Hazard"
                                    value={filters.adaptation_hazard}
                                    options={facets.adaptation_hazard ?? []}
                                    onChange={(v) => setFilter('adaptation_hazard', v)}
                                />

                                {/* National Policy → adaptation_national_policy */}
                                <FacetSelect
                                    label="National Policy"
                                    value={filters.adaptation_national_policy}
                                    options={facets.adaptation_national_policy ?? []}
                                    onChange={(v) => setFilter('adaptation_national_policy', v)}
                                />

                                {/*
                                 * Regional Policy (provincial_municipal)
                                 * Same situation as Mitigation — omitted until the backend
                                 * exposes it as a list_submission filter param.
                                 */}
                            </FilterSection>

                            {/* ── Apply Filters CTA ─────────────────────────── */}
                            <button
                                className="btn btn-primary w-full"
                                onClick={loadData}
                                style={{ marginTop: '1.25rem' }}
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        Results list
                        ══════════════════════════════════════════════════════════ */}
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.4rem', margin: 0 }}>Results</h3>
                            {!loading && !error && (
                                <span className="badge badge-success">
                                    {submissions.length} project{submissions.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        {/* Loading skeleton */}
                        {loading ? (
                            <div className="glass-panel text-center" style={{ padding: '4rem' }}>
                                <Activity
                                    size={44}
                                    color="var(--accent-primary)"
                                    style={{ display: 'block', margin: '0 auto', animation: 'pulse 2s infinite' }}
                                />
                                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
                                    Loading projects from database…
                                </p>
                            </div>

                        ) : error ? (
                            /* Backend connection error */
                            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid #ef4444' }}>
                                <h3 style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>Connection Error</h3>
                                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{error}</p>
                            </div>

                        ) : submissions.length === 0 ? (
                            /* Empty state */
                            <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
                                <Database size={44} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                                <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No projects found</h3>
                                <p style={{ color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 1.5rem' }}>
                                    Try adjusting your search or filters, or add the first project.
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                    {hasPermission('create-submission') && (
                                        <Link to="/submission/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                                            New Submission
                                        </Link>
                                    )}
                                    {hasPermission('upload-template') && (
                                        <button className="btn btn-outline" onClick={() => setShowUploadModal(true)}>
                                            Upload Spreadsheet
                                        </button>
                                    )}
                                </div>
                            </div>

                        ) : (
                            /* Submission cards */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {submissions.map((sub) => (
                                    <div
                                        key={sub.id}
                                        className="glass-panel"
                                        style={{
                                            padding: '1.5rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <span className="badge badge-success">{sub.submission_status || 'Pending'}</span>
                                                <InterventionBadge type={sub.intervention_measurement} />
                                            </div>
                                            <Link to={`/submission/${sub.id}`} style={{ textDecoration: 'none' }}>
                                                <h3 style={{ margin: '0 0 0.4rem', color: 'var(--text-primary)' }}>
                                                    {sub.title || `Project ${sub.id}`}
                                                </h3>
                                            </Link>
                                            <p style={{
                                                margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)',
                                                display: '-webkit-box', WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                            }}>
                                                {sub.description || 'No description provided.'}
                                            </p>
                                            {sub.implementation_organization && (
                                                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {sub.implementation_organization}
                                                </p>
                                            )}
                                        </div>
                                        <div style={{ marginLeft: '1rem', flexShrink: 0 }}>
                                            <Link
                                                to={`/submission/${sub.id}`}
                                                className="btn btn-outline"
                                                style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem' }}
                                            >
                                                <ChevronRight size={20} color="var(--accent-primary)" />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
