// ─────────────────────────────────────────────────────────────────────────────
// Review status for a project page.
//
//   – ReviewStatusNote: tells the owner (or a reviewer) why a project isn't
//     public yet, including the reviewer's reason when it wasn't accepted.
//   – ReviewPanel: reviewers accept the project (publishing it) or mark it
//     not accepted with a reason the submitter will see.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import { reviewSubmission } from '../services/api';
import { reviewState } from '../utils/reviewStatus';

const NOTES = {
    awaiting_review: 'Waiting for review. Only you and reviewers can see this project until it is accepted.',
    not_accepted: 'Not accepted, so only you and reviewers can see it. Edit the project to address the comments below; saving sends it back for review.',
    draft: 'Draft: not submitted for review yet. Only you and reviewers can see it.',
};

export const ReviewStatusNote = ({ submission }) => {
    const state = reviewState(submission);
    if (state === 'published') return null;
    return (
        <div role="status" className={`glass-panel review-note review-note-${state}`}>
            <p style={{ margin: 0 }}>{NOTES[state]}</p>
            {submission.submission_comments && (
                <blockquote className="review-comments">
                    {submission.submission_comments}
                    {submission.reviewed_by && <footer>{submission.reviewed_by}, reviewer</footer>}
                </blockquote>
            )}
        </div>
    );
};

export const ReviewPanel = ({ submission, onReviewed }) => {
    const [comments, setComments] = useState('');
    const [saving, setSaving] = useState(null);
    const [error, setError] = useState(null);
    const published = reviewState(submission) === 'published';

    const decide = async (decision) => {
        if (decision === 'Not accepted' && !comments.trim()) {
            setError('Give a reason so the submitter knows what to fix.');
            return;
        }
        setSaving(decision);
        setError(null);
        try {
            await reviewSubmission(submission.id, decision, comments);
            setComments('');
            onReviewed(decision);
        } catch (err) {
            setError(err.message || 'Could not save the review.');
        } finally {
            setSaving(null);
        }
    };

    return (
        <section className="glass-panel review-panel" aria-labelledby="review-panel-title">
            <h3 id="review-panel-title" style={{ margin: 0 }}>Review</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {published
                    ? 'This project is published. Marking it not accepted removes it from the public site.'
                    : 'Accepting publishes this project on the public site.'}
            </p>
            <label className="input-label" htmlFor="review-comments" style={{ marginBottom: 0 }}>
                Comments for the submitter <span style={{ textTransform: 'none', fontWeight: 400 }}>(required if not accepting)</span>
            </label>
            <textarea
                id="review-comments"
                className="input-field"
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
            />
            {error && <p role="alert" style={{ color: '#b91c1c', margin: 0, fontSize: '0.85rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {!published && (
                    <button type="button" className="btn btn-primary" disabled={!!saving} onClick={() => decide('Accepted')}>
                        <CircleCheck size={16} /> {saving === 'Accepted' ? 'Accepting…' : 'Accept and publish'}
                    </button>
                )}
                <button
                    type="button"
                    className="btn btn-outline"
                    disabled={!!saving}
                    onClick={() => decide('Not accepted')}
                    style={{ color: '#b91c1c', borderColor: 'rgba(220,38,38,0.35)' }}
                >
                    <CircleX size={16} /> {saving === 'Not accepted' ? 'Saving…' : 'Not accept'}
                </button>
            </div>
        </section>
    );
};
