export function getDateIso(date)
{
    return date.toISOString().substr(0, 10)
}

export function formatDate(date, includeTime)
{
    includeTime = typeof includeDate === "undefined" ? false : includeTime
    return includeTime? date.toString() : date.toDateString()
}