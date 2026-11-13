import { useId, Children, cloneElement, isValidElement } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Reusable form-field components to reduce repetition (used by SubmissionForm)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps a single form control with a <label htmlFor>. The wrapped control
 * must accept and forward an `id` prop (native elements do so automatically;
 * TextInput/NestedField/RegionSelect/VocabularySelect are written to forward
 * it below). Falls back to a label-derived id when the control has no `name`
 * (e.g. VocabularySelect), since `name` alone isn't always present/unique.
 */
export const Field = ({ label, required, children }) => {
    const autoId = useId();
    const child = Children.only(children);
    const id = (isValidElement(child) && child.props.name) || autoId;
    return (
        <div>
            <label className="input-label" htmlFor={id}>{label}{required && ' *'}</label>
            {isValidElement(child) ? cloneElement(child, { id }) : child}
        </div>
    );
};

export const TextInput = ({ id, name, value, onChange, placeholder, type = 'text', required }) => (
    <input
        id={id}
        type={type}
        name={name}
        className="input-field"
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
    />
);

/** Text input or textarea bound to a nested object (mitigation_data / adaptation_data). */
export const NestedField = ({ id, section, name, value, onChange, textarea, rows = 3, required }) => {
    const shared = {
        id,
        name,
        className: 'input-field',
        value: value ?? '',
        onChange: (e) => onChange(e, section),
        required,
    };
    return textarea ? <textarea rows={rows} {...shared} /> : <input type="text" {...shared} />;
};

/** Native <select> populated from a { code, name }[] region lookup list. */
export const RegionSelect = ({ id, value, onChange, options, placeholder, disabled, required }) => (
    <select
        id={id}
        className="input-field"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
    >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
            <option key={opt.code} value={opt.code}>{opt.name}</option>
        ))}
    </select>
);

/**
 * Native <select> populated from a { term }[] vocabulary lookup list.
 * `term` is both the option label and the value — Mitigation/Adaptation
 * taxonomy columns store the term text itself, not a separate code.
 * A stored value that doesn't match any current term (legacy free text)
 * simply renders unselected rather than crashing.
 */
/**
 * A dropdown of vocabulary terms (utils/vocabulary.js picks which). Sub-terms
 * are indented under their parent. A stored value that isn't in the list,
 * e.g. free text from the legacy system, stays selected and marked as such,
 * so saving never drops it.
 */
export const VocabularySelect = ({ id, value, onChange, options, placeholder = '-- Select --', required, disabled }) => {
    const top = Math.min(...options.map((opt) => opt.level ?? 1));
    const unlisted = value && options.length > 0 && !options.some((opt) => opt.term === value);
    return (
        <select
            id={id}
            className="input-field"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled && !value}
        >
            <option value="">{placeholder}</option>
            {unlisted && <option value={value}>{value} (not in the list)</option>}
            {options.map((opt) => (
                <option key={opt.id} value={opt.term}>
                    {'\u00a0\u00a0\u00a0'.repeat((opt.level ?? 1) - top)}{opt.term}
                </option>
            ))}
        </select>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Section divider
// ─────────────────────────────────────────────────────────────────────────────
export const SectionHeading = ({ title }) => (
    <div className="col-span-2" style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: 0 }}>{title}</h3>
    </div>
);
