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
 *      – Results refresh as soon as any filter changes (no Apply button).
 *
 *   4. Data Fetching Optimization
 *      – loadData() builds query params from `filters` + the applied keyword,
 *        skipping every empty/null value so the backend only receives active filters.
 *      – An effect re-runs it whenever those change, aborting the superseded
 *        request so a slow earlier response can't overwrite newer results.
 *
 * Constraints:
 *   ✓ No MUI / Bootstrap — only existing CSS classes (.glass-panel, .input-field,
 *     .input-label, .btn, .btn-primary, .btn-outline, .badge, etc.) and inline styles.
 *   ✓ Icons via lucide-react only.
 *   ✓ Fully copy-pasteable — no external state managers or new CSS required.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSubmissions, getFacets, downloadExport } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import Navbar from '../components/Navbar';
import InterventionBadge from '../components/InterventionBadge';
import FilterSection from '../components/FilterSection';
import FacetSelect from '../components/FacetSelect';
import BulkUploadModal from '../components/BulkUploadModal';
import { SORT_OPTIONS, DEFAULT_SORT, sortSubmissions } from '../utils/sortSubmissions';
import { buildQueryParams } from '../utils/submissionQuery';
import {
    Search, ChevronRight, Activity, Leaf, FileText,
    UploadCloud, Compass, Database, Zap, GitMerge,
    X, Upload, Filter, Download,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Project cards rendered per "Show more" step. */
const PAGE_SIZE = 50;

/** Pause in typing before the keyword search runs. */
const SEARCH_DEBOUNCE_MS = 300;

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
    mine: false,                    // only the logged-in user's own submissions
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
// Main component: Home
// ─────────────────────────────────────────────────────────────────────────────

const Home = () => {

    const { hasPermission, isAuthenticated, loading: authLoading } = useCurrentUser();
    const [searchParams, setSearchParams] = useSearchParams();
    const [downloading, setDownloading] = useState(false);

    // ── Phase 1: Core data state ──────────────────────────────────────────────
    const [submissions, setSubmissions] = useState([]);
    // Rendering all ~3k cards at once makes the page sluggish; show a page at a time.
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [sortBy, setSortBy] = useState(DEFAULT_SORT);
    const sortedSubmissions = useMemo(() => sortSubmissions(submissions, sortBy), [submissions, sortBy]);
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
    // The keyword actually sent to the API: follows `searchQuery` after a short
    // pause in typing, or immediately on Enter.
    const [appliedQuery, setAppliedQuery] = useState('');
    // Bumped to force a reload with unchanged filters (e.g. after an upload).
    const [reloadKey, setReloadKey] = useState(0);

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
    const loadData = async (signal) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = buildQueryParams(filters, appliedQuery);

            const data = await getSubmissions(queryParams, { signal });
            setSubmissions(Array.isArray(data) ? data : []);
            setVisibleCount(PAGE_SIZE);
            setLoading(false);
        } catch (err) {
            // Superseded by a newer filter change — that request owns the state now.
            if (err.name === 'AbortError') return;
            setError(`Failed to connect to the backend. Make sure nccrd-api is running on port 2022.`);
            console.error(err);
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Effects
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        loadFacets();
    }, []);

    // Reload results whenever a filter or the applied keyword changes (and on
    // mount). Aborting on cleanup drops the superseded request, so clicking
    // Mitigation then Gauteng quickly shows only the Mitigation + Gauteng result.
    useEffect(() => {
        const controller = new AbortController();
        loadData(controller.signal);
        return () => controller.abort();
    }, [filters, appliedQuery, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // "My submissions" in the header links here as /?mine=1: switch the filter
    // on, tidy the URL and bring the results into view.
    useEffect(() => {
        if (searchParams.get('mine') !== '1') return;
        setFilters((prev) => ({ ...prev, mine: true }));
        setSearchParams({}, { replace: true });
        requestAnimationFrame(() => document.getElementById('project-directory')?.scrollIntoView?.({ behavior: 'smooth' }));
    }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

    // The filter needs a login; drop it if the user logs out.
    useEffect(() => {
        if (!authLoading && !isAuthenticated) setFilters((prev) => (prev.mine ? { ...prev, mine: false } : prev));
    }, [authLoading, isAuthenticated]);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await downloadExport(buildQueryParams(filters, appliedQuery), 'xlsx');
        } catch (err) {
            setError(`Download failed: ${err.message}`);
        } finally {
            setDownloading(false);
        }
    };

    // Apply the keyword once typing pauses, rather than on every keystroke.
    useEffect(() => {
        const timer = setTimeout(() => setAppliedQuery(searchQuery), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ─────────────────────────────────────────────────────────────────────────
    // Event handlers
    // ─────────────────────────────────────────────────────────────────────────

    /** Submit keyword search via Enter key or the magnifier button. */
    const handleSearch = (e) => {
        e.preventDefault();
        setAppliedQuery(searchQuery);
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
        if (filters.mine) n++;
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
                    onSuccess={() => { setShowUploadModal(false); setReloadKey((k) => k + 1); }}
                />
            )}

            {/* ── Official Top Banner ───────────────────────────────────────── */}
            <Navbar />

            {/* ── Hero Section with Background ───────────────────────────────── */}
            <section
                className="hero-container"
                style={{ backgroundImage: 'url("/hero-bg.jpg")' }}
            >
                <div className="hero-overlay animate-fade-in">
                    <h1 className="hero-title" style={{ marginBottom: '1.5rem', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '-0.03em' }}>
                        National Climate Change Response Database
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--accent-secondary)', fontWeight: 500, maxWidth: '600px', margin: '0 auto' }}>
                        Tracking South Africa’s climate change adaptation and mitigation projects.
                    </p>
                </div>
            </section>

            {/* ── Action cards ──────────────────────────────────────────────── */}
            <div className="container" style={{ marginTop: '-5rem', position: 'relative', zIndex: 10 }}>
                <div className="flex gap-6 animate-fade-in stagger-2 home-action-cards">

                    {/* Data Reports */}
                    <div className="glass-panel" style={{ flex: 1, padding: '2.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ background: 'var(--accent-surface)', padding: '1rem', borderRadius: 'var(--radius-full)', marginBottom: '1.5rem', border: '1px solid var(--accent-border)' }}>
                            <FileText size={28} color="var(--accent-primary)" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>Data Reports</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem', height: '3rem' }}>View progress on South Africa&apos;s climate change response.</p>
                        <Link to="/reports" className="card-btn">
                            VIEW REPORTS
                        </Link>
                    </div>

                    {/* Contribute */}
                    <div className="glass-panel" style={{ flex: 1, padding: '2.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ background: 'var(--accent-surface)', padding: '1rem', borderRadius: 'var(--radius-full)', marginBottom: '1.5rem', border: '1px solid var(--accent-border)' }}>
                            <UploadCloud size={28} color="var(--accent-primary)" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>Contribute</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem', height: '3rem' }}>Add your organisation&apos;s climate change projects to the national database.</p>
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
                <div className="home-stats">
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

                <div className="flex gap-8 home-directory">

                    {/* ══════════════════════════════════════════════════════════
                        Phase 3: Faceted Search Sidebar
                        ══════════════════════════════════════════════════════════ */}
                    <div className="home-sidebar">
                        <div
                            className="glass-panel home-sidebar-panel"
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

                            {/* ── Own submissions (logged-in users) ───────────── */}
                            {isAuthenticated && (
                                <label className="my-submissions-toggle">
                                    <input
                                        type="checkbox"
                                        checked={filters.mine}
                                        onChange={(e) => setFilter('mine', e.target.checked)}
                                    />
                                    Only my submissions
                                </label>
                            )}

                            {/* ── Full-text keyword search ─────────────────── */}
                            <form style={{ marginBottom: '0.5rem' }} onSubmit={handleSearch}>
                                <label className="input-label" htmlFor="search-keywords">Keywords</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="search-keywords"
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
                                 * Options come from /facets/submission. "National" is the legacy
                                 * value for country-wide projects; it is labelled as South Africa
                                 * and listed first, but still sent to the backend as "National".
                                 */}
                                <FacetSelect
                                    id="facet-province"
                                    label="Province"
                                    value={filters.province}
                                    options={facets.province ?? []}
                                    labels={{ National: 'South Africa (National)' }}
                                    pinned={['National']}
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
                                    id="facet-implementation_status"
                                    label="Implementation Status"
                                    value={filters.implementation_status}
                                    options={facets.implementation_status ?? []}
                                    onChange={(v) => setFilter('implementation_status', v)}
                                />

                                <FacetSelect
                                    id="facet-funding_type"
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
                                    id="facet-mitigation_sector"
                                    label="Host Sector"
                                    value={filters.mitigation_sector}
                                    options={facets.mitigation_sector ?? []}
                                    onChange={(v) => setFilter('mitigation_sector', v)}
                                />

                                {/* Mitigation Type → mitigation_project_type query param */}
                                <FacetSelect
                                    id="facet-mitigation_project_type"
                                    label="Mitigation Type (Project Type)"
                                    value={filters.mitigation_project_type}
                                    options={facets.mitigation_project_type ?? []}
                                    onChange={(v) => setFilter('mitigation_project_type', v)}
                                />

                                <FacetSelect
                                    id="facet-mitigation_program"
                                    label="Mitigation Program"
                                    value={filters.mitigation_program}
                                    options={facets.mitigation_program ?? []}
                                    onChange={(v) => setFilter('mitigation_program', v)}
                                />

                                {/* National Policy → mitigation_national_policy */}
                                <FacetSelect
                                    id="facet-mitigation_national_policy"
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
                                    id="facet-adaptation_sector"
                                    label="Sector"
                                    value={filters.adaptation_sector}
                                    options={facets.adaptation_sector ?? []}
                                    onChange={(v) => setFilter('adaptation_sector', v)}
                                />

                                {/* Hazard → adaptation_hazard */}
                                <FacetSelect
                                    id="facet-adaptation_hazard"
                                    label="Hazard"
                                    value={filters.adaptation_hazard}
                                    options={facets.adaptation_hazard ?? []}
                                    onChange={(v) => setFilter('adaptation_hazard', v)}
                                />

                                {/* National Policy → adaptation_national_policy */}
                                <FacetSelect
                                    id="facet-adaptation_national_policy"
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

                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        Results list
                        ══════════════════════════════════════════════════════════ */}
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div className="flex items-center" style={{ gap: '0.75rem' }}>
                                <h3 style={{ fontSize: '1.4rem', margin: 0 }}>Results</h3>
                                {!error && !(loading && submissions.length === 0) && (
                                    <span className="badge badge-success">
                                        {submissions.length} project{submissions.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={handleDownload}
                                    disabled={downloading || submissions.length === 0}
                                    title="Download these results as an Excel file"
                                    style={{ padding: '0.5rem 0.9rem', gap: '0.4rem', whiteSpace: 'nowrap' }}
                                >
                                    <Download size={15} /> {downloading ? 'Preparing…' : 'Download'}
                                </button>
                                <label htmlFor="sort-results" className="input-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                                    Sort by
                                </label>
                                <select
                                    id="sort-results"
                                    className="input-field"
                                    value={sortBy}
                                    onChange={(e) => { setSortBy(e.target.value); setVisibleCount(PAGE_SIZE); }}
                                    style={{ cursor: 'pointer', fontSize: '0.9rem', padding: '0.5rem 0.8rem', width: 'auto' }}
                                >
                                    {SORT_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Loading skeleton — first load only; refreshes dim the current list */}
                        {loading && submissions.length === 0 ? (
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
                            <div
                                aria-busy={loading}
                                style={{
                                    display: 'flex', flexDirection: 'column', gap: '1rem',
                                    opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s',
                                }}
                            >
                                {sortedSubmissions.slice(0, visibleCount).map((sub) => (
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
                                {visibleCount < submissions.length && (
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        style={{ alignSelf: 'center' }}
                                        onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                                    >
                                        Show more ({submissions.length - visibleCount} remaining)
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
