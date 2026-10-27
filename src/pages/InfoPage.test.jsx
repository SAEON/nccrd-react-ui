import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InfoPage from './InfoPage';
import { SiteContext } from '../context/SiteContext';
import { siteFrom } from '../utils/site';

const renderPage = (page) => render(<MemoryRouter><InfoPage page={page} /></MemoryRouter>);

describe('InfoPage', () => {
    it('renders the About text with links into this app', () => {
        renderPage('about');
        expect(screen.getByRole('heading', { level: 1, name: 'About the NCCRD' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Welcome to the National Climate Change Response Database' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Submit a new project' })).toHaveAttribute('href', '/submission/new');
    });

    it('renders a province site’s own About texts', () => {
        const site = siteFrom({
            short_title: 'MCCRD',
            front_matter: {
                about: { title: 'Welcome to the Mpumalanga Climate Change Response Database', content: 'The platform is developed…' },
                explore: { title: 'Explore climate mitigation and adaptation projects', content: 'The MCCRD is part of…' },
            },
        });
        render(<MemoryRouter><SiteContext.Provider value={site}><InfoPage page="about" /></SiteContext.Provider></MemoryRouter>);
        expect(screen.getByRole('heading', { level: 1, name: 'About the MCCRD' })).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
            'Welcome to the Mpumalanga Climate Change Response Database',
            'Explore climate mitigation and adaptation projects',
        ]);
        expect(screen.queryByText(/National Climate Change Response Database/)).not.toBeInTheDocument();
    });

    it('renders the full Terms of Use, including the owner’s address on separate lines', () => {
        const { container } = renderPage('terms-of-use');
        expect(screen.getByRole('heading', { name: '8. Information about website and owner' })).toBeInTheDocument();
        expect(container.textContent).toContain('Private Bag X447');
        expect(container.querySelectorAll('br').length).toBeGreaterThan(3);
    });

    it('links the PAIA manual directly and explains browser storage', () => {
        renderPage('paia-popia');
        expect(screen.getByRole('link', { name: /PAIA and POPIA manuals/ }))
            .toHaveAttribute('href', 'https://www.dffe.gov.za/sites/default/files/legislations/paia.popi_manual2021april.pdf');
        expect(screen.getByRole('heading', { name: 'How this website stores information' })).toBeInTheDocument();
    });

    it('states the rebuild’s actual licence', () => {
        renderPage('license');
        expect(screen.getByText(/GNU Affero General Public License as published/)).toBeInTheDocument();
    });
});
