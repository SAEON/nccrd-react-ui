import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Search, UserPlus, Activity, FolderOpen, ClipboardCheck, BarChart3, UserCheck } from 'lucide-react';
import { useCurrentUser } from '../context/CurrentUserContext';
import { getReviewCounts, getRegistrations } from '../services/api';

const Navbar = () => {
    const navigate = useNavigate();
    const { user, hasPermission, isAuthenticated, logout } = useCurrentUser();
    const isReviewer = hasPermission('validate-submission');
    const [awaitingReview, setAwaitingReview] = useState(null);
    const isAdmin = hasPermission('assign-role');
    const [pendingRequests, setPendingRequests] = useState(null);

    // Admins see how many account requests are waiting.
    useEffect(() => {
        if (!isAdmin) return;
        getRegistrations('pending')
            .then((list) => setPendingRequests(list.length))
            .catch((err) => console.warn('[NCCRD] Could not load account requests.', err));
    }, [isAdmin]);

    // Reviewers see how many submissions are waiting.
    useEffect(() => {
        if (!isReviewer) return;
        getReviewCounts()
            .then((counts) => setAwaitingReview(counts.awaiting_review))
            .catch((err) => console.warn('[NCCRD] Could not load review counts.', err));
    }, [isReviewer]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    /**
     * If the project-directory section exists in the DOM we're already on the
     * Home page — scroll there directly.  Otherwise navigate to "/" first and
     * wait two animation frames for React to render the page before scrolling.
     */
    /** Open the project list filtered to the user's own submissions (Home reads `?mine=1`). */
    const handleMySubmissions = (e) => {
        e.preventDefault();
        navigate('/?mine=1');
    };

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
            <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="logo-lockup">
                        <img src="/dffe-logo.jpg" alt="National Coat of Arms" style={{ height: '60px' }} />
                        <div className="dept-text">
                            Department: <span>Forestry, Fisheries and the Environment</span> REPUBLIC OF SOUTH AFRICA
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem 2rem' }}>
                    <nav className="nav-links">
                        <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); handleSearchData(); }}>
                            <Search size={14} /> SEARCH DATA
                        </a>
                        <Link to="/reports" className="nav-link">
                            <BarChart3 size={14} /> DATA REPORTS
                        </Link>
                        {isAuthenticated && (
                            <a href="/?mine=1" className="nav-link" onClick={handleMySubmissions}>
                                <FolderOpen size={14} /> MY SUBMISSIONS
                            </a>
                        )}
                        {hasPermission('create-submission') && (
                            <Link to="/submission/new" className="nav-link">
                                <Activity size={14} /> NEW SUBMISSION
                            </Link>
                        )}
                        {isReviewer && (
                            <Link to="/review" className="nav-link">
                                <ClipboardCheck size={14} /> REVIEW
                                {awaitingReview > 0 && <span className="nav-count" aria-label={`${awaitingReview} waiting`}>{awaitingReview}</span>}
                            </Link>
                        )}
                        {isAdmin && (
                            <Link to="/admin/registrations" className="nav-link">
                                <UserCheck size={14} /> REQUESTS
                                {pendingRequests > 0 && <span className="nav-count" aria-label={`${pendingRequests} waiting`}>{pendingRequests}</span>}
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
