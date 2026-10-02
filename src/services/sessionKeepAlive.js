/**
 * Keeps an active user's session alive past the fixed token lifetime.
 *
 * The token is renewed when it is close to expiring *and* the user has done
 * something recently. A tab left idle still expires normally; if that happens
 * mid-capture, the form's draft and re-login prompt cover it.
 */
export const CHECK_INTERVAL_MS = 60 * 1000;
export const REFRESH_WINDOW_MS = 60 * 60 * 1000; // renew within the last hour
export const ACTIVE_WITHIN_MS = 60 * 60 * 1000;  // ...if active in the last hour

export const shouldRefresh = ({ expiresAt, lastActivityAt, now }) =>
    expiresAt !== null
    && expiresAt > now
    && expiresAt - now < REFRESH_WINDOW_MS
    && now - lastActivityAt < ACTIVE_WITHIN_MS;
