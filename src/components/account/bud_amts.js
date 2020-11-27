import React, {Component} from 'react'
import Ccy from '../../utils/ccy'
// https://github.com/FortAwesome/react-fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronCircleUp, faChevronCircleDown } from '@fortawesome/free-solid-svg-icons'

// TODO: add hidden categories group
class BudgetAmountItems extends Component {
    state = {open: true}
    toggle = () => {
        this.setState({open: !this.state.open})
    }

    componentWillReceiveProps(nextProps)
    {
        if (this.props.catsOpen !== nextProps.catsOpen && nextProps.catsOpen)
            this.setState({open: true})
    }

    render() {
        const {budget, actMonths, catGroup, catsOpen} = this.props
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
                                    <CatGroupItem budget={budget} index={index}/>
                                 </div>
                             ))}
                        </div>
                     ))}
                </React.Fragment>}
            </div>)
    }

}

class CatGroupItem extends Component {
    state = {budget_amt: 0.00}

    handleChange = (event) => {
        this.setState({budget_amt: event.target.value})
    }

    render() {
        const {budget, index} = this.props
        return (
            <div className={("cat_group_item_amts me_" + index)}>
                 <div className="budget__month-cell_elem budget__month-cell">
                    <Ccy amt={this.state.budget_amt}
                         ccyDetails={budget.ccyDetails}
                         incSymbol={false}
                         className="budget__cell-input"
                         displayType="input"
                         onFocus={event => event.target.select()}
                         onValueChange={(values) => {
    const {formattedValue, value} = values;
    // formattedValue = $2,223
    // value ie, 2223
    console.log(value)
    this.setState({budget_amt: value})
  }}
                         />
                </div>
                 <div className="budget__month-cell_elem budget__month-cell budget__month-cell-val">
                    <Ccy amt={index + 1} ccyDetails={budget.ccyDetails} incSymbol={false}/>
                </div>
                 <div className="budget__month-cell_elem budget__month-cell budget__month-cell-val month-end">
                    <Ccy amt={index + 2} ccyDetails={budget.ccyDetails} incSymbol={false}/>
                </div>
            </div>
            )
    }
}

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
                        <BudgetAmountItems budget={budget} actMonths={actMonths} catGroup={catGroup} catsOpen={catsOpen}/>
                     ))}
                 </React.Fragment>
            </div>)
    }
}