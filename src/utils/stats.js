/** Long periods by week: the days in sevens, counted back from the last day. */
export const byWeek = (days) => {
    const weeks = [];
    for (let end = days.length; end > 0; end -= 7) {
        const week = days.slice(Math.max(0, end - 7), end);
        weeks.unshift({
            day: week[0].day,
            views: week.reduce((n, d) => n + d.views, 0),
            downloads: week.reduce((n, d) => n + d.downloads, 0),
        });
    }
    return weeks;
};
