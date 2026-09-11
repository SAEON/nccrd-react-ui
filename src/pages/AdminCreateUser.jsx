import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createUser, getRoles, getTenants } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';

/**
 * Admin-only "create user" form. Gated by the `assign-role` permission —
 * the backend enforces this too (POST /rbac/users), this is just the UI-side
 * redirect so someone without permission doesn't land on a dead-end form.
 *
 * Optionally grants a role on a tenant in the same request as creation,
 * instead of a separate follow-up call.
 */
const AdminCreateUser = () => {
    const { hasPermission, loading } = useCurrentUser();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [roleId, setRoleId] = useState('');
    const [tenantId, setTenantId] = useState('');
    const [roles, setRoles] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [created, setCreated] = useState(null); // { user, temp_password, role_assignment }

    const canAssignRole = hasPermission('assign-role');

    useEffect(() => {
        if (!canAssignRole) return;
        Promise.all([getRoles(), getTenants()])
            .then(([r, t]) => { setRoles(r); setTenants(t); })
            .catch(() => {
                // Listing roles/tenants needs view-roles/view-tenants separately from
                // assign-role — if this admin lacks those, just skip the role picker.
            });
    }, [canAssignRole]);

    if (loading) return null;

    if (!canAssignRole) {
        return (
            <div className="container" style={{ maxWidth: '480px', padding: '4rem 1rem' }}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Add user</h1>
                <p style={{ color: 'var(--text-muted)' }}>
                    You don't have permission to create users. Contact an administrator.
                </p>
                <p style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
                    <Link to="/">Back to home</Link>
                </p>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const roleGrant = roleId && tenantId ? { roleId: Number(roleId), tenantId: Number(tenantId) } : {};
            const data = await createUser(name, email, roleGrant);
            setCreated(data);
            setName('');
            setEmail('');
            setRoleId('');
            setTenantId('');
        } catch (err) {
            setError(err.message || 'Could not create user.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '480px', padding: '4rem 1rem' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Add user</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Creates an account with a one-time temporary password. Share it with the
                new user directly — it can't be retrieved again after this page.
            </p>

            {created && (
                <div
                    role="status"
                    style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius, 6px)',
                        padding: '1rem 1.1rem',
                        marginBottom: '1.5rem',
                    }}
                >
                    <p style={{ margin: 0, fontWeight: 600 }}>{created.user.name} created</p>
                    <p style={{ margin: '0.3rem 0 0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {created.user.email}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Temporary password</p>
                    <code style={{ display: 'block', fontSize: '0.95rem', marginTop: '0.2rem', userSelect: 'all' }}>
                        {created.temp_password}
                    </code>
                    {created.role_assignment ? (
                        <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Role granted on creation.
                        </p>
                    ) : (
                        <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            No role granted — this user can log in but has no permissions yet.
                        </p>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-6">
                    <label className="input-label">Name</label>
                    <input
                        type="text"
                        className="input-field"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="input-label">Email</label>
                    <input
                        type="email"
                        className="input-field"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="off"
                        required
                    />
                </div>

                {roles.length > 0 && tenants.length > 0 && (
                    <>
                        <div className="mb-6">
                            <label className="input-label">Role (optional)</label>
                            <select className="input-field" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                                <option value="">No role — grant later</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                        {roleId && (
                            <div className="mb-6">
                                <label className="input-label">Tenant</label>
                                <select className="input-field" value={tenantId} onChange={(e) => setTenantId(e.target.value)} required>
                                    <option value="" disabled>Select a tenant…</option>
                                    {tenants.map((t) => (
                                        <option key={t.id} value={t.id}>{t.title || t.hostname}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </>
                )}

                {error && (
                    <p role="alert" style={{ color: 'var(--color-danger, #c0392b)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        {error}
                    </p>
                )}
                <button type="submit" className="btn btn-outline" disabled={submitting} style={{ width: '100%' }}>
                    {submitting ? 'Creating…' : 'Create user'}
                </button>
            </form>
            <p style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
                <Link to="/">Back to home</Link>
            </p>
        </div>
    );
};

export default AdminCreateUser;
