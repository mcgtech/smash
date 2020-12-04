import React, {Component} from 'react'
import Ccy from '../../utils/ccy'
import {handle_db_error} from "../../utils/db";
import {MonthCatItem} from "./cat";
import {getDateIso} from "../../utils/date";
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

    group_tot (cat_group_finances, key, date)
    {
        let date_iso = getDateIso(date)
        let val = typeof cat_group_finances[key][date_iso] === "undefined" ? 0.00 : cat_group_finances[key][date_iso]
        return val.toFixed(2)
    }

    render() {
        const {budget, actMonths, catGroup, catsOpen, db, months_financials} = this.props
        const cat_group_finances = months_financials[catGroup.shortId]
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
                                         <div className="budget__month-total budget__month-cell_elem budget__month-cell-val">
                                         {this.group_tot(cat_group_finances, 'bud_total', dateItem.date)}</div>
                                         <div className="budget__month-total budget__month-cell_elem budget__month-cell-val">
                                         {this.group_tot(cat_group_finances, 'out_total', dateItem.date)}</div>
                                         <div className="budget__month-total budget__month-cell_elem budget__month-cell-val">
                                         {this.group_tot(cat_group_finances, 'bal_total', dateItem.date)}</div>
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
                                                  catGroupItem={catGroupItem}
                                                  cat_group_finances={cat_group_finances['cg_items']}
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
    // TODO: jQuery or react js Plugin To Do Math Within An Input Field - eq https://www.jqueryscript.net/form/Do-Math-Within-Input-jQuery-Abacus.html
    // TODO: hitting enter should take you to next cell and tabbing should work
    // TODO: ensure taken into acc in budget delete, export and import
    handleChange = (event, month_cat_item, date) => {
        let value = event.target.value
        const n = Number(value)
        if (Number.isNaN(n))
        {
            alert(value)
        }
        else
        {
                let is_new = month_cat_item.id === null
                // TODO: get this to work
//                value = (Math.round(value * 100) / 100).toFixed(2);
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
    // TODO: suss how to calc total budgeted etc for the two summary lines using the values calced below
    //       so that I am not calling totalOutflows ect multiple times
        const {budget, index, month_cat_item, dateItem, catGroupItem, cat_group_finances} = this.props
        const amts = cat_group_finances[month_cat_item.catItem]['amts']
        const month_amts = amts[getDateIso(dateItem.date)]
        const month_bal = typeof month_amts === "undefined" ? 0 : month_amts['bal']
        const mon_out = typeof month_amts === "undefined" ? 0 : month_amts['out']
        return (
            <div className={("cat_group_item_amts me_" + index)}>
                 <div className="budget__month-cell_elem budget__month-cell">
                    <input type="text"
                           className="budget__cell-input"
                           value={this.state.budget_amt.toFixed(2)}
                           onFocus={event => event.target.select()}
                           onChange={(event) => {this.handleChange(event, month_cat_item, dateItem.date)}}
                           />
                </div>
                 <div className="budget__month-cell_elem budget__month-cell budget__month-cell-val">
                    <Ccy amt={mon_out}
                         outerClassName={'ignore_color'}
                         ccyDetails={budget.ccyDetails} incSymbol={false}/>
                </div>
                 <div className="budget__month-cell_elem budget__month-cell budget__month-cell-val month-end">
                    <Ccy amt={month_bal} ccyDetails={budget.ccyDetails} incSymbol={false}/>
                </div>
            </div>
            )
    }
}

export default class BudgetAmounts extends Component {
    state = {open: true}
    toggle = () => this.setState({open: !this.state.open})
    render() {
        const {budget, actMonths, catsOpen, db, months_financials} = this.props
        return (
            <div className="budget__tbody overflowable" id="bud_amts">
                 { /* cat group rows */ }
                 <React.Fragment>
                     {budget.cats.map((catGroup, index) => (
                        <BudgetAmountItems db={db}
                                           budget={budget}
                                           actMonths={actMonths}
                                           catGroup={catGroup}
                                           catsOpen={catsOpen}
                                           months_financials={months_financials}/>
                     ))}
                 </React.Fragment>
            </div>)
    }
}