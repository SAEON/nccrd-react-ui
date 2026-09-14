import { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { changePassword } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';

/**
 * Forced password-change step, shown right after login when the backend
 * signals `must_change_password` (legacy-activated users with a temporary
 * password, or any user resetting their password on request).
 */
const ChangePassword = () => {
    const { isAuthenticated, loading } = useCurrentUser();
    const navigate = useNavigate();
    const location = useLocation();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const from = location.state?.from || '/';

    // Must check loading first — CurrentUserContext starts with
    // isAuthenticated: false until GET /rbac/me resolves, so checking
    // isAuthenticated alone would bounce a genuinely logged-in user (landing
    // here right after a forced-password-change login) to /login during that
    // brief window. Mirrors RequireAuth.jsx's correct pattern, including the
    // declarative <Navigate/> instead of an imperative navigate() call
    // during render (which React warns against).
    if (loading) return null;
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await changePassword(currentPassword, newPassword);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || 'Could not change password.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '420px', padding: '4rem 1rem' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Set a new password</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                You&apos;re using a temporary password. Set a new one to continue.
            </p>
            <form onSubmit={handleSubmit}>
                <div className="mb-6">
                    <label className="input-label" htmlFor="current-password">Current (temporary) password</label>
                    <input
                        id="current-password"
                        type="password"
                        className="input-field"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="input-label" htmlFor="new-password">New password</label>
                    <input
                        id="new-password"
                        type="password"
                        className="input-field"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="input-label" htmlFor="confirm-password">Confirm new password</label>
                    <input
                        id="confirm-password"
                        type="password"
                        className="input-field"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                        required
                    />
                </div>
                {error && (
                    <p role="alert" style={{ color: 'var(--color-danger, #c0392b)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        {error}
                    </p>
                )}
                <button type="submit" className="btn btn-outline" disabled={submitting} style={{ width: '100%' }}>
                    {submitting ? 'Saving…' : 'Set password'}
                </button>
            </form>
        </div>
    );
};

export default ChangePassword;
