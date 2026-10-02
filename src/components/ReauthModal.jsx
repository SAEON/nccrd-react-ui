// ─────────────────────────────────────────────────────────────────────────────
// ReauthModal — log back in over the page when the session has expired, so
// whatever the user was working on (e.g. a half-filled form) stays put.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCurrentUser } from '../context/CurrentUserContext';

const ReauthModal = ({ email: initialEmail = '', onSuccess, onCancel }) => {
    const { login } = useCurrentUser();
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            await login(email, password);
            onSuccess();
        } catch (err) {
            setError(err.message || 'Could not log in.');
            setSubmitting(false);
        }
    };

    // Portalled to <body> for the same reason as BulkUploadModal: an animated
    // ancestor would otherwise become the containing block for position: fixed.
    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reauth-title"
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <form className="glass-panel" onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
                <h2 id="reauth-title" style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Your session has expired</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Log in again to save. Your changes are still here.
                </p>
                <div className="mb-6">
                    <label className="input-label" htmlFor="reauth-email">Email</label>
                    <input
                        id="reauth-email"
                        type="email"
                        className="input-field"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="input-label" htmlFor="reauth-password">Password</label>
                    <input
                        id="reauth-password"
                        type="password"
                        className="input-field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        autoFocus
                        required
                    />
                </div>
                {error && (
                    <p role="alert" style={{ color: 'var(--color-danger, #c0392b)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        {error}
                    </p>
                )}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
                        {submitting ? 'Logging in…' : 'Log in and save'}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={onCancel} disabled={submitting}>
                        Not now
                    </button>
                </div>
            </form>
        </div>,
        document.body
    );
};

export default ReauthModal;
