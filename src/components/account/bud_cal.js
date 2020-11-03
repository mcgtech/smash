import React, {Component, useState} from 'react'
import Ccy from '../../utils/ccy'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBolt, faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons'
// https://reactstrap.github.io/components/popovers/
import { Popover, PopoverHeader, PopoverBody } from 'reactstrap'

// TODO: should previous months be grayed out?
// TODO: what about current and future?
// TODO: make months responsive
export default class BudgetCalendar extends Component {
    render() {
        return (
            <div id="bud_cal">
                <span className="month_select__control"><FontAwesomeIcon icon={faAngleLeft} id="monthLeft"/></span>
                <div className="month_select__year">2020</div>
                <div className="month_select__month">Jan</div>
                <div className="month_select__month">Feb</div>
                <div className="month_select__month">Mar</div>
                <div className="month_select__month">Apr</div>
                <div className="month_select__month">May</div>
                <div className="month_select__month">Jun</div>
                <div className="month_select__month">Jul</div>
                <div className="month_select__month">Aug</div>
                <div className="month_select__month">Sep</div>
                <div className="month_select__month">Oct</div>
                <div className="month_select__month">Nov</div>
                <div className="month_select__month">Dec</div>
                <span class="month_select__control"><FontAwesomeIcon icon={faAngleRight} id="monthRight"/></span>
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