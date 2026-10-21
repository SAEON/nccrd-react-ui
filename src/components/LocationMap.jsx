// ─────────────────────────────────────────────────────────────────────────────
// LocationMap — one project's location(s) on a small map, centred on them and
// zoomed to how precise they are (an exact point, or the centre of a
// municipality, district or province, utils/projectDetails.js). Dots use the
// project type's colour, as on the search map. Tiles: OpenStreetMap.
// ─────────────────────────────────────────────────────────────────────────────
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { typeColor } from '../utils/typeColors';

const LocationMap = ({ points, zoom, type, height = 220 }) => {
    const center = points.length === 1
        ? points[0]
        : [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
    return (
        <div className="project-map-frame" style={{ height }}>
            <MapContainer
                center={center}
                zoom={points.length > 1 ? Math.min(zoom, 6) : zoom}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {points.map((p) => (
                    <CircleMarker
                        key={p.join(',')}
                        center={p}
                        radius={7}
                        pathOptions={{ color: '#ffffff', weight: 2, fillColor: typeColor(type), fillOpacity: 0.9 }}
                    />
                ))}
            </MapContainer>
        </div>
    );
};

export default LocationMap;
