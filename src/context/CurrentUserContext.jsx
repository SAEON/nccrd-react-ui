import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, login as apiLogin, refreshToken } from '../services/api';
import { getToken, setToken, clearToken, getTokenExpiry } from '../services/authStorage';
import { CHECK_INTERVAL_MS, shouldRefresh } from '../services/sessionKeepAlive';

const CurrentUserContext = createContext({
    user: null,
    tenant: null,
    roles: [],
    permissions: [],
    loading: true,
    error: null,
    isAuthenticated: false,
    hasPermission: () => false,
    login: async () => {},
    logout: () => {},
});

const emptyState = {
    user: null,
    tenant: null,
    roles: [],
    permissions: [],
    loading: false,
    error: null,
};

/**
 * Owns login/logout state and resolves the caller's identity, tenant, and
 * permissions via GET /rbac/me (once on mount if a token is already stored,
 * and again after every login()).
 *
 * `hasPermission` returns false while loading and on error (fail-hidden) —
 * gated UI stays hidden rather than flashing in and then disappearing.
 */
export const CurrentUserProvider = ({ children }) => {
    // Lazy initializer computes the correct starting shape synchronously
    // (loading only when there's actually a token to resolve) instead of
    // always starting at loading:true and having the mount effect
    // synchronously flip it back to false when there's no token — that
    // setState was pure derived state, not a real effect.
    const [state, setState] = useState(() =>
        getToken() ? { ...emptyState, loading: true } : { ...emptyState, loading: false }
    );

    const refreshCurrentUser = async () => {
        try {
            const data = await getCurrentUser();
            setState({
                user: data.user,
                tenant: data.tenant,
                roles: data.roles,
                permissions: data.permissions,
                loading: false,
                error: null,
            });
        } catch (err) {
            // A stale/expired token is already cleared by api.js on 401 —
            // just fall back to the logged-out shape without retrying.
            console.warn('[NCCRD] Could not resolve current user/tenant — permission-gated UI will stay hidden.', err);
            setState({ ...emptyState, error: err.message });
        }
    };

    useEffect(() => {
        if (getToken()) {
            refreshCurrentUser();
        }
    }, []);

    // Renew the token while the user is actively working, so a long capture
    // session never runs into the fixed token lifetime (see sessionKeepAlive.js).
    useEffect(() => {
        if (!state.user) return undefined;
        let lastActivityAt = Date.now();
        const markActive = () => { lastActivityAt = Date.now(); };
        const events = ['keydown', 'pointerdown', 'input', 'scroll'];
        events.forEach((e) => window.addEventListener(e, markActive, { passive: true, capture: true }));

        const timer = setInterval(async () => {
            if (!shouldRefresh({ expiresAt: getTokenExpiry(), lastActivityAt, now: Date.now() })) return;
            try {
                setToken((await refreshToken()).access_token);
            } catch (err) {
                // Expired already: the next save will prompt to log in again.
                console.warn('[NCCRD] Could not renew session.', err);
            }
        }, CHECK_INTERVAL_MS);

        return () => {
            clearInterval(timer);
            events.forEach((e) => window.removeEventListener(e, markActive, { capture: true }));
        };
    }, [state.user]);

    const login = async (email, password) => {
        const data = await apiLogin(email, password);
        setToken(data.access_token);
        await refreshCurrentUser();
        return data;
    };

    const logout = () => {
        clearToken();
        setState({ ...emptyState, loading: false });
    };

    const hasPermission = (name) => state.permissions.includes(name);

    return (
        <CurrentUserContext.Provider
            value={{ ...state, isAuthenticated: !!state.user, hasPermission, login, logout }}
        >
            {children}
        </CurrentUserContext.Provider>
    );
};

export const useCurrentUser = () => useContext(CurrentUserContext);
