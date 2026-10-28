/**
 * InfoPage.jsx — About, Terms of Use, PAIA & POPIA and Licence.
 *
 * About / Terms / PAIA render DFFE's published text from content/infoPages.js
 * verbatim; a province site with its own About texts (GET /site) shows those
 * instead. The licence page describes this rebuild's own licensing, which
 * differs from the legacy site's (MIT, DFFE).
 */
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { INFO_PAGES } from '../content/infoPages';
import { useSite } from '../context/SiteContext';

const isInternal = (href) => href.startsWith('/');

const Segment = ({ seg }) => {
    if (typeof seg === 'string') {
        const lines = seg.split('\n');
        return lines.map((line, i) => (i ? [<br key={i} />, line] : line));
    }
    return isInternal(seg.href)
        ? <Link to={seg.href}>{seg.text}</Link>
        : <a href={seg.href} target="_blank" rel="noopener noreferrer">{seg.text}</a>;
};

const Inline = ({ content }) => content.map((seg, i) => <Segment key={i} seg={seg} />);

const Block = ({ block }) => {
    const { type } = block;
    if (type === 'ul' || type === 'ol') {
        const List = type;
        return <List>{block.items.map((item, i) => <li key={i}><Inline content={item} /></li>)}</List>;
    }
    if (type === 'link') {
        return isInternal(block.href)
            ? <p><Link to={block.href} className="btn btn-outline">{block.text}</Link></p>
            : <p><a href={block.href} className="btn btn-outline">{block.text}</a></p>;
    }
    const Tag = type;
    return <Tag><Inline content={block.content} /></Tag>;
};

const SERVER_REPO = 'https://github.com/SAEON/nccrd-server';
const UI_REPO = 'https://github.com/SAEON/nccrd-react-ui';

const LicenceContent = () => (
    <>
        <p>
            The NCCRD server (API and database code) is free software, copyright © 2025 South African Environmental
            Observation Network (SAEON). You can redistribute it and/or modify it under the terms of the GNU Affero
            General Public License as published by the Free Software Foundation, either version 3 of the License, or
            (at your option) any later version.
        </p>
        <p>
            It is distributed in the hope that it will be useful, but without any warranty; without even the implied
            warranty of merchantability or fitness for a particular purpose. See the GNU Affero General Public License
            for more details.
        </p>
        <ul>
            <li><a href={`${SERVER_REPO}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">GNU Affero General Public License v3.0 (full text)</a></li>
            <li><a href={SERVER_REPO} target="_blank" rel="noopener noreferrer">NCCRD server source code</a></li>
            <li><a href={UI_REPO} target="_blank" rel="noopener noreferrer">NCCRD web interface source code</a></li>
        </ul>
        <p>Project data published on this website is subject to the <Link to="/terms-of-use">Terms of Use</Link>.</p>
    </>
);

/**
 * The privacy notice (POPIA section 18): who holds which personal information
 * and why, who sees it, and people's rights. The consent boxes on sign-up,
 * the project form and bulk upload link here (/paia-popia#privacy).
 */
const PrivacyNotice = ({ site }) => (
    <section id="privacy">
        <h2>Privacy notice: the personal information we hold</h2>
        <p>
            The Department of Forestry, Fisheries and the Environment (DFFE) is responsible for the personal information
            in the {site.title}. The South African Environmental Observation Network (SAEON) runs the website on
            DFFE&apos;s behalf.
        </p>
        <h3>What we collect, and why</h3>
        <ul>
            <li>
                <strong>Your account:</strong> your name, email address and organisation, a password (stored only in a
                form that cannot be read back), and what you tell us when you request an account. We use them to run
                your account, review your request, and credit the projects you submit.
            </li>
            <li>
                <strong>Project contacts:</strong> the name, organisation, email address and phone number of each
                project&apos;s manager. We use them to verify the project and follow up on its progress. Whoever submits
                a project confirms that its manager has agreed to this.
            </li>
        </ul>
        <h3>Who sees it</h3>
        <p>
            A project manager&apos;s name and organisation are published with the project. Their email address and
            phone number are seen only by the person who submitted the project and DFFE&apos;s reviewers, and are left
            out of downloads. Account details are seen only by the website&apos;s administrators. We do not sell
            personal information or share it outside government, except where the law requires it.
        </p>
        <h3>Is it required?</h3>
        <p>
            Using the database is voluntary. Without these details we cannot open an account for you, or accept a
            project for review.
        </p>
        <h3>How long we keep it</h3>
        <p>
            Account details are kept while your account is in use. Project contacts are kept with the project, as
            part of the record of South Africa&apos;s climate change responses.
        </p>
        <h3>Your rights</h3>
        <p>
            You may ask to see the personal information we hold about you, and ask us to correct or delete it, or
            object to how we use it: write to{' '}
            <a href={`mailto:${site.contact_email}`}>{site.contact_email}</a>. You may also complain to the{' '}
            <a href="https://inforegulator.org.za/" target="_blank" rel="noopener noreferrer">Information Regulator</a>.
        </p>
    </section>
);

const PAGES = {
    about: { title: 'About the NCCRD' },
    'terms-of-use': { title: 'Terms of Use' },
    'paia-popia': {
        title: 'PAIA & POPIA',
        subtitle: 'Promotion of Access to Information Act (PAIA) and Protection of Personal Information Act (POPIA)',
        extra: (site) => (
            <>
                <PrivacyNotice site={site} />
                <h2>How this website stores information</h2>
                <p>
                    This website does not use cookies or visitor tracking. When you log in, your session is kept in your
                    browser’s local storage on your own device, along with any unsaved drafts of a project you are
                    capturing. Logging out removes the session; a draft stays until you save it or discard it.
                </p>
            </>
        ),
    },
    license: { title: 'Licence', content: <LicenceContent /> },
};

/** A site's own About texts: the legacy sites' three, with the province's own
 *  section on climate change there (context) after the welcome. */
const FRONT_MATTER_SECTIONS = ['about', 'context', 'explore', 'submit'];

const FrontMatter = ({ sections }) => FRONT_MATTER_SECTIONS
    .filter((key) => sections[key]?.content)
    .map((key) => (
        <section key={key}>
            <h2>{sections[key].title}</h2>
            <p>{sections[key].content}</p>
        </section>
    ));

const InfoPage = ({ page }) => {
    const site = useSite();
    const { hash } = useLocation();

    // Links such as /paia-popia#privacy open on that section.
    useEffect(() => {
        if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    }, [hash]);

    const { title, subtitle, content, extra } = page === 'about' && site.front_matter
        ? { title: `About the ${site.short_title}`, content: <FrontMatter sections={site.front_matter} /> }
        : PAGES[page];
    return (
        <article className="container info-page">
            <h1>{title}</h1>
            {subtitle && <p className="info-subtitle">{subtitle}</p>}
            {content ?? INFO_PAGES[page].map((block, i) => <Block key={i} block={block} />)}
            {typeof extra === 'function' ? extra(site) : extra}
        </article>
    );
};

export default InfoPage;
