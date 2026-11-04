import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSite } from '../services/api';
import { NATIONAL_SITE, SITE_PROVINCE_PARAM, provinceParam, siteFrom, themeVariables } from '../utils/site';
import { SiteContext } from './SiteContext';

/**
 * Loads the current site (GET /site) once and applies its branding: its
 * colours as CSS variables on the page, and its short title as the browser
 * tab's title. Until it answers, or if it can't, pages show the national site.
 * A province site's pages keep ?siteprovince=<province> in their URL, so a
 * reloaded or shared address opens the same site on any host.
 */
export const SiteProvider = ({ children }) => {
    const [site, setSite] = useState(NATIONAL_SITE);
    const location = useLocation();
    const navigate = useNavigate();

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
        const params = new URLSearchParams(location.search);
        if (params.get(SITE_PROVINCE_PARAM) === provinceParam(site.province)) return;
        params.set(SITE_PROVINCE_PARAM, provinceParam(site.province));
        navigate({ pathname: location.pathname, search: `?${params}`, hash: location.hash }, { replace: true, state: location.state });
    }, [site.province, location, navigate]);

    return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
};
