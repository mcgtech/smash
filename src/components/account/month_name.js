import React from 'react'
export const MonthName = (props) => {
// TODO: if month with year is in past then gray it out
  return <div onClick={(event) => props.changeMonth(false, props.date)}
              className={"month_select__month" + (props.hilite ? ' hilite_month' : '') + (props.current ? ' current' : '')}>
            <span className="verbose">{props.month}</span>
            <span className="succinct">{props.month.charAt(0)}</span>
         </div>
}
MonthName.defaultProps = {
    displayed: false,
    current: false
}
