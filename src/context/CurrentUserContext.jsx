import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser } from '../services/api';

const CurrentUserContext = createContext({
    user: null,
    tenant: null,
    roles: [],
    permissions: [],
    loading: true,
    error: null,
    hasPermission: () => false,
});

/**
 * Fetches GET /rbac/me once on mount and makes the caller's resolved
 * identity, tenant, and permissions available app-wide.
 *
 * `hasPermission` returns false while loading and on error (fail-hidden) —
 * gated UI stays hidden rather than flashing in and then disappearing.
 */
export const CurrentUserProvider = ({ children }) => {
    const [state, setState] = useState({
        user: null,
        tenant: null,
        roles: [],
        permissions: [],
        loading: true,
        error: null,
    });

    useEffect(() => {
        (async () => {
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
                console.warn('[NCCRD] Could not resolve current user/tenant — permission-gated UI will stay hidden.', err);
                setState((prev) => ({ ...prev, loading: false, error: err.message }));
            }
        })();
    }, []);

    const hasPermission = (name) => state.permissions.includes(name);

    return (
        <CurrentUserContext.Provider value={{ ...state, hasPermission }}>
            {children}
        </CurrentUserContext.Provider>
    );
};

export const useCurrentUser = () => useContext(CurrentUserContext);
