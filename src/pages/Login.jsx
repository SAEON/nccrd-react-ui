import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCurrentUser } from '../context/CurrentUserContext';
import { useSite } from '../context/SiteContext';

const Login = () => {
    const { login } = useCurrentUser();
    const navigate = useNavigate();
    const site = useSite();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const from = location.state?.from || '/';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const data = await login(email, password);
            if (data.must_change_password) {
                navigate('/change-password', { replace: true, state: { from } });
            } else {
                navigate(from, { replace: true });
            }
        } catch (err) {
            setError(err.message || 'Login failed.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container form-card" style={{ maxWidth: '26.25rem' }}>
            <h1>Log in</h1>
            <p className="form-lede">Log in to submit projects and follow your submissions on the {site.short_title}.</p>
            <form onSubmit={handleSubmit}>
                <div className="mb-6">
                    <label className="input-label" htmlFor="login-email">Email</label>
                    <input
                        id="login-email"
                        type="email"
                        className="input-field"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="input-label" htmlFor="login-password">Password</label>
                    <input
                        id="login-password"
                        type="password"
                        className="input-field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                    <p style={{ fontSize: '0.85rem', marginTop: '0.4rem', textAlign: 'right' }}>
                        <Link to="/forgot-password" state={{ email }}>Forgot your password?</Link>
                    </p>
                </div>
                {error && (
                    <p role="alert" style={{ color: 'var(--color-danger, #c0392b)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        {error}
                    </p>
                )}
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
                    {submitting ? 'Logging in…' : 'Log in'}
                </button>
            </form>
            <p className="form-foot">
                No account yet? <Link to="/register">Request one</Link> · <Link to="/">Back to home</Link>
            </p>
        </div>
    );
};

export default Login;
