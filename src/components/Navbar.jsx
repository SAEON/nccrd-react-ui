import { Link, useNavigate } from 'react-router-dom';
import { Search, UserPlus, Activity } from 'lucide-react';
import { useCurrentUser } from '../context/CurrentUserContext';

const Navbar = () => {
    const navigate = useNavigate();
    const { user, hasPermission, isAuthenticated, logout } = useCurrentUser();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

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
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <nav className="nav-links">
                        <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); handleSearchData(); }}>
                            <Search size={14} /> SEARCH DATA
                        </a>
                        {hasPermission('create-submission') && (
                            <Link to="/submission/new" className="nav-link">
                                <Activity size={14} /> NEW SUBMISSION
                            </Link>
                        )}
                        {hasPermission('assign-role') && (
                            <Link to="/admin/users/new" className="nav-link">
                                <UserPlus size={14} /> ADD USER
                            </Link>
                        )}
                    </nav>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: '1rem', borderLeft: '1px solid var(--border-light)', paddingLeft: '1.5rem' }}>
                        <img src="/flag.svg" alt="South African Flag" style={{ height: '24px', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                        {isAuthenticated ? (
                            <>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                    Signed in as <strong>{user.name}</strong>
                                </span>
                                <button
                                    className="btn btn-outline"
                                    onClick={handleLogout}
                                    style={{ fontSize: '0.75rem', gap: '0.4rem' }}
                                >
                                    LOG OUT
                                </button>
                            </>
                        ) : (
                            <Link to="/login" className="btn btn-outline" style={{ fontSize: '0.75rem', gap: '0.4rem' }}>
                                LOG IN
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
