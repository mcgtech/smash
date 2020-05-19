export function getDateIso(date)
{
    return date.toISOString().substr(0, 10)
}

export function formatDate(date)
{
    return date.toDateString()
}