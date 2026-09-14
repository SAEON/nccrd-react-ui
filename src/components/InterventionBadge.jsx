// ─────────────────────────────────────────────────────────────────────────────
// InterventionBadge — coloured pill chip per intervention type (used by Home)
// ─────────────────────────────────────────────────────────────────────────────

/** Colour tokens for the per-submission intervention type badge. */
const INTERVENTION_BADGE = {
    Mitigation: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    Adaptation: { color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    'Cross Cutting': { color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
};

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

export default InterventionBadge;
