import React, {Component} from 'react'
import BudBlockCol from './bud_block_col'
import BudgetCalendar, {CalMonth} from './bud_cal'
import BudgetAmounts from './bud_amts'
import {getTodaysDate, addMonths} from '../../utils/date'
import {handle_db_error} from "../../utils/db"
// https://github.com/FortAwesome/react-fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlusSquare, faAngleDoubleDown , faAngleDoubleUp } from '@fortawesome/free-solid-svg-icons'

export default class BudgetContainer extends Component
{
    // TODO: when update db directly get ui to refresh
    // TODO: work out monthsToShow based on screen size and change is screen resized or orientation chnaged
    state = {collapsed: false, activeMonth: this.props.budget.activeMonth, monthsToShow: 3, catsOpen: true}

    collapseMonth = () => {
        this.setState({collapsed: !this.state.collapsed})
    }

    expandAllCats = (catsOpen) => {
        this.setState({catsOpen: catsOpen})
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
            if (theDate.getTime() >= this.state.activeMonth.getTime() && hiliteCount < this.state.monthsToShow)
            {
                hilite = true
                hiliteCount++
            }
            months.push({date: theDate, hilite: hilite, current: current})
        }
        // add active months
        for (let i=0 ; i < this.state.monthsToShow; i++)
        {
            let theMonth = new Date(this.state.activeMonth.getTime())
            theMonth = addMonths(theMonth, i)
            actMonths.push({date: theMonth, current: theMonth.getTime() === today.getTime(),
                            live: theMonth.getTime() >= today.getTime()})
        }

        // TODO: get scroll to work
        // TODO: work thru financier css to structure this
        // TODO: code this
        // TODO: continue coding the ui - see financier
        // TODO: make it responsive
        // TODO: take into account the active month
        // TODO: only show three months at one time
        // TODO: when click on = 123.00 collapse or expand
        // TODO: code lightening bolt
        // TODO: hilite months shown
        // TODO: when adding txn show how much is left in category and use green and red
        return (
            /*<div className={"scroll-container panel_level1"}>*/
            /*<div className="panel_level1">*/
                <div className="budgetBlock">
                     <div className="budget_table">
                         <div className="budget__thead">
                             <div className="budget_tr">
                                 <div className="budget_td budget_category-label">
                                     <div className="budget_category-resize-handle">
                                    </div>
                                </div>
                                 <div className="budget_td">
                                    { /* Jan Feb Mar ... */ }
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
                                    { /* month blocks with amts in them */ }
                                   {actMonths.map((dateItem, index) => (
                                    <div className="budget_td">
                                        <CalMonth budget={budget}
                                                  index={index}
                                                  date={dateItem}
                                                  monthNames={monthNames}
                                                  notBudget={171}
                                                  overspend={-801.83}
                                                  income={3484.43} budgeted={-2853.60} avail={0}
                                                  collapsed={this.state.collapsed}
                                                  collapseMonth={this.collapseMonth}/>
                                    </div>
                                                    ))}
                            </div>
                             { /* summary heading */ }
                             <div className="budget_tr">
                                 <div className="budget_td budget_category-label">
                                 Categories<FontAwesomeIcon
                                            icon={faPlusSquare}
                                            className="ml-1"/>
                                            {this.state.catsOpen ?
                                            <FontAwesomeIcon
                                            icon={faAngleDoubleUp}
                                            className="ml-1 cat_group_arrow"
                                            onClick={(e) => this.expandAllCats(false)}/>
                                            :
                                            <FontAwesomeIcon
                                            icon={faAngleDoubleDown}
                                            className="ml-1 cat_group_arrow"
                                            onClick={(e) => this.expandAllCats(true)}/>}
                                </div>
                                 {actMonths.map((dateItem, index) => (
                                    <div className="budget_td">
                                        <div className={("cat_grp_summ cat_group_item_amts me_" + index)}>
                                             <div className="budget__month-cell budget__month-cell-val">
                                                <div>Budgeted</div>{index}
                                            </div>
                                             <div className="budget__month-cell budget__month-cell-val">
                                                <div>Overflows</div>{index}
                                            </div>
                                             <div className="budget__month-cell budget__month-cell-val">
                                                <div>Balance</div>{index}
                                            </div>
                                        </div>
                                    </div>
                                 ))}
                             </div>
                        </div>
                        <BudgetAmounts budget={budget} actMonths={actMonths} catsOpen={this.state.catsOpen}/>
                    </div>
                </div>
            /*</div>*/
        )
    }
}