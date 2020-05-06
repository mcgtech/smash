export function getPageCount(totalRows, pageSize) {
    return  Math.ceil(totalRows / pageSize)
}