// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge — a submission's review state as icon + label (never colour
// alone). Published projects need no badge in public lists, so `hidePublished`
// leaves them unmarked.
// ─────────────────────────────────────────────────────────────────────────────
import { CircleCheck, Clock, CircleX, Pencil } from 'lucide-react';
import { REVIEW_STATES, reviewState } from '../utils/reviewStatus';

const ICONS = { published: CircleCheck, awaiting_review: Clock, not_accepted: CircleX, draft: Pencil };

const StatusBadge = ({ submission, hidePublished = false }) => {
    const state = reviewState(submission);
    if (hidePublished && state === 'published') return null;
    const Icon = ICONS[state];
    return (
        <span className={`badge status-badge status-${REVIEW_STATES[state].tone}`}>
            <Icon size={12} aria-hidden="true" /> {REVIEW_STATES[state].label}
        </span>
    );
};

export default StatusBadge;
