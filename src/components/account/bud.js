import React, {Component} from 'react'
import BudBlockCol from './bud_block_col'
import BudgetCalendar, {CalMonth} from './bud_cal'
import {getTodaysDate, addMonths} from '../../utils/date'
import {handle_db_error} from "../../utils/db"
export default class BudgetContainer extends Component
{
// TODO: when update db directly get ui to refresh
    state = {collapsed: false, activeMonth: this.props.budget.activeMonth}

    collapseMonth = () => {
        this.setState({collapsed: !this.state.collapsed})
    }


    changeMonth = (forwards, newDate) => {
        const self = this
        const db = this.props.db
        const budget = this.props.budget
        let date
        if (typeof newDate === "undefined")
        {
            date = this.state.activeMonth
            const months = forwards ? 1 : -1
            date.setMonth(date.getMonth() + months)
        }
        else
        {
            date = newDate
        }
        this.setState({activeMonth: date},
            function(){
                let json = budget.asJson(true)
                json.activeMonth = date
                db.get(budget.id).then(function (doc) {
                    json._rev = doc._rev // in case it has been updated elsewhere
                    return db.put(json)
                }).catch(function (err) {
                    handle_db_error(err, 'Failed to update the budget for month change.', true);
                });
            }
        )
    }

    render() {
        // TODO: move to its own class
        // TODO: order by weight
        // TODO: drag and drop
        // TODO: handle collapsed
        // TODO: why does this get called multiple times?
        // TODO: check group name back colors in each theme
        const budget = this.props.budget
        const catGroups = budget.cats
        // first block - group names and items
        const catGroupElems = catGroups.map((catGroup, index) => {
            const catGroupItems = catGroup.items.map((catGroupItem, index) => {
                return <div className="catName">{catGroupItem.name}</div>
            })
            return <div class="catGroup">
                <div className="catGroupHead lightest">{catGroup.name}</div>
                {catGroupItems}
                </div>
        })
        // month blocks const today = getTodaysDate()
        const today = getTodaysDate()
        const actYear = this.state.activeMonth.getFullYear()
        let posn = 0
        let months = []
        let actMonths = []
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        let hiliteCount = 0
        let current = false
        for (let i=1 ; i <= 12; i++)
        {
            let hilite = false
            const theDate = new Date(actYear + "-" + i + "-01")
            theDate.setHours(0,0,0,0)
            current = theDate.getTime() === today.getTime()
            if (theDate.getTime() >= this.state.activeMonth.getTime() && hiliteCount < 3)
            {
                hilite = true
                hiliteCount++
            }
            months.push({date: theDate, hilite: hilite, current: current})
        }
        // add active months
        // TODO: current not working
        let nextMonth = new Date(this.state.activeMonth.getTime())
        let nextMonthPlusOne = new Date(this.state.activeMonth.getTime())
        nextMonth = addMonths(nextMonth, 1)
        // TODO: year wrong on this if nextMonth is Dec
        nextMonthPlusOne = addMonths(nextMonthPlusOne, 2)
        actMonths.push({date: this.state.activeMonth, current: this.state.activeMonth.getTime() === today.getTime()})
        actMonths.push({date: nextMonth, current: nextMonth.getTime() === today.getTime()})
        actMonths.push({date: nextMonthPlusOne, current: nextMonthPlusOne.getTime() === today.getTime()})


        // TODO: work thru financier css to structure this
        // TODO: code this
        // TODO: continue coding the ui - see financier
        // TODO: make it responsive
        // TODO: take into account the active month
        // TODO: only show three months at one time
        // TODO: when click on = 123.00 collapse or expand
        // TODO: code lightening bolt
        // TODO: red triangle on current month
        // TODO: hilite months shown
        return (
            /*<div className={"scroll-container panel_level1"}>*/
            <div className="panel_level1">
                <div className="budgetBlock">
                     <div className="budget_table">
                         <div className="budget_table_head">
                             <div className="budget_tr">
                                 <div className="budget_td budget_category-label">
                                     <div className="budget_category-resize-handle">
                                    </div>
                                </div>
                                 <div className="budget_td">
                                    <BudgetCalendar
                                        changeMonth={this.changeMonth}
                                        months={months}
                                        actYear={actYear}
                                        monthNames={monthNames}
                                        />
                                 </div>
                            </div>
                             <div className="budget_tr">
                                 <div className="budget_td budget_category-label">
                                     <div className="budget_category-resize-handle">
                                    </div>
                                </div>
                                   {actMonths.map((dateItem, index) => (
                                    <div className="budget_td">
                                        <CalMonth budget={budget}
                                                  prevMonth="Sep"
                                                  month={monthNames[dateItem.date.getMonth()]}
                                                  year={actYear}
                                                  notBudget={171}
                                                  overspend={-801.83}
                                                  income={3484.43} budgeted={-2853.60} avail={0}
                                                  monthEnd={true}
                                                  collapsed={this.state.collapsed}
                                                  collapseMonth={this.collapseMonth}/>
                                    </div>
                                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}