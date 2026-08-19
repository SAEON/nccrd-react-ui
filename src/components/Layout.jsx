import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
    const location = useLocation();
    const isHome = location.pathname === '/';

    return (
        <div className="flex-col w-full min-h-screen">
            {!isHome && <Navbar />}
            <main className="page-wrapper animate-fade-in">
                <Outlet />
            </main>
            <footer style={{
                padding: '3rem 0',
                background: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border-light)',
                color: 'var(--text-secondary)'
            }}>
                <div className="container" style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        &copy; {new Date().getFullYear()} National Climate Change Response Database. Powered by Open Data Platform.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
