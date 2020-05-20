const INC_REFRESH_MSG = 'Please refresh the page and try again.'

export default function handle_error(e, msg, incRefresh, code)
{
    if (incRefresh)
        msg += ' ' + INC_REFRESH_MSG
    let alertMsg = typeof code === "undefined" ? msg : msg + ' Code: ' + code
    if (e !== null)
    {
        alertMsg += ' Details: ' + e.stack
    }
    alert(alertMsg)
}

export function handle_db_error(e, msg, incRefresh, code)
{
    handle_error(e, msg, incRefresh, code)
}
