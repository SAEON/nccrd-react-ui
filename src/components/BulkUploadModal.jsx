import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { uploadBulkSubmissions } from '../services/api';
import { Upload, UploadCloud, X, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// BulkUploadModal — drag-and-drop Excel import dialog (used by Home)
// ─────────────────────────────────────────────────────────────────────────────

const BulkUploadModal = ({ onClose, onSuccess }) => {
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    // result: null | { type: 'success', message } | { type: 'error', message, errors[] }
    const [result, setResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = (f) => {
        if (!f) return;
        if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
            setResult({ type: 'error', message: 'Only .xlsx or .xls files are accepted.', errors: [] });
            return;
        }
        setFile(f);
        setResult(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setResult(null);
        try {
            const data = await uploadBulkSubmissions(file);
            setResult({ type: 'success', message: data.detail || 'Upload successful.' });
            onSuccess();
        } catch (err) {
            const detail = err.detail;
            if (detail && typeof detail === 'object' && Array.isArray(detail.errors)) {
                setResult({ type: 'error', message: detail.message, errors: detail.errors });
            } else {
                setResult({ type: 'error', message: err.message || 'Upload failed.', errors: [] });
            }
        } finally {
            setUploading(false);
        }
    };

    return createPortal(
        /* Backdrop — click outside to close.
         * Rendered via a portal straight into document.body: Layout.jsx's
         * <main className="animate-fade-in"> uses a `forwards`-fill CSS
         * animation, which leaves a permanent (non-"none") `transform` on
         * that ancestor once it finishes. Per the CSS spec that makes it a
         * containing block for `position: fixed` descendants, so without
         * the portal this backdrop would size itself to <main>'s full
         * scrollable height (thousands of pixels once real data loads)
         * instead of the viewport. */
        <div
            onClick={(e) => e.target === e.currentTarget && onClose()}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
            }}
        >
            {/* Dialog panel */}
            <div className="glass-panel animate-fade-in" style={{
                width: '100%', maxWidth: '640px',
                padding: '2rem', position: 'relative',
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: '0.25rem',
                    }}
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                <h2 style={{ marginBottom: '0.5rem' }}>
                    <Upload size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                    Bulk Upload Submissions
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Upload a consolidated <strong>.xlsx</strong> workbook with sheets:
                    &ldquo;General project details&rdquo;, &ldquo;Adaptation details&rdquo; (optional),
                    &ldquo;Mitigation details&rdquo; (optional). Row 1 must contain column headers.
                    All rows are validated before any record is saved.
                </p>

                {/* Drop zone */}
                <div
                    role="button"
                    tabIndex={0}
                    aria-label="Upload .xlsx file: drag and drop, or activate to browse"
                    onClick={() => fileRef.current?.click()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            fileRef.current?.click();
                        }
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    style={{
                        border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '2.5rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                        background: dragOver ? 'rgba(28,61,47,0.08)' : 'transparent',
                        marginBottom: '1.25rem',
                    }}
                >
                    <UploadCloud size={36} color="var(--accent-primary)" style={{ margin: '0 auto 0.75rem' }} />
                    {file
                        ? <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</p>
                        : <>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                Drag &amp; drop your <strong>.xlsx</strong> file here
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>or click to browse</p>
                        </>
                    }
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFile(e.target.files[0])}
                    />
                </div>

                {/* Success feedback */}
                {result?.type === 'success' && (
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        padding: '1rem', borderRadius: 'var(--radius-md)',
                        background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
                        marginBottom: '1rem',
                    }}>
                        <CheckCircle2 size={20} color="#34d399" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                        <p style={{ color: '#34d399', margin: 0 }}>{result.message}</p>
                    </div>
                )}

                {/* Error feedback — with optional per-row validation table */}
                {result?.type === 'error' && (
                    <div style={{
                        padding: '1rem', borderRadius: 'var(--radius-md)',
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                        marginBottom: '1rem',
                    }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: result.errors.length ? '1rem' : 0 }}>
                            <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                            <p style={{ color: '#f87171', margin: 0 }}>{result.message}</p>
                        </div>

                        {result.errors.length > 0 && (
                            <div style={{ maxHeight: '220px', overflowY: 'auto', borderRadius: 'var(--radius-sm)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
                                            <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: '#f87171' }}>Row</th>
                                            <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: '#f87171' }}>Column</th>
                                            <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: '#f87171' }}>Value</th>
                                            <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: '#f87171' }}>Issue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.errors.map((err, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '0.4rem 0.6rem' }}>{err.row ?? '—'}</td>
                                                <td style={{ padding: '0.4rem 0.6rem' }}>{err.column ?? '—'}</td>
                                                <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'monospace' }}>{String(err.value ?? '')}</td>
                                                <td style={{ padding: '0.4rem 0.6rem' }}>{err.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {uploading
                            ? <><Activity size={16} style={{ animation: 'pulse 1.5s infinite' }} /> Uploading…</>
                            : <><UploadCloud size={16} /> Upload</>
                        }
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BulkUploadModal;
