import { createContext, useContext } from 'react';

// The provider lives in CurrentUserProvider.jsx: keeping components and plain
// exports in separate files lets Vite's fast refresh work for both.
export const CurrentUserContext = createContext({
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

export const useCurrentUser = () => useContext(CurrentUserContext);
