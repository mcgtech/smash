export function getDateIso(date)
{
    return date.toISOString().substr(0, 10)
}