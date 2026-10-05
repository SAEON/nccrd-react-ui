/**
 * InfoPage.jsx — About, Terms of Use, PAIA & POPIA and Licence.
 *
 * About / Terms / PAIA render DFFE's published text from content/infoPages.js
 * verbatim. The licence page describes this rebuild's own licensing, which
 * differs from the legacy site's (MIT, DFFE).
 */
import { Link } from 'react-router-dom';
import { INFO_PAGES } from '../content/infoPages';

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

const PAGES = {
    about: { title: 'About the NCCRD' },
    'terms-of-use': { title: 'Terms of Use' },
    'paia-popia': {
        title: 'PAIA & POPIA',
        subtitle: 'Promotion of Access to Information Act (PAIA) and Protection of Personal Information Act (POPIA)',
        extra: (
            <>
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

const InfoPage = ({ page }) => {
    const { title, subtitle, content, extra } = PAGES[page];
    return (
        <article className="container info-page">
            <h1>{title}</h1>
            {subtitle && <p className="info-subtitle">{subtitle}</p>}
            {content ?? INFO_PAGES[page].map((block, i) => <Block key={i} block={block} />)}
            {extra}
        </article>
    );
};

export default InfoPage;
