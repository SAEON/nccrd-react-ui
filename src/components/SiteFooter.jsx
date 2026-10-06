// ─────────────────────────────────────────────────────────────────────────────
// SiteFooter — quick links, legal pages, contacts and source code, matching
// the legacy site's footer.
// ─────────────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom';

const SiteFooter = () => (
    <footer className="site-footer">
        <div className="container site-footer-grid">
            <nav aria-label="Quick links">
                <h2>Quick links</h2>
                <ul>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/about">About</Link></li>
                    <li><Link to="/reports">Data reports</Link></li>
                    <li><Link to="/submission/new">Contribute</Link></li>
                    <li><a href="/#project-directory">Search data</a></li>
                    <li><Link to="/login">Log in</Link></li>
                </ul>
            </nav>
            <nav aria-label="Legal">
                <h2>Legal</h2>
                <ul>
                    <li><Link to="/terms-of-use">Terms of Use</Link></li>
                    <li><Link to="/paia-popia">PAIA &amp; POPIA</Link></li>
                    <li><Link to="/license">Licence</Link></li>
                </ul>
            </nav>
            <section aria-label="Contact us">
                <h2>Contact us</h2>
                <p>Website and technical feedback<br /><a className="site-footer-address" href="mailto:n.bingani@saeon.nrf.ac.za">n.bingani@saeon.nrf.ac.za</a></p>
                <p>Data enquiries<br /><a className="site-footer-address" href="mailto:nccrd@environment.gov.za">nccrd@environment.gov.za</a></p>
            </section>
            <section aria-label="Source code">
                <h2>Source code</h2>
                <ul>
                    <li><a href="https://github.com/SAEON/nccrd-react-ui" target="_blank" rel="noopener noreferrer">Web interface</a></li>
                    <li><a href="https://github.com/SAEON/nccrd-server" target="_blank" rel="noopener noreferrer">Server</a></li>
                </ul>
            </section>
        </div>
        <p className="site-footer-copy">
            © DFFE 2020–{new Date().getFullYear()} · National Climate Change Response Database · Powered by Open Data Platform
        </p>
    </footer>
);

export default SiteFooter;
