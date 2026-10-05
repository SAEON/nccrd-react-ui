// Legend for the by-type charts: a colour dot beside each type name.
import { typeColor } from '../../utils/typeColors';

const SeriesLegend = ({ series }) => (
    <div className="series-legend">
        {series.map((s) => (
            <span key={s} className="project-map-key">
                <span className="type-dot" style={{ background: typeColor(s) }} aria-hidden="true" /> {s}
            </span>
        ))}
    </div>
);

export default SeriesLegend;
