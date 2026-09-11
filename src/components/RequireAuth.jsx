import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../context/CurrentUserContext';

/**
 * Redirects to /login if the caller isn't authenticated. This is a UX
 * nicety only — the backend's own Authorize()/RequirePermission checks
 * remain the authoritative enforcement regardless of this component.
 */
const RequireAuth = ({ children }) => {
    const { isAuthenticated, loading } = useCurrentUser();
    const location = useLocation();

    if (loading) return null;

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    return children;
};

export default RequireAuth;
