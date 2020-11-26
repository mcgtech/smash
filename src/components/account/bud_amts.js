import React, {Component} from 'react'
// https://github.com/FortAwesome/react-fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronCircleUp, faChevronCircleDown } from '@fortawesome/free-solid-svg-icons'

// TODO: add hidden categories group
class BudgetAmountItems extends Component {
    state = {open: true}
    toggle = () => {
        this.setState({open: !this.state.open})
    }

    render() {
        const {actMonths, catGroup, catsOpen} = this.props
        return (
            <div>
                 <div className="budget_tr checked_row cat_group">
                     <div className="budget_td budget_category-label">
                        <FontAwesomeIcon onClick={this.toggle}
                                icon={this.state.open ? faChevronCircleDown : faChevronCircleUp}
                                className="mr-1 cat_group_arrow"/>{ catGroup.name }
                     </div>
                     <div className="budget_td">TBC</div>
                     <div className="budget_td">TBC</div>
                     <div className="budget_td">TBC</div>
                </div>
                { /* cat group items rows */ }
                {catsOpen && this.state.open && <React.Fragment>
                     {catGroup.items.map((catGroupItem, index) => (
                         <div className="budget_tr cat_group_item">
                             <div className="budget_td  budget_category-label">
                                { catGroupItem.name }
                             </div>
                             {actMonths.map((dateItem, index) => (
                             <div className="budget_td">
                                <div className={("cat_group_item_amts me_" + index)}>
                                     <div className="budget__month-cell_elem budget__month-cell">
                                        <input className="budget__cell-input" type="text" value={index}/>
                                    </div>
                                     <div className="budget__month-cell_elem budget__month-cell budget__month-cell-val">
                                        {index + 1}
                                    </div>
                                     <div className="budget__month-cell_elem budget__month-cell budget__month-cell-val month-end">
                                        {index + 2}
                                    </div>
                                </div>
                                </div>
                             ))}
                        </div>
                     ))}
                </React.Fragment>}
            </div>)
    }

}

// TODO: collapse a single group, then collapse all then uncollapse - single one still collapsed
export default class BudgetAmounts extends Component {
    state = {open: true}
    toggle = () => this.setState({open: !this.state.open})
    render() {
        const {budget, actMonths, catsOpen} = this.props
        return (
            <div className="budget__tbody overflowable" id="bud_amts">
                 { /* cat group rows */ }
                 <React.Fragment>
                     {budget.cats.map((catGroup, index) => (
                        <BudgetAmountItems actMonths={actMonths} catGroup={catGroup} catsOpen={catsOpen}/>
                     ))}
                 </React.Fragment>
            </div>)
    }

}