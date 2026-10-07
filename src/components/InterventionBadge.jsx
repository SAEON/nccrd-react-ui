// ─────────────────────────────────────────────────────────────────────────────
// InterventionBadge — project type in the shared boxed .badge style, the box
// tinted in the type's colour (shared with the map and charts,
// utils/typeColors.js) behind darker text of the same hue, like the other
// coloured badges.
// ─────────────────────────────────────────────────────────────────────────────
import { typeTextColor, typeTint } from '../utils/typeColors';

const InterventionBadge = ({ type }) => (
    <span className="badge type-badge" style={{ background: typeTint(type), color: typeTextColor(type) }}>
        {type || 'General'}
    </span>
);

export default InterventionBadge;
