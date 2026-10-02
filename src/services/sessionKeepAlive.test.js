import { describe, it, expect } from 'vitest';
import { shouldRefresh } from './sessionKeepAlive';

const now = Date.UTC(2026, 9, 2, 16, 0);
const min = 60 * 1000;

describe('shouldRefresh', () => {
    it('renews a token near expiry for an active user', () => {
        expect(shouldRefresh({ expiresAt: now + 10 * min, lastActivityAt: now - 5 * min, now })).toBe(true);
    });

    it('leaves a token with plenty of time alone', () => {
        expect(shouldRefresh({ expiresAt: now + 5 * 60 * min, lastActivityAt: now, now })).toBe(false);
    });

    it('lets an idle session expire', () => {
        expect(shouldRefresh({ expiresAt: now + 10 * min, lastActivityAt: now - 2 * 60 * min, now })).toBe(false);
    });

    it('does not try to renew an already expired or missing token', () => {
        expect(shouldRefresh({ expiresAt: now - min, lastActivityAt: now, now })).toBe(false);
        expect(shouldRefresh({ expiresAt: null, lastActivityAt: now, now })).toBe(false);
    });
});
