// Readable names for nccrd.submission.data_source, shared by the review
// queue and the data pipeline page.
export const DATA_SOURCES = {
    sqlserver_legacy: 'Legacy NCCRD',
    gauteng_register_2024: 'Gauteng register 2024',
    wc_project_database_2020: 'Western Cape database 2020',
    react_app: 'Submission form',
};

export const sourceLabel = (dataSource) => DATA_SOURCES[dataSource] || dataSource;
