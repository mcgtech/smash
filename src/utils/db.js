import React from 'react'
import * as PropTypes from "prop-types"
const INC_REFRESH_MSG = '\nPlease refresh the page and try again.'

const VERSION_NO = "1.0"
export const DB_PUSH = 'push'
export const DB_PULL = 'pull'
// db states
export const DB_CHANGE = 'changed'
export const DB_PAUSED = 'paused'
export const DB_ACTIVE = 'active'
export const DB_COMPLETE = 'complete'
export const DB_DENIED = 'denied'
export const DB_ERROR = 'error'

export default function handle_error(e, msg, incRefresh, code)
{
    if (incRefresh)
        msg += ' ' + INC_REFRESH_MSG
    let alertMsg = typeof code === "undefined" ? msg : msg + ' Code: ' + code
    if (e !== null)
    {
        alertMsg += ' Details: ' + e.message
    }
    alert(alertMsg)
}

export function handle_db_error(e, msg, incRefresh, code)
{
    handle_error(e, msg, incRefresh, code)
}

// TODO: write to log file
export function validateBulkDocs(results, showAlert) {
    let errors = []
    for (const result of results)
        if (typeof result.error !== "undefined" && result.error)
            errors.push(result.message + ' for id ' + result.id)
    if (errors.length > 0 && showAlert)
        handle_db_error(null, errors.join(', '), true)
    return errors === 0
}

export const Loading = (props) => {
  return <span>{props.loading && <div className="loader">Loading ...</div>}</span>;
}

export const DBState = (props) => {
    const {dbState} = props
    let displayState
    if ([DB_ACTIVE, DB_CHANGE].includes(dbState))
        displayState = "Syncing"
    else if ([DB_PAUSED, DB_COMPLETE].includes(dbState))
        displayState = "Sync complete"
    else
        displayState = "Sync error"
    const help = dbState + " (version: " + VERSION_NO + ")"
    return <div className={"db_state"} title={help}>{displayState}</div>
}

Loading.propTypes = {loading: PropTypes.bool};
