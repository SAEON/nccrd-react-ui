import { useEffect, useState } from 'react';
import { getSite } from '../services/api';
import { NATIONAL_SITE, siteFrom, themeVariables } from '../utils/site';
import { SiteContext } from './SiteContext';

/**
 * Loads the current site (GET /site) once and applies its branding: its
 * colours as CSS variables on the page, and its short title as the browser
 * tab's title. Until it answers, or if it can't, pages show the national site.
 */
export const SiteProvider = ({ children }) => {
    const [site, setSite] = useState(NATIONAL_SITE);

    useEffect(() => {
        getSite()
            .then((data) => setSite(siteFrom(data)))
            .catch((err) => console.warn('[NCCRD] Could not load the site; showing the national one.', err));
    }, []);

    useEffect(() => {
        const style = document.documentElement.style;
        const variables = themeVariables(site.theme);
        variables.forEach(([name, value]) => style.setProperty(name, value));
        document.title = site.short_title;
        return () => variables.forEach(([name]) => style.removeProperty(name));
    }, [site]);

    return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
};
