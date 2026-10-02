/**
 * Unsaved submission-form drafts, kept in this browser's localStorage so a
 * crash, a closed tab or an expired login never loses a capture.
 *
 * Keyed per user and per submission ("new" for a fresh one), so people
 * sharing a computer never see each other's drafts. Every access is wrapped:
 * storage can be unavailable (private windows, blocked site data), in which
 * case drafting silently does nothing.
 */
const PREFIX = 'nccrd_draft';

export const draftKey = (userId, submissionId) => `${PREFIX}:${userId}:${submissionId || 'new'}`;

/** @returns {{ data: object, savedAt: string, baseUpdatedate: string|null } | null} */
export const loadDraft = (key) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const saveDraft = (key, data, baseUpdatedate) => {
    try {
        localStorage.setItem(key, JSON.stringify({ data, savedAt: new Date().toISOString(), baseUpdatedate }));
    } catch {
        // Storage full or unavailable: the form still works, just without a draft.
    }
};

export const clearDraft = (key) => {
    try {
        localStorage.removeItem(key);
    } catch {
        // no-op
    }
};
