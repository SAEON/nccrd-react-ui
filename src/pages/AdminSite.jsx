/**
 * AdminSite.jsx — a site's admin edits its names, contact address, colour,
 * About texts and images (permission edit-site). Changes show at once:
 * the page passes the saved site to the SiteProvider.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { removeSiteImage, updateSite, uploadSiteImage } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import { useSite, useSiteUpdate } from '../context/SiteContext';
import { NATIONAL_SITE } from '../utils/site';

/** The About page's sections, in its order, with what each is for. */
const SECTIONS = [
    ['about', 'Welcome', 'What the site is and who runs it.'],
    ['context', 'Climate change here', 'The region’s climate risks and responses.'],
    ['explore', 'Explore the projects', 'What visitors can find and do.'],
    ['submit', 'Submit a project', 'Who should submit, and why.'],
];

const IMAGES = [
    ['logo', 'Emblem', 'Shown beside the DFFE logo, e.g. the coat of arms.', 'Remove'],
    ['flag', 'Flag', 'Shown on the right of the header; without one, the South African flag.', 'Remove'],
    ['hero', 'Front-page photo', 'Behind the search on the home page. A wide landscape photo works best.', 'Use the default photo'],
];

const imageOf = (site, kind) => (kind === 'hero' ? site.hero_image?.url : site[`${kind}_url`]);

const Field = ({ id, label, hint, children }) => (
    <div className="mb-6">
        <label className="input-label" htmlFor={id}>{label}</label>
        {children}
        {hint && <p className="field-hint">{hint}</p>}
    </div>
);

const SiteSettings = () => {
    const site = useSite();
    const applySite = useSiteUpdate();
    const [form, setForm] = useState(() => ({
        title: site.title,
        short_title: site.short_title,
        contact_email: site.contact_email,
        colour: site.theme?.['accent-primary'] || '#1c3d2f',
        sections: Object.fromEntries(SECTIONS.map(([key, title]) => [
            key, { title: site.front_matter?.[key]?.title || title, content: site.front_matter?.[key]?.content || '' },
        ])),
        hero_credit: {
            credit: site.hero_image?.credit || '', license: site.hero_image?.license || '',
            source_url: site.hero_image?.source_url || '', license_url: site.hero_image?.license_url || '',
        },
    }));
    const [saving, setSaving] = useState(false);
    const [busyImage, setBusyImage] = useState(null);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
    const setSection = (key, field) => (e) => setForm((f) => ({
        ...f, sections: { ...f.sections, [key]: { ...f.sections[key], [field]: e.target.value } },
    }));
    const setCredit = (field) => (e) => setForm((f) => ({ ...f, hero_credit: { ...f.hero_credit, [field]: e.target.value } }));

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setMessage(null);
        try {
            const blankToNull = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.trim() || null]));
            applySite(await updateSite({ ...form, hero_credit: blankToNull(form.hero_credit) }));
            setMessage('Saved. The site shows the changes now.');
        } catch (err) {
            setError(Array.isArray(err.detail) ? 'Check the highlighted values: a colour like #1c3d2f, a valid email address, and links that start with http.' : err.message);
        } finally {
            setSaving(false);
        }
    };

    const changeImage = async (kind, file) => {
        setBusyImage(kind);
        setError(null);
        setMessage(null);
        try {
            applySite(await (file ? uploadSiteImage(kind, file) : removeSiteImage(kind)));
            setMessage(file ? 'Image uploaded.' : 'Image removed.');
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyImage(null);
        }
    };

    return (
        <div className="container reviews-page site-settings" style={{ paddingBlock: '2rem 4rem' }}>
            <Link to="/" className="report-back"><ArrowLeft size={16} /> Back to projects</Link>
            <header>
                <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>Site settings</h1>
                <p className="report-lede">
                    How the {site.short_title} presents itself: its names, contact address, colour, images and the
                    texts on its <Link to="/about">About page</Link>. Changes show as soon as you save.
                </p>
            </header>

            {message && <div role="status" className="glass-panel review-note review-note-published">{message}</div>}
            {error && <div role="alert" className="glass-panel report-error">{error}</div>}

            <form onSubmit={save} className="site-settings-form">
                <section className="glass-panel site-settings-panel">
                    <h2>Names and contact</h2>
                    <Field id="site-title" label="Full name" hint="In the header, e.g. Mpumalanga Climate Change Response Database.">
                        <input id="site-title" className="input-field" value={form.title} onChange={set('title')} maxLength={200} required />
                    </Field>
                    <Field id="site-short-title" label="Short name" hint="In the browser tab and in emails, e.g. MCCRD.">
                        <input id="site-short-title" className="input-field" value={form.short_title} onChange={set('short_title')} maxLength={20} required />
                    </Field>
                    <Field id="site-contact" label="Contact email address" hint="Shown to visitors, and in emails to people whose account request was not approved.">
                        <input id="site-contact" type="email" className="input-field" value={form.contact_email} onChange={set('contact_email')} maxLength={200} required />
                    </Field>
                    <Field id="site-colour" label="Main colour" hint="The header bar, buttons and links. Pick a dark colour so white text stays readable.">
                        <div className="site-colour">
                            <input id="site-colour" type="color" value={form.colour} onChange={set('colour')} />
                            <code>{form.colour}</code>
                        </div>
                    </Field>
                </section>

                <section className="glass-panel site-settings-panel">
                    <h2>About page</h2>
                    <p className="field-hint">Plain text. Leave a blank line between paragraphs. A section with no text is not shown.</p>
                    {SECTIONS.map(([key, name, hint]) => (
                        <fieldset key={key} className="site-section">
                            <legend>{name}</legend>
                            <p className="field-hint">{hint}</p>
                            <Field id={`section-${key}-title`} label="Heading">
                                <input id={`section-${key}-title`} className="input-field" value={form.sections[key].title} onChange={setSection(key, 'title')} maxLength={200} required />
                            </Field>
                            <Field id={`section-${key}-content`} label="Text">
                                <textarea id={`section-${key}-content`} className="input-field" rows={6} value={form.sections[key].content} onChange={setSection(key, 'content')} maxLength={6000} />
                            </Field>
                        </fieldset>
                    ))}
                </section>

                <section className="glass-panel site-settings-panel">
                    <h2>Front-page photo credit</h2>
                    <p className="field-hint">Shown on the photo. Needed for photos from Wikimedia Commons and other free sources.</p>
                    <div className="site-credit-grid">
                        <Field id="credit-credit" label="Photographer or source">
                            <input id="credit-credit" className="input-field" value={form.hero_credit.credit} onChange={setCredit('credit')} maxLength={200} />
                        </Field>
                        <Field id="credit-license" label="Licence" hint="e.g. CC BY-SA 4.0">
                            <input id="credit-license" className="input-field" value={form.hero_credit.license} onChange={setCredit('license')} maxLength={100} />
                        </Field>
                        <Field id="credit-source" label="Link to the photo">
                            <input id="credit-source" type="url" className="input-field" value={form.hero_credit.source_url} onChange={setCredit('source_url')} maxLength={500} placeholder="https://…" />
                        </Field>
                        <Field id="credit-license-url" label="Link to the licence">
                            <input id="credit-license-url" type="url" className="input-field" value={form.hero_credit.license_url} onChange={setCredit('license_url')} maxLength={500} placeholder="https://…" />
                        </Field>
                    </div>
                </section>

                <div className="site-settings-save">
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                </div>
            </form>

            <section className="glass-panel site-settings-panel">
                <h2>Images</h2>
                <p className="field-hint">PNG, JPEG or WebP, up to 3 MB. Each one changes as soon as you upload it.</p>
                <div className="site-images">
                    {IMAGES.map(([kind, name, hint, removeLabel]) => {
                        const current = imageOf(site, kind);
                        const isDefault = kind === 'hero' ? current === NATIONAL_SITE.hero_image.url : !current || current === NATIONAL_SITE[`${kind}_url`];
                        return (
                            <div key={kind} className="site-image">
                                <h3>{name}</h3>
                                <p className="field-hint">{hint}</p>
                                <div className={`site-image-preview site-image-${kind}`}>
                                    {current ? <img src={current} alt={`Current ${name.toLowerCase()}`} /> : <span>None</span>}
                                </div>
                                <label className="btn btn-outline site-image-upload">
                                    {busyImage === kind ? 'Uploading…' : 'Upload'}
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="sr-only"
                                        aria-label={`Upload a new ${name.toLowerCase()}`}
                                        disabled={busyImage !== null}
                                        onChange={(e) => { const file = e.target.files[0]; e.target.value = ''; if (file) changeImage(kind, file); }}
                                    />
                                </label>
                                {!isDefault && (
                                    <button type="button" className="btn btn-outline" disabled={busyImage !== null} onClick={() => changeImage(kind, null)}>
                                        {removeLabel}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

const AdminSite = () => {
    const { hasPermission, loading: authLoading } = useCurrentUser();
    const site = useSite();

    if (authLoading) return null;
    if (!hasPermission('edit-site')) return (
        <div className="container" style={{ paddingBlock: '2rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid #ef4444' }}>
                <h3 style={{ color: '#b91c1c' }}>Site administrators only</h3>
                <p>You need the edit-site permission to change this site.</p>
            </div>
        </div>
    );
    // Until GET /site answers, the context holds the national defaults: don't edit those.
    if (!site.hostname) return <div className="container" style={{ paddingBlock: '2rem' }}><p className="report-empty">Loading…</p></div>;
    return <SiteSettings key={site.hostname} />;
};

export default AdminSite;
