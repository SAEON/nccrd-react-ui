import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Home, Search, UserPlus, FilePlus, FolderOpen, ClipboardCheck, BarChart3, UserCheck, LogIn, LogOut, CircleUser } from 'lucide-react';
import { useCurrentUser } from '../context/CurrentUserContext';
import { useSite } from '../context/SiteContext';
import { NATIONAL_SITE } from '../utils/site';
import { getReviewCounts, getRegistrations } from '../services/api';

const DFFE_LOGO_ALT = 'Department of Forestry, Fisheries and the Environment, Republic of South Africa';

/** If a site's image is missing, show the national one instead of a broken image. */
const fallBackTo = (src, alt) => (e) => {
    if (e.currentTarget.getAttribute('src') !== src) Object.assign(e.currentTarget, { src, alt });
};

const Navbar = () => {
    const navigate = useNavigate();
    const site = useSite();
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
            {/* Masthead: DFFE (and the province's emblem), the site's name, the account and the flag. */}
            <div className="container site-masthead">
                <Link to="/" className="brand" aria-label={`${site.short_title} home`}>
                    <img src="/dffe-logo.jpg" className="brand-logo" alt={DFFE_LOGO_ALT} />
                    {/* DFFE runs every site; a province site adds its own emblem. */}
                    {site.logo_url && (
                        <img
                            src={site.logo_url}
                            className="brand-emblem"
                            alt={site.province ? `Coat of arms of ${site.province}` : `${site.title} emblem`}
                            onError={(e) => { e.currentTarget.hidden = true; }}
                        />
                    )}
                </Link>
                <Link to="/" className="site-title">{site.title}</Link>
                <div className="site-masthead-end">
                    <div className="site-account">
                        {isAuthenticated ? (
                            <>
                                <span className="site-signed-in">
                                    <CircleUser size={15} aria-hidden="true" />
                                    <span className="sr-only">Signed in as </span>
                                    <strong>{user.name}</strong>
                                </span>
                                <button type="button" className="site-account-btn" onClick={handleLogout}>
                                    Log out <LogOut size={14} aria-hidden="true" />
                                </button>
                            </>
                        ) : (
                            <Link to="/login" className="site-account-btn">
                                Log in <LogIn size={14} aria-hidden="true" />
                            </Link>
                        )}
                    </div>
                    <img
                        src={site.flag_url}
                        alt={site.flag_url === NATIONAL_SITE.flag_url ? 'South African flag' : `${site.province} flag`}
                        className="site-flag"
                        onError={fallBackTo(NATIONAL_SITE.flag_url, 'South African flag')}
                    />
                </div>
            </div>

            {/* A slim bar in the site's colour with the pages. */}
            <div className="site-navbar">
                <div className="container site-navbar-inner">
                    <nav className="site-nav" aria-label="Main">
                        <Link to="/" className="site-nav-link">
                            <Home size={15} aria-hidden="true" /> Home
                        </Link>
                        <a href="/" className="site-nav-link" onClick={(e) => { e.preventDefault(); handleSearchData(); }}>
                            <Search size={15} aria-hidden="true" /> Search Data
                        </a>
                        <Link to="/reports" className="site-nav-link">
                            <BarChart3 size={15} aria-hidden="true" /> Data Reports
                        </Link>
                        {isAuthenticated && (
                            <a href="/?mine=1" className="site-nav-link" onClick={handleMySubmissions}>
                                <FolderOpen size={15} aria-hidden="true" /> My Submissions
                            </a>
                        )}
                        {hasPermission('create-submission') && (
                            <Link to="/submission/new" className="site-nav-link">
                                <FilePlus size={15} aria-hidden="true" /> New Submission
                            </Link>
                        )}
                        {isReviewer && (
                            <Link to="/review" className="site-nav-link">
                                <ClipboardCheck size={15} aria-hidden="true" /> Review
                                {awaitingReview > 0 && <span className="nav-count" aria-label={`${awaitingReview} waiting`}>{awaitingReview}</span>}
                            </Link>
                        )}
                        {isAdmin && (
                            <Link to="/admin/registrations" className="site-nav-link">
                                <UserCheck size={15} aria-hidden="true" /> Requests
                                {pendingRequests > 0 && <span className="nav-count" aria-label={`${pendingRequests} waiting`}>{pendingRequests}</span>}
                            </Link>
                        )}
                        {hasPermission('assign-role') && (
                            <Link to="/admin/users/new" className="site-nav-link">
                                <UserPlus size={15} aria-hidden="true" /> Add User
                            </Link>
                        )}
                    </nav>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
