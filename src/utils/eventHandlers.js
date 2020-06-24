const TAB_KEY = 'Tab'
const ENTER_KEY = 'Enter'
// https://stackoverflow.com/questions/3044083/what-is-the-key-code-for-shifttab
function matchesKey(e, key) {
    return e !== null && e.key === key
}

export function enterEvent(e) {
    return matchesKey(e, ENTER_KEY)
}

export function tabBackEvent(e) {
    return e.shiftKey && matchesKey(e, TAB_KEY)
}

export function tabForwardEvent(e) {
    return !e.shiftKey && matchesKey(e, TAB_KEY)
}