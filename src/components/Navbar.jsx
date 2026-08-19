import { Link, useNavigate } from 'react-router-dom';
import { Search, PlusCircle, Download, UserCircle, Activity, FileText } from 'lucide-react';
import { useCurrentUser } from '../context/CurrentUserContext';

const Navbar = () => {
    const navigate = useNavigate();
    const { user, tenant, hasPermission } = useCurrentUser();

    /**
     * If the project-directory section exists in the DOM we're already on the
     * Home page — scroll there directly.  Otherwise navigate to "/" first and
     * wait two animation frames for React to render the page before scrolling.
     */
    const handleSearchData = () => {
        const el = document.getElementById('project-directory');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        } else {
            navigate('/');
            requestAnimationFrame(() =>
                requestAnimationFrame(() =>
                    document.getElementById('project-directory')?.scrollIntoView({ behavior: 'smooth' })
                )
            );
        }
    };

    return (
        <header className="top-banner">
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="logo-lockup">
                        <img src="/dffe-logo.jpg" alt="National Coat of Arms" style={{ height: '60px' }} />
                        <div className="dept-text">
                            Department: <span>Forestry, Fisheries and the Environment</span> REPUBLIC OF SOUTH AFRICA
                        </div>
                    </div>
                    <div className="nccrd-brand">{tenant?.title || ''}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <nav className="nav-links">
                        <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); document.getElementById('project-directory')?.scrollIntoView({ behavior: 'smooth' }); }}>
                            <Search size={14} /> SEARCH DATA
                        </a>
                        {hasPermission('create-submission') && (
                            <Link to="/submission/new" className="nav-link">
                                <Activity size={14} /> NEW SUBMISSION
                            </Link>
                        )}
                        <a href="#" className="nav-link">
                            <FileText size={14} /> DOWNLOAD TEMPLATE
                        </a>
                    </nav>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: '1rem', borderLeft: '1px solid var(--border-light)', paddingLeft: '1.5rem' }}>
                        <img src="/flag.svg" alt="South African Flag" style={{ height: '24px', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                        {user ? (
                            <span
                                title="Auth bypass is active — all actions are attributed to this account until real login is wired up."
                                style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}
                            >
                                Signed in as <strong>{user.name}</strong> (dev)
                            </span>
                        ) : (
                            <span title="Coming Soon — authentication is not yet available" style={{ cursor: 'not-allowed' }}>
                                <button
                                    className="btn btn-outline"
                                    disabled
                                    aria-disabled="true"
                                    style={{ fontSize: '0.75rem', gap: '0.4rem', opacity: 0.6, cursor: 'not-allowed', pointerEvents: 'none' }}
                                >
                                    LOG IN / SIGN UP
                                </button>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
