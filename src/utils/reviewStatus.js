/**
 * Review states of a submission, mirroring the API's REVIEW_STATUS_CONDITIONS
 * (nccrd/api/routers/submission.py). Only "published" projects are public;
 * the others are visible to their owner and to reviewers.
 */
export const REVIEW_STATES = {
    published: { label: 'Published', tone: 'good' },
    awaiting_review: { label: 'Awaiting review', tone: 'warning' },
    not_accepted: { label: 'Not accepted', tone: 'critical' },
    draft: { label: 'Draft', tone: 'neutral' },
};

/** @returns {'published'|'awaiting_review'|'not_accepted'|'draft'} */
export const reviewState = (submission) => {
    const status = (submission?.submission_status || 'Pending').trim().toLowerCase();
    if (status === 'not accepted') return 'not_accepted';
    if (!submission?.issubmitted) return 'draft';
    return status === 'accepted' ? 'published' : 'awaiting_review';
};

/** Permissions that make someone a curator: edit anyone's projects without sending them back to review. */
export const CURATOR_PERMISSIONS = ['update-submission', 'validate-submission', 'change-submission-owner'];

export const isCurator = (hasPermission) => CURATOR_PERMISSIONS.some((p) => hasPermission(p));

/** Owners edit their own projects; curators edit anyone's. */
export const canEditSubmission = (submission, user, hasPermission) =>
    isCurator(hasPermission) || (!!user && submission?.createdby === user.id);
