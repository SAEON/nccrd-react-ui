// ─────────────────────────────────────────────────────────────────────────────
// DownloadProjectButton — downloads one project as an Excel file (same columns
// as the bulk export). `compact` renders an icon button for result cards.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadExport } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import { singleProjectParams } from '../utils/submissionQuery';

const DownloadProjectButton = ({ submission, compact = false }) => {
    const { user, hasPermission } = useCurrentUser();
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    const download = async () => {
        setBusy(true);
        setFailed(false);
        try {
            await downloadExport(singleProjectParams(submission, {
                isOwner: !!user && submission.createdby === user.id,
                isReviewer: hasPermission('validate-submission'),
            }), 'xlsx');
        } catch (err) {
            console.error(err);
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };

    const label = failed ? 'Download failed, try again' : `Download ${submission.title || 'this project'} as Excel`;
    return compact ? (
        <button type="button" className="btn btn-outline icon-button" onClick={download} disabled={busy} title={label} aria-label={label}>
            <Download size={18} color={failed ? '#b91c1c' : 'var(--accent-primary)'} />
        </button>
    ) : (
        <button
            type="button"
            className="btn btn-outline flex items-center gap-2"
            onClick={download}
            disabled={busy}
            title={failed ? label : 'Download this project as an Excel file'}
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}
        >
            <Download size={15} /> {busy ? 'Preparing…' : failed ? 'Retry download' : 'Download'}
        </button>
    );
};

export default DownloadProjectButton;
