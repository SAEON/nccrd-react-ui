import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/api';

/** The emailed link's token, from the address's #token=… part. */
const tokenOf = (hash) => new URLSearchParams(hash.replace(/^#/, '')).get('token');

/**
 * Set a new password from an emailed link, /reset-password#token=…. The token
 * sits after the #, so it never reaches a server log; it is also taken out
 * of the address bar once read.
 */
const ResetPassword = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [token] = useState(() => tokenOf(location.hash));
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [done, setDone] = useState(null);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (location.hash) navigate(location.pathname, { replace: true });
    }, [location.hash, location.pathname, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('The passwords don’t match.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const { detail } = await resetPassword(token, newPassword);
            setDone(detail);
        } catch (err) {
            setError(err.message || 'Could not set the password.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!token) return (
        <div className="container form-card" style={{ maxWidth: '26.25rem' }}>
            <h1>Set a new password</h1>
            <p role="alert">This link is incomplete. Open the link from the email again, or ask for a new one.</p>
            <p className="form-foot"><Link to="/forgot-password">Ask for a new link</Link></p>
        </div>
    );

    if (done) return (
        <div className="container form-card" style={{ maxWidth: '26.25rem' }}>
            <h1>Password set</h1>
            <p role="status">{done}</p>
            <p className="form-foot"><Link to="/login">Log in</Link></p>
        </div>
    );

    return (
        <div className="container form-card" style={{ maxWidth: '26.25rem' }}>
            <h1>Set a new password</h1>
            <p className="form-lede">Choose a password of at least 8 characters.</p>
            <form onSubmit={handleSubmit}>
                <div className="mb-6">
                    <label className="input-label" htmlFor="reset-new-password">New password</label>
                    <input
                        id="reset-new-password"
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
                    <label className="input-label" htmlFor="reset-confirm-password">Confirm new password</label>
                    <input
                        id="reset-confirm-password"
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
                        {/expired|already been used/.test(error) && (
                            <> <Link to="/forgot-password">Ask for a new link</Link>.</>
                        )}
                    </p>
                )}
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
                    {submitting ? 'Saving…' : 'Set password'}
                </button>
            </form>
        </div>
    );
};

export default ResetPassword;
