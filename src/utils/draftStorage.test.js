import { describe, it, expect, beforeEach } from 'vitest';
import { draftKey, loadDraft, saveDraft, clearDraft } from './draftStorage';

describe('draftStorage', () => {
    beforeEach(() => localStorage.clear());

    it('keys drafts per user and per submission', () => {
        expect(draftKey(7, undefined)).toBe('nccrd_draft:7:new');
        expect(draftKey(7, 'abc')).not.toBe(draftKey(8, 'abc'));
    });

    it('round-trips a draft and clears it', () => {
        const key = draftKey(1, 'abc');
        saveDraft(key, { title: 'Half done' }, '2026-10-02T09:00:00');
        expect(loadDraft(key)).toMatchObject({ data: { title: 'Half done' }, baseUpdatedate: '2026-10-02T09:00:00' });
        clearDraft(key);
        expect(loadDraft(key)).toBeNull();
    });

    it('treats corrupt storage as no draft', () => {
        localStorage.setItem('nccrd_draft:1:new', '{not json');
        expect(loadDraft('nccrd_draft:1:new')).toBeNull();
    });
});
