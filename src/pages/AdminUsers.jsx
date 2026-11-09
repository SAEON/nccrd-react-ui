/**
 * AdminUsers.jsx — the people with accounts and their roles (permission
 * assign-role). An admin of the national site sees everyone and manages
 * roles on every site; a province site's admin sees the people with a role
 * on their site and finds anyone else by their full email address. Each
 * admin can only give roles whose permissions they have themselves.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, UserPlus, UserCheck, X } from 'lucide-react';
import { assignRole, getGrants, getUsers, revokeRole } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import { useSite } from '../context/SiteContext';
import { roleLabel } from '../utils/roles';

const formatDate = (iso) => new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

const GiveRole = ({ person, grants, onGive, busy }) => {
    // Chosen here, else the defaults: the choices may arrive after the people do.
    const [chosenRole, setRoleId] = useState('');
    const [chosenSite, setSiteId] = useState('');
    if (!grants.roles.length || !grants.sites.length) return null;
    const defaultRole = grants.roles.find((r) => r.name === 'contributor') ?? grants.roles[0];
    const roleId = chosenRole || defaultRole.id;
    const siteId = chosenSite || grants.sites[0].id;
    const role = grants.roles.find((r) => r.id === Number(roleId));

    return (
        <form
            className="registration-actions"
            onSubmit={(e) => { e.preventDefault(); onGive(person, Number(roleId), Number(siteId)); }}
        >
            <label className="sr-only" htmlFor={`give-role-${person.id}`}>Role for {person.name}</label>
            <select
                id={`give-role-${person.id}`}
                className="input-field"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                title={role?.description ?? undefined}
                style={{ width: 'auto' }}
            >
                {grants.roles.map((r) => <option key={r.id} value={r.id}>{roleLabel(r.name)}</option>)}
            </select>
            {grants.sites.length > 1 && (
                <>
                    <label className="sr-only" htmlFor={`give-site-${person.id}`}>Site for {person.name}</label>
                    <select
                        id={`give-site-${person.id}`}
                        className="input-field"
                        value={siteId}
                        onChange={(e) => setSiteId(e.target.value)}
                        style={{ width: 'auto' }}
                    >
                        {grants.sites.map((s) => <option key={s.id} value={s.id}>on {s.name}</option>)}
                    </select>
                </>
            )}
            <button type="submit" className="btn btn-outline" disabled={busy}>Give role</button>
        </form>
    );
};

const AdminUsers = () => {
    const { user: me, hasPermission, loading: authLoading } = useCurrentUser();
    const site = useSite();
    const canManage = hasPermission('assign-role');
    const [query, setQuery] = useState('');
    const [searched, setSearched] = useState('');
    const [people, setPeople] = useState(null);
    const [grants, setGrants] = useState({ sites: [], roles: [] });
    const [busy, setBusy] = useState(null);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const national = grants.sites.some((s) => s.is_default);

    useEffect(() => {
        if (!canManage) return;
        getGrants().then(setGrants).catch((err) => setError(err.message));
    }, [canManage]);

    const load = useCallback((q) => {
        setPeople(null);
        getUsers(q).then(setPeople).catch((err) => { setPeople([]); setError(err.message); });
    }, []);

    useEffect(() => {
        if (canManage) load(searched);
    }, [canManage, searched, load]);

    const replace = (updated) => setPeople((list) => list.map((p) => (p.id === updated.id ? updated : p)));

    const give = async (person, roleId, siteId) => {
        setBusy(person.id);
        setError(null);
        setMessage(null);
        try {
            const assignment = await assignRole(person.id, roleId, siteId);
            const role = grants.roles.find((r) => r.id === roleId);
            const where = grants.sites.find((s) => s.id === siteId);
            if (!person.roles.some((r) => r.id === assignment.id)) {
                replace({ ...person, roles: [...person.roles, { id: assignment.id, role_id: roleId, role: role.name, tenant_id: siteId, site: where.name }] });
            }
            setMessage(`${person.name} is now ${roleLabel(role.name).toLowerCase()} on ${where.name}.`);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(null);
        }
    };

    const takeAway = async (person, assignment) => {
        setBusy(person.id);
        setError(null);
        setMessage(null);
        try {
            await revokeRole(person.id, assignment.id);
            replace({ ...person, roles: person.roles.filter((r) => r.id !== assignment.id) });
            setMessage(`${person.name} is no longer ${roleLabel(assignment.role).toLowerCase()} on ${assignment.site}.`);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(null);
        }
    };

    if (authLoading) return null;
    if (!canManage) return (
        <div className="container" style={{ paddingBlock: '2rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid #ef4444' }}>
                <h3 style={{ color: '#b91c1c' }}>Administrators only</h3>
                <p>You need the assign-role permission to manage people&apos;s roles.</p>
            </div>
        </div>
    );

    return (
        <div className="container reviews-page" style={{ paddingBlock: '2rem 4rem' }}>
            <Link to="/" className="report-back"><ArrowLeft size={16} /> Back to projects</Link>
            <header>
                <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>People</h1>
                <p className="report-lede">
                    {national
                        ? 'Everyone with an account, and their roles. A role on the national site applies on every site; a role on a province site applies there only.'
                        : `People with a role on the ${site.short_title}. To give someone else a role, search for their full email address.`}
                </p>
            </header>

            <div className="people-tools">
                <form role="search" className="results-search" onSubmit={(e) => { e.preventDefault(); setSearched(query); }}>
                    <label className="sr-only" htmlFor="people-search">Search people</label>
                    <Search size={18} className="results-search-icon" aria-hidden="true" />
                    <input
                        id="people-search"
                        type="search"
                        className="input-field"
                        placeholder={national ? 'Search by name or email…' : 'Name, or a full email address…'}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">Search</button>
                </form>
                <div className="people-links">
                    <Link to="/admin/users/new" className="btn btn-outline"><UserPlus size={15} aria-hidden="true" /> Add a person</Link>
                    <Link to="/admin/registrations" className="btn btn-outline"><UserCheck size={15} aria-hidden="true" /> Account requests</Link>
                </div>
            </div>

            {message && <div role="status" className="glass-panel review-note review-note-published">{message}</div>}
            {error && <div role="alert" className="glass-panel report-error">{error}</div>}

            {people === null ? (
                <p className="report-empty">Loading…</p>
            ) : people.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p className="report-empty">
                        {searched ? `No one found for “${searched}”.` : 'No one has a role here yet.'}
                        {searched && !national && ' Outside this site, search for the full email address.'}
                    </p>
                </div>
            ) : (
                <ul className="review-list" aria-label="People">
                    {people.map((p) => (
                        <li key={p.id} className="glass-panel registration-row">
                            <div className="review-row-main">
                                <strong>{p.name}</strong>
                                <span className="review-row-meta">
                                    {[p.email, p.organisation, p.last_login ? `last logged in ${formatDate(p.last_login)}` : 'never logged in'].filter(Boolean).join(' · ')}
                                </span>
                                <ul className="role-chips" aria-label={`${p.name}'s roles`}>
                                    {p.roles.length === 0 && <li className="role-chip role-chip-none">No role</li>}
                                    {p.roles.map((r) => (
                                        <li key={r.id} className="role-chip">
                                            {roleLabel(r.role)}{national && ` · ${r.site}`}
                                            {p.id !== me?.id && (
                                                <button
                                                    type="button"
                                                    className="role-chip-remove"
                                                    aria-label={`Take away ${roleLabel(r.role).toLowerCase()} on ${r.site} from ${p.name}`}
                                                    disabled={busy === p.id}
                                                    onClick={() => takeAway(p, r)}
                                                >
                                                    <X size={13} aria-hidden="true" />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <GiveRole person={p} grants={grants} onGive={give} busy={busy === p.id} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AdminUsers;
