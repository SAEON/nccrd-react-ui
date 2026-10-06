/**
 * CSV downloads for report charts: each panel offers its numbers as a file.
 * A UTF-8 BOM lets Excel open names with accents correctly.
 */
const cell = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows) => rows.map((r) => r.map(cell).join(',')).join('\r\n');

/** [header, ...rows] for a simple { label, count } list. */
export const listCsv = (labelHeader, valueHeader, rows) =>
    [[labelHeader, valueHeader], ...rows.map((r) => [r.label, r.count])];

/** [header, ...rows] for a by-type table ({ series, rows: [{ label, values }] }). */
export const byTypeCsv = (labelHeader, data) => [
    [labelHeader, ...data.series, 'Total'],
    ...data.rows.map((r) => {
        const values = data.series.map((s) => r.values[s] || 0);
        return [r.label, ...values, values.reduce((a, b) => a + b, 0)];
    }),
];

export const downloadCsv = (filename, rows) => {
    const url = URL.createObjectURL(new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};
