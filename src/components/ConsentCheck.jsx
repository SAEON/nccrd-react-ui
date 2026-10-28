// ─────────────────────────────────────────────────────────────────────────────
// ConsentCheck — a POPIA consent: what the person agrees to, with a link to
// the privacy notice, ticked by them before the form can be sent.
// ─────────────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const ConsentCheck = ({ id, checked, onChange, required = true, children }) => (
    <div className="consent">
        <ShieldCheck size={18} className="consent-icon" aria-hidden="true" />
        <label htmlFor={id} className="consent-label">
            <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} required={required} />
            <span>
                {children}{' '}
                <Link to="/paia-popia#privacy" target="_blank" rel="noopener noreferrer">Privacy notice</Link>
            </span>
        </label>
    </div>
);

export default ConsentCheck;
