// ─────────────────────────────────────────────────────────────────────────────
// ProjectMap — where the filtered projects are, one dot per project location
// (a project can list several), coloured by type with a white ring so dots
// stay distinct on any basemap and where they overlap. Hover shows the title;
// clicking opens a popup linking to the project.
//
// Points come from GET /report/locations (see services/api.js), which takes
// the same filters as the project search. Tiles: OpenStreetMap, credited as
// its licence requires.
// ─────────────────────────────────────────────────────────────────────────────
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import { countByType, typeColor } from '../utils/typeColors';

const SOUTH_AFRICA = { center: [-29.0, 24.7], zoom: 5 };

const ProjectMap = ({ projects = [], withoutLocation = 0, height = 440 }) => (
    <div className="project-map">
        <div className="project-map-frame" style={{ height }}>
            <MapContainer
                center={SOUTH_AFRICA.center}
                zoom={SOUTH_AFRICA.zoom}
                minZoom={4}
                scrollWheelZoom={false}
                preferCanvas
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {projects.flatMap((p) => p.points.map(([lat, lon], i) => (
                    <CircleMarker
                        key={`${p.id}-${i}`}
                        center={[lat, lon]}
                        radius={5}
                        pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: typeColor(p.type), fillOpacity: 0.9 }}
                    >
                        <Tooltip direction="top" offset={[0, -4]}>{p.title || 'Untitled project'}</Tooltip>
                        <Popup>
                            <strong>{p.title || 'Untitled project'}</strong>
                            <br />
                            {p.type}
                            <br />
                            <Link to={`/submission/${p.id}`}>View project</Link>
                        </Popup>
                    </CircleMarker>
                )))}
            </MapContainer>
        </div>
        <div className="project-map-legend">
            {countByType(projects).map(([type, n]) => (
                <span key={type} className="project-map-key">
                    <span className="type-dot" style={{ background: typeColor(type) }} aria-hidden="true" />
                    {type} <span className="project-map-count">{n.toLocaleString()}</span>
                </span>
            ))}
            {withoutLocation > 0 && (
                <span className="report-note" style={{ margin: 0 }}>
                    {withoutLocation.toLocaleString()} projects have no recorded location and are not shown.
                </span>
            )}
        </div>
    </div>
);

export default ProjectMap;
