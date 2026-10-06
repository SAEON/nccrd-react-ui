import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import SiteFooter from './SiteFooter';

const Layout = () => {
    const location = useLocation();
    const isHome = location.pathname === '/';

    return (
        <div className="flex-col w-full min-h-screen">
            {!isHome && <Navbar />}
            <main className="page-wrapper animate-fade-in">
                <Outlet />
            </main>
            <SiteFooter />
        </div>
    );
};

export default Layout;
