// HeroCredit — who took the home page photo, under which licence, with links
// to the photo's page and the licence, as Creative Commons licences require.
const HeroCredit = ({ image }) => (
    <p className="hero-credit">
        Photo:{' '}
        <a href={image.source_url} target="_blank" rel="noopener noreferrer">{image.credit}</a>
        {image.license && (
            <>, <a href={image.license_url} target="_blank" rel="noopener noreferrer">{image.license}</a></>
        )}
    </p>
);

export default HeroCredit;
