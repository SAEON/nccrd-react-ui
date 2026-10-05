// ─────────────────────────────────────────────────────────────────────────────
// InterventionBadge — project type in the shared boxed .badge style, with a
// colour dot carrying the type colour (shared with the map and charts,
// utils/typeColors.js); the text keeps the badge's readable colour.
// ─────────────────────────────────────────────────────────────────────────────
import { typeColor } from '../utils/typeColors';

const InterventionBadge = ({ type }) => (
    <span className="badge type-badge">
        <span className="type-dot" style={{ background: typeColor(type) }} aria-hidden="true" />
        {type || 'General'}
    </span>
);

export default InterventionBadge;
