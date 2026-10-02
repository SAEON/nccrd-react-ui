/**
 * Persists the JWT access token in localStorage (survives a page refresh;
 * cleared on logout or when the backend rejects the token as expired/invalid).
 */

const TOKEN_KEY = 'nccrd_access_token';

export const getToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

export const setToken = (token) => {
    try {
        localStorage.setItem(TOKEN_KEY, token);
    } catch {
        // localStorage unavailable (private browsing, etc.) — session just won't persist.
    }
};

export const clearToken = () => {
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch {
        // no-op
    }
};

/**
 * Expiry of the stored token in epoch milliseconds, read from its `exp`
 * claim (no signature check — the backend remains the authority), or null.
 */
export const getTokenExpiry = () => {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
};
