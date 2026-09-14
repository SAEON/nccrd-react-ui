import { Link } from 'react-router-dom';

const NotFound = () => (
    <div className="container" style={{ maxWidth: '420px', padding: '4rem 1rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Page not found</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link to="/" className="btn btn-outline">Back to home</Link>
    </div>
);

export default NotFound;
