import React, {Component, useState} from 'react'
import Ccy from '../../utils/ccy'
import {getTodaysDate} from '../../utils/date'
import {MonthName} from './month_name.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBolt, faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons'
// https://reactstrap.github.io/components/popovers/
import { Popover, PopoverHeader, PopoverBody } from 'reactstrap'

// TODO: should previous months be grayed out?
// TODO: what about current and future?
// TODO: make months responsive


export default class BudgetCalendar extends Component {
    render() {
        const {changeMonth, activeMonth} = this.props
        const today = getTodaysDate()
        const actYear = activeMonth.getFullYear()
        let posn = 0
        let months = []
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        let hiliteCount = 0
        let current = false
        for (let i=1 ; i <= 12; i++)
        {
            let hilite = false
            const theDate = new Date(actYear + "-" + i + "-01")
            theDate.setHours(0,0,0,0)
            current = theDate.getTime() === today.getTime()
            if (theDate.getTime() >= activeMonth.getTime() && hiliteCount < 3)
            {
                hilite = true
                hiliteCount++
            }
            months.push({date: theDate, hilite: hilite, current: current})
        }
        return (
            <div id="bud_cal">
                <span className="month_select__control" id="monthLeft" onClick={(event) => changeMonth(false)}><FontAwesomeIcon icon={faAngleLeft}/></span>
                <div className="month_select__year">{actYear}</div>
                {months.map((dateItem, index) => (
                    <MonthName month={monthNames[dateItem.date.getMonth()]}
                        current={dateItem.current}
                        hilite={dateItem.hilite}
                        date={dateItem.date}
                        changeMonth={changeMonth}
                    />
                                    ))}
                <span className="month_select__control" id="monthRight" onClick={(event) => changeMonth(true)}><FontAwesomeIcon icon={faAngleRight}/></span>
            </div>
            )
    }
}
export const CalMonth = (props) => {
        const [popoverOpen, setPopoverOpen] = useState(false)
        const toggleQuickBudget = () => setPopoverOpen(!popoverOpen)
        const {budget, prevMonth, month, year, notBudget,
        overspend, income, budgeted, avail, monthEnd, currentMonth, collapsed, collapseMonth, active} = props
        let monthClass = "month_overview"
        if (monthEnd)
            monthClass += " month_end"
        if (currentMonth)
            monthClass += " month_overview_current"
        if (active)
            monthClass += " active"
        return (
            <div>
            <div class={monthClass}>
                <FontAwesomeIcon icon={faBolt} className="month_overview_quick_budget" id="quick_budget" />
                <span className="month_text">{month} {year}</span>
                {!collapsed && <dl className="month_list">
                    <dt>
                        <Ccy amt={notBudget} ccyDetails={budget.ccyDetails} incSymbol={false} incPositivePrefix={true}/>
                    </dt>
                    <dd>
                        Not Budgeted in {prevMonth}
                    </dd>
                    <dt>
                        <Ccy amt={overspend} ccyDetails={budget.ccyDetails} incSymbol={false} incPositivePrefix={true}/>
                    </dt>
                    <dd>
                        Overspent in {prevMonth}
                    </dd>
                    <dt>
                        <Ccy amt={income} ccyDetails={budget.ccyDetails} incSymbol={false} incPositivePrefix={true}/>
                    </dt>
                    <dd>
                        Income for {month}
                    </dd>
                    <dt>
                        <Ccy amt={budgeted} ccyDetails={budget.ccyDetails} incSymbol={false} incPositivePrefix={true}/>
                    </dt>
                    <dd>
                        Budgeted for {month}
                    </dd>
                </dl>}
                <div className="month_total" onClick={(event) => collapseMonth()}>
                    <span className={avail < 0 ? "neg_no" : ""}>=</span> <Ccy amt={avail} ccyDetails={budget.ccyDetails} incPositivePrefix={true}/>
                </div>
                <div class="month_total_subtext">
                    {avail >= 0 ? "Available to Budget" : "Overbudgeted"}
                </div>
            </div>
              <Popover placement="auto" isOpen={popoverOpen} target="quick_budget" toggle={toggleQuickBudget} id="quick_bud_pop">
                <PopoverBody>
                    <ul className="lightest_list">
                        <li>Use last month's budget</li>
                        <li>Use average of last 3 month's budget</li>
                        <li>Budget to zero</li>
                        <li>Clear all budget amounts for this month</li>
                    </ul>
                </PopoverBody>
              </Popover>
            </div>
            )
}

CalMonth.defaultProps = {
    currentMonth: false,
    active: false,
    monthEnd: false
}