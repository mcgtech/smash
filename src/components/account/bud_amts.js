import React, {Component} from 'react'
export default class BudgetAmounts extends Component {
    render() {
        const {budget, actMonths} = this.props
        return (
            <div className="budget__tbody overflowable" id="bud_amts">
                 { /* cat group rows */ }
                 <React.Fragment>
                     {budget.cats.map((catGroup, index) => (
                         <React.Fragment>
                             <div className="budget_tr checked_row cat_group">
                                 <div className="budget_td budget_category-label">
                                    { catGroup.name }
                                 </div>
                                 <div className="budget_td">TBC</div>
                                 <div className="budget_td">TBC</div>
                                 <div className="budget_td">TBC</div>
                            </div>
                            { /* cat group items rows */ }
                            <React.Fragment>
                                 {catGroup.items.map((catGroupItem, index) => (
                                     <div className="budget_tr cat_group_item">
                                         <div className="budget_td  budget_category-label">
                                            { catGroupItem.name }
                                         </div>
                                         {actMonths.map((dateItem, index) => (
                                         <div className="budget_td">
                                            <div className={("cat_group_item_amts me_" + index)}>
                                                 <div className="budget__month-cell">
                                                    <input className="budget__cell-input" type="text" value={index}/>
                                                </div>
                                                 <div className="budget__month-cell budget__month-cell-val">
                                                    {index + 1}
                                                </div>
                                                 <div className="budget__month-cell budget__month-cell-val month-end">
                                                    {index + 2}
                                                </div>
                                            </div>
                                            </div>
                                         ))}
                                    </div>
                                 ))}
                            </React.Fragment>
                         </React.Fragment>
                     ))}
                 </React.Fragment>
            </div>)
    }

}