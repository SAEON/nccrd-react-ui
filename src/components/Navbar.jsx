import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Search, UserPlus, FilePlus, FolderOpen, ClipboardCheck, BarChart3, UserCheck } from 'lucide-react';
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
        <header className="site-header">
            <div className="container site-header-inner">
                <Link to="/" className="brand" aria-label="NCCRD home">
                    <img
                        src="/dffe-logo.jpg"
                        className="brand-logo"
                        alt="Department of Forestry, Fisheries and the Environment, Republic of South Africa"
                    />
                </Link>

                <nav className="site-nav" aria-label="Main">
                    <a href="/" className="site-nav-link" onClick={(e) => { e.preventDefault(); handleSearchData(); }}>
                        <Search size={16} aria-hidden="true" /> Search Data
                    </a>
                    <Link to="/reports" className="site-nav-link">
                        <BarChart3 size={16} aria-hidden="true" /> Data Reports
                    </Link>
                    {isAuthenticated && (
                        <a href="/?mine=1" className="site-nav-link" onClick={handleMySubmissions}>
                            <FolderOpen size={16} aria-hidden="true" /> My Submissions
                        </a>
                    )}
                    {hasPermission('create-submission') && (
                        <Link to="/submission/new" className="site-nav-link">
                            <FilePlus size={16} aria-hidden="true" /> New Submission
                        </Link>
                    )}
                    {isReviewer && (
                        <Link to="/review" className="site-nav-link">
                            <ClipboardCheck size={16} aria-hidden="true" /> Review
                            {awaitingReview > 0 && <span className="nav-count" aria-label={`${awaitingReview} waiting`}>{awaitingReview}</span>}
                        </Link>
                    )}
                    {isAdmin && (
                        <Link to="/admin/registrations" className="site-nav-link">
                            <UserCheck size={16} aria-hidden="true" /> Requests
                            {pendingRequests > 0 && <span className="nav-count" aria-label={`${pendingRequests} waiting`}>{pendingRequests}</span>}
                        </Link>
                    )}
                    {hasPermission('assign-role') && (
                        <Link to="/admin/users/new" className="site-nav-link">
                            <UserPlus size={16} aria-hidden="true" /> Add User
                        </Link>
                    )}
                </nav>

                <div className="site-account">
                    <img src="/flag.svg" alt="South African flag" className="site-flag" />
                    {isAuthenticated ? (
                        <>
                            <span className="site-signed-in">Signed in as <strong>{user.name}</strong></span>
                            <button type="button" className="btn btn-outline site-account-btn" onClick={handleLogout}>Log out</button>
                        </>
                    ) : (
                        <Link to="/login" className="btn btn-outline site-account-btn">Log in</Link>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
