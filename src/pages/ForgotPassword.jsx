import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { requestPasswordReset } from '../services/api';

/** Ask for a link to set a new password; the email address comes over from the login form. */
const ForgotPassword = () => {
    const location = useLocation();
    const [email, setEmail] = useState(location.state?.email || '');
    const [done, setDone] = useState(null);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const { detail } = await requestPasswordReset(email.trim());
            setDone(detail);
        } catch (err) {
            setError(err.message || 'Could not send the link. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (done) return (
        <div className="container form-card" style={{ maxWidth: '26.25rem' }}>
            <h1>Check your email</h1>
            <p role="status">{done}</p>
            <p className="form-foot"><Link to="/login">Back to log in</Link></p>
        </div>
    );

    return (
        <div className="container form-card" style={{ maxWidth: '26.25rem' }}>
            <h1>Forgot your password?</h1>
            <p className="form-lede">Enter your email address and we&apos;ll send you a link to set a new password.</p>
            <form onSubmit={handleSubmit}>
                <div className="mb-6">
                    <label className="input-label" htmlFor="forgot-email">Email</label>
                    <input
                        id="forgot-email"
                        type="email"
                        className="input-field"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        required
                    />
                </div>
                {error && (
                    <p role="alert" style={{ color: 'var(--color-danger, #c0392b)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        {error}
                    </p>
                )}
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
                    {submitting ? 'Sending…' : 'Send link'}
                </button>
            </form>
            <p className="form-foot"><Link to="/login">Back to log in</Link></p>
        </div>
    );
};

export default ForgotPassword;
