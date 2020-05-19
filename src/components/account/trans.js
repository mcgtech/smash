import React, {Component} from 'react'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import * as PropTypes from "prop-types"
import Ccy from "../../utils/ccy"
import DropDown from "../../utils/dropDown"
import {strToFloat} from "../../utils/numbers"
import {getDateIso} from "../../utils/date"
import Account from "./account"
import {BUDGET_KEY, ACC_KEY, KEY_DIVIDER, INCOME_KEY, BUDGET_PREFIX, TXN_PREFIX} from './keys'
import {handle_db_error} from "../../utils/db"
import { v4 as uuidv4 } from 'uuid'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faExchangeAlt} from '@fortawesome/free-solid-svg-icons'
import {faFlag} from '@fortawesome/free-regular-svg-icons'

export default class Trans {
    constructor(doc, budget, account) {
        if (doc === null)
        {
            this.tid = Trans.getNewTransId(budget.id)
            this.trev = null
            this.tacc = account.shortId
            this.tdate = new Date()
            this.tflagged = false
            this.tclear = false
            this.tin = 0
            this.tout = 120
            // TODO: remove dummy test data
            this.tcatItem = "4"
            this.catItemName = "Groceries (£850)"
            this.payeeName = "airbnb"
            this.tpay = "11"
            this.tmemo = "test"
            // id of equal and opposite txn in a transfer
            this.trans = null
        }
        else
        {
            this.tid = doc._id
            this.trev = doc._rev
            this.tacc = doc.acc
            this.tdate = new Date(doc.date)
            this.tflagged = doc.flagged
            this.tclear = doc.cleared
            this.tout = doc.out
            this.tin = doc.in
            this.tcatItem = doc.catItem
            this.tpay = doc.payee
            this.tmemo = doc.memo
            // id of equal and opposite txn in a transfer
            this.trans = doc.transfer
        }
    }

    // https://github.com/uuidjs/uuid
    static getNewTransId(budgetId)
    {
        return budgetId + KEY_DIVIDER + TXN_PREFIX + uuidv4()
    }

    asJson()
    {
        return {
                "_id": this.id,
                "_rev": this.rev,
                "type": "txn",
                "acc": this.acc,
                "flagged": this.flagged,
                "date": getDateIso(this.date),
                "catItem": this.catItem,
                "memo": this.memo,
                "out": this.out,
                "in": this.in,
                "payee": this.payee,
                "cleared": this.clear
        }
    }

    // save the txn and if that succeeds update the payee list if it has changed
    // note: pouchdb is not transactional, if the budget update with new payee list fails then
    //       we will not tell the user as hopefully the orphaned payee will be removed in future saves
    save(db, accDetailsContainer) {
        const self = this
        const json = self.asJson()
        if (self.isNew())
            self.saveTxnData(db, json, accDetailsContainer, self)
        else
            db.get(self.id).then(function (doc) {
                json._rev = doc._rev // in case it has been updated elsewhere
                self.saveTxnData(db, json, accDetailsContainer, self);
            }).catch(function (err) {
                handle_db_error(err, 'Failed to retrieve your transaction.', true)
            })
    }

    saveTxnData(db, json, accDetailsContainer, self) {
        db.put(json).then(function (result) {
            let acc = accDetailsContainer.props.activeAccount
            if (self.isNew())
            {
                // update in mem model with new txn
                db.get(json._id, {include_docs: true}).then(function(newTxn){
                    acc.txns.unshift(new Trans(newTxn))
                    Account.removeOldPayees(db, accDetailsContainer.props.budget, self.txnPostSave(accDetailsContainer, acc, self))
                }).catch(function (err) {
                    handle_db_error(err, 'Failed to refresh list with your new transaction.', true)
            })
            }
            else
                Account.removeOldPayees(db, accDetailsContainer.props.budget, self.txnPostSave(accDetailsContainer, acc, self))
        }).catch(function (err) {
                handle_db_error(err, 'Failed to save your transaction.', true)
            })
    }

    txnPostSave(accDetailsContainer, acc, self) {
        accDetailsContainer.editOff()
        acc.replaceTxn(self)
        acc.updateAccountTotal()
        accDetailsContainer.props.refreshBudgetState()
    }

    get amount() {
        if (this.out === "")
            this.out = 0
        return this.out > 0 ? -1 * this.out : this.in
    }

    get id() {
        return this.tid
    }

    isNew() {
        return this.rev === null
    }

    // return true if payee selected is an account
    // note we don't have closed in accounts list in payee list
    get isPayeeAnAccount() {
        const items = this.payee.split(KEY_DIVIDER)
        return items.length === 4 && items[0] === BUDGET_KEY && items[2] === ACC_KEY
    }

    // return true if cat selected is an income
    get isCatItemIncome() {
        return this.payee.startsWith(INCOME_KEY)
    }

    static getIncomeCat() {
        const today = new Date()
        const todayMonthDigit = today.getMonth()
        const todayYear = today.getFullYear()
        const todayMonthName = today.toLocaleString('default', { month: 'short' })
        const nextMonthDigit = todayMonthDigit === 11 ? 0 : todayMonthDigit + 1
        const nextMonth = new Date(today.setMonth(nextMonthDigit))
        const nextMonthYear = nextMonth.getFullYear()
        const nextMonthName = nextMonth.toLocaleString('default', { month: 'short' })
        return {id: "inc", type: "cat", groupName: "Income", weight: 0, items: [{
                    id: 'income:' + todayYear + ':' + todayMonthDigit,
                    name: 'Income for ' + todayMonthName,
                    type: 'catItem',
                    cat: 'inc'
                }, {
                    id: 'income:' + nextMonthYear + ':' + nextMonthDigit,
                    name: 'Income for ' + nextMonthName,
                    type: 'catItem',
                    cat: 'inc'
                }]}
    }

    get acc() {
        return this.tacc
    }

    get rev() {
        return this.trev
    }

    set rev(rev) {
        this.trev = rev
    }

    get date() {
        return this.tdate
    }

    set date(date) {
        this.tdate = date
    }

    get clear() {
        return this.tclear
    }

    set clear(clear) {
        this.tclear = clear
    }

    get transfer() {
        return this.ttrans
    }

    set transfer(transfer) {
        this.ttrans = transfer
    }

    get flagged() {
        return this.tflagged
    }

    set flagged(flagged) {
        this.tflagged = flagged
    }

    get out() {
        return this.tout
    }

    set out(outFlow) {
        this.tout = outFlow
    }

    get in() {
        return this.tin
    }

    set in(inFlow) {
        this.tin = inFlow
    }

    get catItem() {
        return this.tcatItem
    }

    set catItem(catItem) {
        this.tcatItem = catItem
    }

    get payee() {
        return this.tpay
    }

    set payee(pay) {
        this.tpay = pay
    }

    get memo() {
        return this.tmemo
    }

    set memo(memo) {
        this.tmemo = memo
    }
}

// https://www.npmjs.com/package/react-datepicker
//      https://github.com/Hacker0x01/react-datepicker/blob/master/docs/datepicker.md
//      https://reactdatepicker.com/
//      https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
export class TxnDate extends Component {
    state = {
        startDate: null
    };

    componentDidMount()
    {
        this.setState({startDate: this.props.startDate})
    }

    handleChange = date => {
        this.setState({
            startDate: date
        });
        this.props.handleChange(date)
    };

    render() {
    const {hasFocus, readOnly} = this.props
        return <DatePicker
                openToDate={this.state.startDate}
                selected={this.state.startDate}
                onChange={this.handleChange}
                dateFormat='E MMM dd yyyy'
                startOpen={hasFocus}
                tabIndex={1}
                className='form-control'
                readOnly={readOnly}
                calendarClassName="date_pick"
            />
    }
}
TxnDate.defaultProps = {
    readOnly: false,
    startDate: new Date()
}
TxnDate.propTypes = {
    selected: PropTypes.any,
    onChange: PropTypes.func
};

function TxnTd(props) {
    const fldName = props.fld + "Fld"
    const editFieldId = props.trState.editFieldId
    const txnInEdit = props.trState.txnInEdit
    return <td fld_id={fldName} onClick={props.onClick}>
        {props.editTheRow && txnInEdit !== null ? <div>
            <input autoFocus={editFieldId === fldName}
                       className={"form-control"}
                       type='text'
                       value={txnInEdit[props.fld]}
                       onChange={props.onChange}
                       onFocus={e => e.target.select()}/>
                {props.incSave && <div id="txn_save">
                    <button onClick={(event => props.saveTxn(txnInEdit))} type="button "
                            className='btn prim_btn'>Save
                    </button>
                    <button onClick={(event => props.cancelEditTxn(event))} type="button "
                            className='btn btn-secondary'>Cancel
                    </button>
                </div>}
            </div>
            :
            props.isCcy ? <Ccy verbose={false} amt={props.row[props.fld]}/> : props.row[props.fld]}
    </td>
}

TxnTd.defaultProps = {
    incSave: false,
    isCcy: false
}

TxnTd.propTypes = {
    onClick: PropTypes.func,
    showEditRow: PropTypes.bool,
    editField: PropTypes.any,
    txnInEdit: PropTypes.any,
    onChange: PropTypes.func,
    row: PropTypes.any
};

const dateFld = "dateFld"
export class TxnTr extends Component {
    state = {editFieldId: null, txnInEdit: null}

    componentWillReceiveProps(nextProps) {
        const {editTheRow, row} = nextProps
        if (editTheRow && row !== null && this.state.txnInEdit === null)
        {
            let state = {txnInEdit: TxnTr.getRowCopy(row)}
            if (nextProps.addingNew)
                state['editFieldId'] = dateFld
            this.setState(state)
        }
    }

    static getRowCopy(row) {
        // note: {...} does not appear to clone the class methods so use following instead:
        //      https://stackoverflow.com/questions/41474986/how-to-clone-a-javascript-es6-class-instance
        return Object.assign(Object.create(Object.getPrototypeOf(row)), row)
    }

    tdSelected = (event) => {
        this.setState({editFieldId: event.target.getAttribute('fld_id')})
    }

    txnSelected = (event, row) => {
        if (typeof event.target.type === "undefined")
            this.props.txnSelected(event, row)
    }

    saveTxn = (txn) => {
        this.setState({txnInEdit: null, editFieldId: null}, function(){this.props.saveTxn(txn)})
    }

    cancelEditTxn = () => {
        this.setState({txnInEdit: null, editFieldId: null}, function(){this.props.cancelEditTxn()})
    }

    handleDateChange = (date) => {
        let txnInEdit = this.state.txnInEdit
        txnInEdit.date = date
        this.setState({txnInEdit: txnInEdit})
    }

    handlePayeeChange = selectedOption => {
        let txnInEdit = this.state.txnInEdit
        txnInEdit.payee = selectedOption.id
        txnInEdit.payeeName = selectedOption.name
        this.setState({txnInEdit: txnInEdit})
    }

    handleCatChange = selectedOption => {
        let txnInEdit = this.state.txnInEdit
        txnInEdit.catItem = selectedOption.id
        txnInEdit.catItemName = selectedOption.name
        this.setState({txnInEdit: txnInEdit})
    }

    handleInputChange = (event, fld, isCcy) => {
        let val = event.target.value
        let txnInEdit = this.state.txnInEdit
        // if ccy then ensure only floats allowed, I did it like this as using NumberFormat (inside CCY)
        // lead to all kinds of state issues
        if (isCcy)
        {
            val = strToFloat(val, "0")
            // only allow in or out
            if (fld === 'in')
                txnInEdit.out = 0
            else
                txnInEdit.in = 0
        }
        txnInEdit[fld] = val
        this.setState({txnInEdit: txnInEdit})
    }

    // inout value: https://medium.com/capital-one-tech/how-to-work-with-forms-inputs-and-events-in-react-c337171b923b
    // if an account is selected in txn then cat should be blank as this signifies a transfer from one account to another
    render() {
        const payFld = "payFld"
        const catFld = "catFld"
        const memoFld = "memo"
        const outFld = "out"
        const inFld = "in"
        const {row, isChecked, toggleTxnCheck, toggleFlag, toggleCleared,
                payees, catItems, editTheRow} = this.props
        if (typeof row == 'undefined')
            return (<tr></tr>)
        else
        {
            return (
             <tr className={isChecked || editTheRow ? 'edit_row' : ''}
                 onClick={(event) => this.txnSelected(event, row)}>

                 {/* checkbox */}
                 <td className="txn_sel" fld_id="selFld" onClick={(event => this.tdSelected(event))}>
                     <input onChange={(event) => toggleTxnCheck(event, row)}
                            type="checkbox" checked={isChecked}/>
                 </td>

                 {/* flagged */}
                 <td fld_id="flagFld" onClick={(event => this.tdSelected(event))}>
                     <FontAwesomeIcon icon={faFlag} className={row.flagged ? "flagged flag": "flag"} onClick={() => toggleFlag(row, true)}/>
                 </td>

                 {/* date */}
                 <td fld_id={dateFld} onClick={(event => this.tdSelected(event))}>
                     {editTheRow ? <TxnDate handleChange={this.handleDateChange}
                                         hasFocus={editTheRow && this.state.editFieldId === dateFld}
                                         startDate={row.date}/> : row.date.toDateString()}</td>

                 {/* payees */}
                 <td fld_id={payFld} className="table_ddown" onClick={(event => this.tdSelected(event))}>
                     {editTheRow && <DropDown options={payees}
                                          grouped={true}
                                          hasFocus={editTheRow && this.state.editFieldId === payFld}
                                          changed={this.handlePayeeChange}
                                          value={row.payeeName}/>}
                     {/* if I don't split into separate lines then the ddown does not open when input box gets focus */}
                     {!editTheRow && row.isPayeeAnAccount && row.payeeName}
                     {!editTheRow && row.isPayeeAnAccount && <FontAwesomeIcon icon={faExchangeAlt} className="ml-1" aria-hidden="true"/>}
                     {!editTheRow && !row.isPayeeAnAccount && row.payeeName}
                 </td>

                 {/* category items */}
                 <td fld_id={catFld} className="table_ddown" onClick={(event => this.tdSelected(event))}>
                     {editTheRow ? <DropDown options={catItems}
                                          grouped={true}
                                          hasFocus={editTheRow && this.state.editFieldId === catFld}
                                          changed={this.handleCatChange}
                                          value={row.catItemName}
                     /> : row.catItemName}
                 </td>

                 <TxnTd
                        fld={memoFld}
                        row={row}
                        editTheRow={editTheRow}
                        trState={this.state}
                        onClick={(event) => this.tdSelected(event)}
                        onChange={(event) => this.handleInputChange(event, memoFld, false)}
                 />

                 <TxnTd
                        fld={outFld}
                        name="out"
                        row={row}
                        editTheRow={editTheRow}
                        trState={this.state}
                        onClick={(event) => this.tdSelected(event)}
                        onChange={(event) => this.handleInputChange(event, outFld, true)}
                        isCcy={true}
                 />

                 <TxnTd
                        fld={inFld}
                        name="in"
                        row={row}
                        editTheRow={editTheRow}
                        trState={this.state}
                        onClick={(event) => this.tdSelected(event)}
                        onChange={(event) => this.handleInputChange(event, inFld, true)}
                        isCcy={true}
                        incSave={true}
                        saveTxn={this.saveTxn}
                        cancelEditTxn={this.cancelEditTxn}
                 />

                 <td fld_id="clearFld" onClick={(event => this.tdSelected(event))}>
                     <TxnCleared toggleCleared={toggleCleared} row={row} cleared={row.clear}/></td>
             </tr>
            )

        }
    }
}


export class TxnCleared extends Component {
    render() {
        return <div onClick={typeof this.props.row != 'undefined' ? () => this.props.toggleCleared(this.props.row) : false || null}
                    className={"cleared" + (this.props.cleared ? " has_cleared" : "")}>C</div>;
    }
}
