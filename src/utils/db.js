import React from 'react'
import * as PropTypes from "prop-types"
const INC_REFRESH_MSG = '\nPlease refresh the page and try again.'

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
  return <div className={"db_state"}>{props.dbState}</div>
}

Loading.propTypes = {loading: PropTypes.bool};
