export default function handle_db_error(e, msg, code)
{
    let alertMsg = typeof code === "undefined" ? msg : msg + ' Code: ' + code
    alert(alertMsg)
}