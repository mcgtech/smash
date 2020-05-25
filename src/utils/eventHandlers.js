const TAB_KEY = 9
const ENTER_KEY = 13
function matchesKey(e, key) {
    return (e.keyCode === key || e.which === key)
}

export function enterEvent(e) {
    return matchesKey(e, ENTER_KEY)
}

export function tabEvent(e) {
    return matchesKey(e, TAB_KEY)
}