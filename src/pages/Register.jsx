/**
 * Register.jsx — request an account. An administrator approves the request
 * (and grants a role) before the account can log in; see AdminRegistrations.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerAccount } from '../services/api';

const FIELDS = [
    { id: 'name', label: 'Full name', type: 'text', autoComplete: 'name' },
    { id: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
    { id: 'organisation', label: 'Organisation', type: 'text', autoComplete: 'organization' },
    { id: 'password', label: 'Password (at least 8 characters)', type: 'password', autoComplete: 'new-password', minLength: 8 },
    { id: 'confirm', label: 'Confirm password', type: 'password', autoComplete: 'new-password', minLength: 8 },
];

const Register = () => {
    const [form, setForm] = useState({ name: '', email: '', organisation: '', password: '', confirm: '', note: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(null);

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm) {
            setError('The passwords don’t match.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const { confirm, ...body } = form; // eslint-disable-line no-unused-vars
            setDone((await registerAccount(body)).detail);
        } catch (err) {
            setError(err.message || 'Could not send your request.');
        } finally {
            setSubmitting(false);
        }
    };

    if (done) return (
        <div className="container" style={{ maxWidth: '480px', padding: '4rem 1rem' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Request sent</h1>
            <p role="status">{done}</p>
            <p style={{ marginTop: '1.5rem' }}><Link to="/login">Go to log in</Link></p>
        </div>
    );

    return (
        <div className="container" style={{ maxWidth: '480px', padding: '4rem 1rem' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Request an account</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                You need an account to submit projects. An administrator reviews each request; you can log in once yours is approved.
            </p>
            <form onSubmit={handleSubmit}>
                {FIELDS.map(({ id, label, ...input }) => (
                    <div className="mb-6" key={id}>
                        <label className="input-label" htmlFor={`register-${id}`}>{label}</label>
                        <input id={`register-${id}`} className="input-field" value={form[id]} onChange={set(id)} required {...input} />
                    </div>
                ))}
                <div className="mb-6">
                    <label className="input-label" htmlFor="register-note">What will you use the NCCRD for? (optional)</label>
                    <textarea id="register-note" className="input-field" rows={3} value={form.note} onChange={set('note')} maxLength={2000} />
                </div>
                {error && (
                    <p role="alert" style={{ color: 'var(--color-danger, #c0392b)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
                )}
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
                    {submitting ? 'Sending…' : 'Request account'}
                </button>
            </form>
            <p style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
                Already have an account? <Link to="/login">Log in</Link>
            </p>
        </div>
    );
};

export default Register;
