import React from 'react'
export const MonthName = (props) => {
// TODO: if month with year is in past then gray it out
  return <div className={"month_select__month" + (props.displayed ? ' displayed' : '') + (props.current ? ' current' : '')}>
            <span className="verbose">{props.month}</span>
            <span className="succinct">{props.month.charAt(0)}</span>
         </div>
}
MonthName.defaultProps = {
    displayed: false,
    current: false
}
