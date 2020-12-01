import React, {Component} from 'react'
import Ccy from '../../utils/ccy'
import {handle_db_error} from "../../utils/db";
import {MonthCatItem} from "./cat";
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
        const {budget, actMonths, catGroup, catsOpen, db} = this.props
        return (
            <div>
                { /* cat group totals */ }
                 <div className="budget_tr checked_row cat_group">
                     <div className="budget_td budget_category-label">
                        <FontAwesomeIcon onClick={this.toggle}
                                icon={this.state.open ? faChevronCircleDown : faChevronCircleUp}
                                className="mr-1 cat_group_arrow"/>
                                { catGroup.name }
                     </div>
                             {actMonths.map((dateItem, index) => (
                                 <div className="budget_td">
                                     <div className={("cat_group_item_amts me_" + index)}>
                                         <div className="budget__month-total budget__month-cell_elem budget__month-cell-val">TBC</div>
                                         <div className="budget__month-total budget__month-cell_elem budget__month-cell-val">TBC</div>
                                         <div className="budget__month-total budget__month-cell_elem budget__month-cell-val">TBC</div>
                                    </div>
                                </div>
                             ))}
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
                                    <CatGroupItem budget={budget}
                                                  db={db}
                                                  index={index}
                                                  dateItem={dateItem}
                                                  month_cat_item={catGroupItem.getMonthItem(dateItem.date)}/>
                                 </div>
                             ))}
                        </div>
                     ))}
                </React.Fragment>}
            </div>)
    }

}

class CatGroupItem extends Component {
    state = {budget_amt: this.props.month_cat_item.budget}

    componentWillReceiveProps(nextProps)
    {
        this.setState({budget_amt: nextProps.month_cat_item.budget})
    }

    // TODO: when saved - show float ie two dec places after period
    // TODO: hitting + or - in cell to do addition/subtraction
    // TODO: hitting enter should take you to next cell and tabbing should work
    // TODO: ensure taken into acc in budget delete, export and import
    handleChange = (event, month_cat_item, date) => {
        const value = event.target.value
        const n = Number(value)
        if (Number.isNaN(n))
        {
            alert(value)
        }
        else
        {
                let is_new = month_cat_item.id === null
                month_cat_item.budget = value
                if (is_new)
                {
                    // TODO: add to in mem model
                    month_cat_item.id = MonthCatItem.getNewId(this.props.budget.shortId, date)
                }
                this.props.db.upsert(month_cat_item.id, function (doc) {
                    doc.budget = value
                    if (is_new)
                    {
                        doc = month_cat_item
                        return doc.asJson(true)
                    }
                    else
                        return doc;
                }).then(function (res) {
                }).catch(function (err) {
                    handle_db_error(err, 'Failed to save the changes.', true)
                });
        }
    }

    render() {
        const {budget, index, month_cat_item, dateItem} = this.props
        return (
            <div className={("cat_group_item_amts me_" + index)}>
                 <div className="budget__month-cell_elem budget__month-cell">
                    <input type="text"
                           className="budget__cell-input"
                           value={this.state.budget_amt}
                           onFocus={event => event.target.select()}
                           onChange={(event) => {this.handleChange(event, month_cat_item, dateItem.date)}}
                           />
                </div>
                 <div className="budget__month-cell_elem budget__month-cell budget__month-cell-val">
                    <Ccy amt={month_cat_item.outflows} ccyDetails={budget.ccyDetails} incSymbol={false}/>
                </div>
                 <div className="budget__month-cell_elem budget__month-cell budget__month-cell-val month-end">
                    <Ccy amt={month_cat_item.balance} ccyDetails={budget.ccyDetails} incSymbol={false}/>
                </div>
            </div>
            )
    }
}

export default class BudgetAmounts extends Component {
    state = {open: true}
    toggle = () => this.setState({open: !this.state.open})
    render() {
        const {budget, actMonths, catsOpen, db} = this.props
        return (
            <div className="budget__tbody overflowable" id="bud_amts">
                 { /* cat group rows */ }
                 <React.Fragment>
                     {budget.cats.map((catGroup, index) => (
                        <BudgetAmountItems db={db} budget={budget} actMonths={actMonths} catGroup={catGroup} catsOpen={catsOpen}/>
                     ))}
                 </React.Fragment>
            </div>)
    }
}