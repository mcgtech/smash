import React from 'react'
export const MonthName = (props) => {
  return <div className={"month_select__month" + (props.displayed ? ' prim_btn' : '') + (props.current ? ' current' : '')}>
            <span className="verbose">{props.month}</span>
            <span className="succinct">{props.month.charAt(0)}</span>
         </div>
}
MonthName.defaultProps = {
    displayed: false,
    current: false
}
