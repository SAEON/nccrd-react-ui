import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getSite } from '../services/api';
import { NATIONAL_SITE, loadPage, provinceParam, provinceSegmentOf, siteFrom, themeVariables } from '../utils/site';
import { SiteContext } from './SiteContext';

/**
 * Loads the current site (GET /site) once and applies its branding: its
 * colours as CSS variables on the page, and its short title as the browser
 * tab's title. Until it answers, or if it can't, pages show the national site.
 * A province site found by its hostname (mccrd.localhost) moves to its
 * province's path (/mpumalanga/…), the one address every site shares.
 */
export const SiteProvider = ({ children }) => {
    const [site, setSite] = useState(NATIONAL_SITE);
    const location = useLocation();

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

    useEffect(() => {
        if (!site.province) return;
        const segment = provinceParam(site.province);
        if (provinceSegmentOf(window.location.pathname) === segment) return;
        // Another basename: a new page load, not a route change.
        const path = location.pathname === '/' ? '' : location.pathname;
        loadPage(`/${segment}${path}${location.search}${location.hash}`);
    }, [site.province, location]);

    return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
};
