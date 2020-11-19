import React, {Component} from 'react'
export default class BudgetAmounts extends Component {
    render() {
        const {budget, actMonths} = this.props
        console.log(budget)
        return (
            <div className="budget__tbody overflowable" id="bud_amts">
                 { /* summary heading */ }
                 <div className="budget_tr">
                     <div className="budget_td">
                     Categories
                    </div>
                     {actMonths.map((dateItem, index) => (
                         <div className="budget_td">
                         {index}
                        </div>
                     ))}
                 </div>
                 { /* cat group rows */ }
                 <div>
                     {budget.cats.map((catGroup, index) => (
                        <div>
                             <div className="budget_tr checked_row cat_group">
                                 <div className="budget_td">
                                    { catGroup.name }
                                 </div>
                                 <div className="budget_td">TBC</div>
                                 <div className="budget_td">TBC</div>
                                 <div className="budget_td">TBC</div>
                            </div>
                            { /* cat group items rows */ }
                            <div>
                                 {catGroup.items.map((catGroupItem, index) => (
                                     <div className="budget_tr cat_group_item">
                                         <div className="budget_td">
                                            { catGroupItem.name }
                                         </div>
                                             {actMonths.map((dateItem, index) => (
                                                 <div className="budget_td">
                                                 {index}
                                                </div>
                                             ))}
                                    </div>
                                 ))}
                            </div>
                        </div>
                     ))}
                </div>
            </div>)
    }

}