import React, {Component} from 'react'
import BudBlockCol from './bud_block_col'
import BudgetCalendar, {CalMonth} from './bud_cal'

export default class BudgetContainer extends Component
{
    render() {
        // TODO: move to its own class
        // TODO: order by weight
        // TODO: drag and drop
        // TODO: handle collapsed
        // TODO: why does this get called multiple times?
        // TODO: check group name back colors in each theme
        const budget = this.props.budget
        const catGroups = budget.cats
//        console.log(catGroups)
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
        // month blocks
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
                                    <BudgetCalendar/>
                                 </div>
                            </div>
                             <div className="budget_tr">
                                 <div className="budget_td budget_category-label">
                                     <div className="budget_category-resize-handle">
                                    </div>
                                </div>
                                 <div className="budget_td">
                                    <CalMonth budget={budget} prevMonth="Sep" month="October" year="2020" notBudget={171}
                                              overspend={-801.83}
                                              income={3484.43} budgeted={-2853.60} avail={0}
                                              monthEnd={true}
                                              currentMonth={true}/>
                                 </div>
                                 <div className="budget_td">
                                    <CalMonth budget={budget} prevMonth="Oct" month="November" year="2020" notBudget={0}
                                              overspend={-31.43}
                                              income={9.5} budgeted={0} avail={-30.64}
                                              monthEnd={true}/>
                                 </div>
                                 <div className="budget_td">
                                    <CalMonth budget={budget} prevMonth="Nov" month="December" year="2020" notBudget={-21.93}
                                              overspend={0}
                                              income={0} budgeted={0} avail={-30.64}/>
                                 </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}