import { ChevronDown } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// FilterSection — collapsible accordion wrapper (used by Home's filter sidebar)
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

export default FilterSection;
