import { createContext, useContext } from 'react';
import { NATIONAL_SITE } from '../utils/site';

// The provider lives in SiteProvider.jsx: keeping components and plain
// exports in separate files lets Vite's fast refresh work for both.
export const SiteContext = createContext(NATIONAL_SITE);

export const useSite = () => useContext(SiteContext);

/** Show a changed site straight away: pass it the site as PUT /site returns it. */
export const SiteUpdateContext = createContext(() => {});

export const useSiteUpdate = () => useContext(SiteUpdateContext);
