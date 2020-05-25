import React, {Component} from 'react'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import * as PropTypes from "prop-types"
import Ccy from "../../utils/ccy"
import DropDown from "../../utils/dropDown"
import {strToFloat} from "../../utils/numbers"
import {getDateIso, formatDate} from "../../utils/date"
import Account from "./account"
import {ACC_KEY, KEY_DIVIDER, INCOME_KEY, TXN_PREFIX, SHORT_BUDGET_PREFIX, SHORT_BUDGET_KEY} from './keys'
import {INIT_BAL_PAYEE} from './budget_const'
import {handle_db_error} from "../../utils/db"
import {v4 as uuidv4} from 'uuid'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faExchangeAlt} from '@fortawesome/free-solid-svg-icons'
import {faFlag} from '@fortawesome/free-regular-svg-icons'
import $ from "jquery";

export default class Trans {
    constructor(doc, budget, account) {
        if (doc === null) {
            this.tid = Trans.getNewId(budget.shortId)
            this.trev = null
            this.tacc = account.shortId
            this.tdate = new Date()
            this.tflagged = false
            this.tclear = false
            this.tin = 0
            this.tout = 0
            this.tcatItem = ""
            this.tpay = ""
            this.tmemo = ""
            // id of equal and opposite txn in a transfer
            this.trans = null
        } else {
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

    // add cat and payee display data
    enhanceData(budget, cats, payees) {
        let catItem = budget.getCatItem(this.catItem, cats)
        let payeeItem = budget.getPayee(this.payee, payees)
        // TODO: log these somehow? - note: when I moved down bud.updateTotal() in txnPostSave it screws up payee list ids
        if (payeeItem === null)
            console.log('Budget corrupt, please reload from  you most recent backup. Code: 1 - payeeItem is null - ' + this.id, this.payee)
        if (!this.isPayeeAnAccount() && this.catItem === null)
            console.log('Budget corrupt, please reload from  you most recent backup. Code: 2 - payee is account and cat is null - ' + this.id)
        else
        {
            if (catItem !== null)
                this.catItemName = catItem.name
            if (payeeItem !== null)
                this.payeeName = payeeItem.name
        }
    }

    // https://github.com/uuidjs/uuid
    static getNewId(shortBudId) {
        return SHORT_BUDGET_PREFIX + shortBudId + KEY_DIVIDER + TXN_PREFIX + uuidv4()
    }

    asJson() {
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
    save(db, accDetailsContainer, addAnother) {
        const self = this
        const json = self.asJson()
        if (self.isNew())
            self.saveTxnData(db, json, accDetailsContainer, self, addAnother)
        else
            db.get(self.id).then(function (doc) {
                json._rev = doc._rev // in case it has been updated elsewhere
                self.saveTxnData(db, json, accDetailsContainer, self, addAnother);
            }).catch(function (err) {
                handle_db_error(err, 'Failed to retrieve your transaction.', true)
            })
    }

    saveTxnData(db, json, accDetailsContainer, self, addAnother) {
        db.put(json).then(function (result) {
            let acc = accDetailsContainer.props.activeAccount
            if (self.isNew()) {
                // update in mem model with new txn
                db.get(json._id, {include_docs: true}).then(function (newTxn) {
                    Account.updatePayees(db, accDetailsContainer.props.budget, self, self.txnPostSave(accDetailsContainer, acc, self, addAnother, newTxn))
                }).catch(function (err) {
                    handle_db_error(err, 'Failed to refresh list with your new transaction.', true)
                })
            } else
                Account.updatePayees(db, accDetailsContainer.props.budget, self, self.txnPostSave(accDetailsContainer, acc, self, addAnother, null))
        }).catch(function (err) {
            handle_db_error(err, 'Failed to save your transaction.', true)
        })
    }

    txnPostSave(accDetailsContainer, acc, self, addAnother, newTxn) {
        accDetailsContainer.editOff()
        acc.replaceTxn(self)
        let bud = accDetailsContainer.props.budget
        if (newTxn != null) {
            let tran = new Trans(newTxn)
            tran.enhanceData(bud)
            acc.txns.unshift(tran)
        }
        bud.updateTotal()
        accDetailsContainer.props.refreshBudgetState(bud)
        if (addAnother)
            accDetailsContainer.addTxn()
    }

    get amount() {
        if (this.out === "")
            this.out = 0
        return this.out > 0 ? -1 * parseFloat(this.out) : parseFloat(this.in)
    }

    get id() {
        return this.tid
    }

    isNew() {
        return this.rev === null
    }

    // return true if payee selected is an account
    // note we don't have closed in accounts list in payee list
    isPayeeAnAccount() {
        return Trans.idIsPayeeAnAccount(this.payee)
    }

    isPayeeAnInitBal() {
        return this.payee === INIT_BAL_PAYEE
    }

    static idIsPayeeAnAccount(id) {
        if (id === null)
            return false
        else {
            const items = id.split(KEY_DIVIDER)
            return items.length === 4 && items[0] === SHORT_BUDGET_KEY && items[2] === ACC_KEY
        }
    }

    // return true if cat selected is an income
    isCatItemIncome() {
        return typeof this.catItem !== "undefined" && this.catItem !== null && this.catItem.startsWith(INCOME_KEY)
    }

    static getIncomeCat() {
        const today = new Date()
        const dataToday = Trans.getIncomeKeyData(today)
        const todayMonthDigit = today.getMonth()
        const nextMonthDigit = todayMonthDigit === 11 ? 0 : todayMonthDigit + 1
        const nextMonth = new Date(today.setMonth(nextMonthDigit))
        const dataNext = Trans.getIncomeKeyData(nextMonth)
        return {
            id: "inc", type: "cat", groupName: "Income", weight: 0, items: [{
                id: dataToday[0],
                name: 'Income for ' + dataToday[1],
                type: 'catItem',
                cat: 'inc'
            }, {
                id: dataNext[0],
                name: 'Income for ' + dataNext[1],
                type: 'catItem',
                cat: 'inc'
            }]
        }
    }

    static getIncomeKeyData(date)
    {
        const monthDigit = date.getMonth()
        const year = date.getFullYear()
        const monthName = date.toLocaleString('default', {month: 'short'})
        return [INCOME_KEY + KEY_DIVIDER + year + ':' + monthDigit, monthName]
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

    valid(sourceAcc, budget) {
        let warningCount = 0
        let valid = true
        let errors = []
        // validate date:
        if (this.date === null) {
            valid = false
            errors.push('Please set a date.')
        }
        // validate amounts:
        if (this.in === 0 && this.out === 0) {
            valid = false
            errors.push('In or out must be greater than 0.')
        }
        // validate payee:
        if (!this.isCatItemIncome() && (typeof this.payeeName === "undefined" || this.payeeName.trim() === "")) {
            valid = false
            errors.push('Please select a payee.')
        }
        // validate cat when payee is an account:
        const hasCat = this.catItem !== null && this.catItem.trim() !== ""
        if (this.isPayeeAnAccount()) {
            const targetAcc = budget.getAccount(this.payee)
            // if source and target account are on budget then cat should be blank as this signifies an inter account
            // transfer however this is handled in the UI and not here

            // if source is on budget and target account is off budget then cat should be set
            if (sourceAcc.onBudget && !targetAcc.onBudget)
                if (!hasCat) {
                    valid = false
                    errors.push('As you are transferring funds from a budget account to an off budget account you should select a category.')
                }
        } else if (!this.isPayeeAnInitBal() && !hasCat) {
                valid = false
                errors.push('Please select a category.')
            }
        if (this.isCatItemIncome() && this.out > 0)
        {
            valid = false
            warningCount += 1
            errors.push('Did you mean to enter an outgoing?')
        }
        let allWarnings = errors.length === warningCount
        return {valid: valid, errors: errors, allWarnings: allWarnings}
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

    componentDidMount() {
        this.setState({startDate: this.props.startDate})
    }

    handleChange = date => {
        this.setState({
            startDate: date
        });
        this.props.handleChange(date)
        this.props.siblingFocus()
    };

    onKeyDown = (e) => {
        var TABKEY = 9
        var ENTER_KEY = 13
        if (e.keyCode === TABKEY || e.which === TABKEY || e.keyCode === ENTER_KEY || e.which === ENTER_KEY) {
            this.refs.datepicker.setOpen(false);
        }
    }

    // ugg - only suggested way to get tabbing to work from date is to use jquery
    //       and I had to use timeout to stop it setting focus on wrong field
    handleBlur = () => {
        this.props.siblingFocus()
    }

    render() {
        const {hasFocus, readOnly} = this.props
        return <DatePicker
                // TODO: add txn not opening calendar now I have added autoFocus
                autoFocus={hasFocus}
                openToDate={this.state.startDate}
                selected={this.state.startDate}
                onChange={this.handleChange}
                dateFormat='E MMM dd yyyy'
                startOpen={hasFocus}
                tabIndex={this.props.tabIndex}
                className='form-control'
                readOnly={readOnly}
                calendarClassName="date_pick"
                onKeyDown={this.onKeyDown}
                onBlur={this.handleBlur}
                ref="datepicker"
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

class TxnTd extends Component {

    render() {
        const props = this.props
        const fldName = props.fld + "Fld"
        const editFieldId = props.trState.editFieldId
        const txnInEdit = props.trState.txnInEdit
        return (<td fld_id={fldName} onClick={props.onClick}>
                {props.editTheRow && txnInEdit !== null ? <div>
                        <input autoFocus={editFieldId === fldName}
                               type='text'
                               value={txnInEdit[props.fld]}
                               onChange={props.onChange}
                               onFocus={e => e.target.select()}
                               tabindex={props.tabindex}
                               ref={props.fld}
                               className={this.props.classes + ' form-control'}
                        />
                        {props.incSave && <div id="txn_save">
                            <button onClick={(event => props.saveTxn(txnInEdit, false))} type="button "
                                    className='btn prim_btn'>Save
                            </button>
                            {props.addingNew && <button onClick={(event => props.saveTxn(txnInEdit, true))} type="button "
                                                        className='btn prim_btn'>Save & add another
                            </button>}
                            <button onClick={(event => props.cancelEditTxn(event))} type="button "
                                    className='btn btn-secondary'>Cancel
                            </button>
                        </div>}
                    </div>
                    :
                    props.isCcy ? <Ccy verbose={false} amt={props.row[props.fld]}/> : props.row[props.fld]}
            </td>
        )
    }
}

TxnTd.defaultProps = {
    incSave: false,
    isCcy: false,
    classes: ''
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
    // TODO: remove
    // state = {editFieldId: null, txnInEdit: null, catSuggest: null, disableCat: this.props.row.isPayeeAnAccount()}
    state = {editFieldId: null, txnInEdit: null, catSuggest: null}

    // TODO: I added this when budget screwed up and add txn didnt work - do I still need it?
    componentDidMount(){
        if (this.props.addingNew)
            this.setState({editFieldId: dateFld, txnInEdit: TxnTr.getRowCopy(this.props.row)})
    }

    componentWillReceiveProps(nextProps) {
        const {editTheRow, row} = nextProps
        if (editTheRow && row !== null) {
            let state = {disableCat: !this.isCatRequired()}
            if (this.state.txnInEdit === null) {
                state['txnInEdit'] = TxnTr.getRowCopy(row)
                if (nextProps.addingNew)
                    state['editFieldId'] = dateFld
            }
            this.setState(state)
        } else if (nextProps.addingNew)
            this.setState({editFieldId: dateFld})
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

    saveTxn = (txn, addAnother) => {
        // TODO: prevent heading saying local host - maybe use the bootstrap pluging - if so then replace all uses of alert?
        const details = txn.valid(this.props.account, this.props.budget)
        let proceed = false
        if (!details.valid && details.allWarnings)
        {
            // show warnings
            const warnMsg = details.errors.join('\n')
            proceed = window.confirm(warnMsg)
        }
        else
            proceed = details.valid
        if (proceed)
            this.setState({txnInEdit: null, editFieldId: null}, function () {
                this.props.saveTxn(txn, addAnother)
            })
        else if (!details.allWarnings){
            let msg = 'Please correct the following before saving:\n\n'
            msg += details.errors.join('\n')
            alert(msg)
        }
    }

    cancelEditTxn = () => {
        this.setState({txnInEdit: null, editFieldId: null}, function () {
            this.props.cancelEditTxn()
        })
    }

    handleDateChange = (date) => {
        let txnInEdit = this.state.txnInEdit
        txnInEdit.date = date
        this.setState({txnInEdit: txnInEdit})
    }

    // if payee is an account then
    //      - if source and target account are on budget then cat should be blank as this signifies an inter account transfer
    //      - if source is on budget and target account is off budget then cat should be set so you can define what
    //        pot cash if transferred from - ie transfer
    //      - if source is off budget and target account is on budget then cat should be blank as this is transfer
    //      - if source and target account are off budget then cat should be blank as this signifies an inter account off budget transfer
    // else
    //      - if account is on budget then cat is required
    //      - if account is off budget then cat is not required
    // TODO: test all of this
    isCatRequired = () => {
        const payee = this.state.txnInEdit !== null ? this.state.txnInEdit.payee : this.props.row.payee
        if (payee === null)
            return true
        else if (Trans.idIsPayeeAnAccount(payee))
        {
            const targetAcc = this.props.budget.getAccount(payee)
            let catRequired
            if (this.props.account.onBudget && targetAcc.onBudget)
                catRequired = false
            else if (this.props.account.onBudget && !targetAcc.onBudget)
                catRequired = true
            else if (!this.props.account.onBudget && targetAcc.onBudget)
                catRequired = false
            else if (!this.props.account.onBudget && !targetAcc.onBudget)
                catRequired = false
            return catRequired
        }
        else
            return this.props.account.onBudget
    }

    handlePayeeChange = selectedOption => {
        const self = this
        let txnInEdit = this.state.txnInEdit
        txnInEdit.payee = selectedOption.id
        txnInEdit.payeeName = selectedOption.name
        let state = {txnInEdit: txnInEdit}
        if (this.props.addingNew && selectedOption.catSuggest != null)
            state['catSuggest'] = this.props.budget.getCatItem(selectedOption.catSuggest)
        this.setState(state, function () {
            // TODO: remove?
            console.log(this.state.txnInEdit.payee)
            console.log(this.state.txnInEdit.payeeName)
            // if the user is adding a payee then we want to stay on payee so dont switch to cat
            // if (this.state.txnInEdit.payee !== null) {
                // if source and target account are on budget then cat should be blank as this signifies in inter account transfer
                if (!this.isCatRequired()) {
                    // clear out and disable cat and set focus on memo
                    let txnInEdit = this.state.txnInEdit
                    txnInEdit.catItem = ''
                    txnInEdit.catItemName = ''
                    self.setState({txnInEdit: txnInEdit, disableCat: true}, function () {
                        self.focusMemo()
                    })
                } else {
                    // enable cat and set focus on cat
                    self.setState({disableCat: false}, function () {
                        self.focusCat()
                    })
                }
            // }
        })
    }

    handleCatChange = (selectedOption, itemHilited) => {
        let txnInEdit = this.state.txnInEdit
        txnInEdit.catItem = selectedOption.id
        txnInEdit.catItemName = selectedOption.name
        this.setState({txnInEdit: txnInEdit}, function () {
            this.focusMemo()
        })
    }

    handleInputChange = (event, fld, isCcy) => {
        let val = event.target.value
        let txnInEdit = this.state.txnInEdit
        // if ccy then ensure only floats allowed, I did it like this as using NumberFormat (inside CCY)
        // lead to all kinds of state issues
        if (isCcy) {
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

    focusSib = (className) => {
        setTimeout(function () {
            $('.' + className + ':first-child').focus();
        }, 10)
    }

    focusPayee = () => {
        this.focusSib('payee_inp')
    }

    focusCat = () => {
        this.focusSib('cat_inp')
    }

    focusMemo = () => {
        this.focusSib('memo_inp')
    }

    // inout value: https://medium.com/capital-one-tech/how-to-work-with-forms-inputs-and-events-in-react-c337171b923b
    // if an account is selected in txn then cat should be blank as this signifies a transfer from one account to another
    render() {
        const payFld = "payFld"
        const catFld = "catFld"
        const memoFld = "memo"
        const outFld = "out"
        const inFld = "in"
        const {
            row, isChecked, toggleTxnCheck, toggleFlag, toggleCleared,
            payees, catItems, editTheRow
        } = this.props
        if (typeof row == 'undefined')
            return (<tr></tr>)
        else {
            return (
                <tr className={isChecked || editTheRow ? 'edit_row' : ''}
                    onClick={(event) => this.txnSelected(event, row)}>

                    {/* checkbox */}
                    <td className="txn_sel" fld_id="selFld" onClick={(event => this.tdSelected(event))}>
                        <input onChange={(event) => toggleTxnCheck(event, row)}
                               type="checkbox" checked={isChecked} tabindex="1"/>
                    </td>

                    {/* flagged */}
                    <td fld_id="flagFld" onClick={(event => this.tdSelected(event))}>
                        <FontAwesomeIcon icon={faFlag} className={row.flagged ? "flagged flag" : "flag"}
                                         onClick={() => toggleFlag(row, true)}/>
                    </td>

                    {/* date */}
                    <td fld_id={dateFld} onClick={(event => this.tdSelected(event))}>
                        {editTheRow ? <TxnDate handleChange={this.handleDateChange}
                                               tabindex="2"
                                               hasFocus={editTheRow && this.state.editFieldId === dateFld}
                                               startDate={row.date}
                                               siblingFocus={this.focusPayee}
                        /> : formatDate(row.date)}
                    </td>

                    {/* payees */}
                    <td fld_id={payFld} className="table_ddown" onClick={(event => this.tdSelected(event))}>
                        {editTheRow && <DropDown options={payees}
                                                 grouped={true}
                                                 hasFocus={editTheRow && this.state.editFieldId === payFld}
                                                 changed={this.handlePayeeChange}
                                                 id={row.payee}
                                                 value={row.payeeName}
                                                 classes={"payee_inp"}
                                                 tabindex="3"
                                                 allowAdd={true}
                                                 newEntryName={'Payee'}
                        />}
                        {/* if I don't split into separate lines then the ddown does not open when input box gets focus */}
                        {!editTheRow && row.isPayeeAnAccount() && row.payeeName}
                        {!editTheRow && row.isPayeeAnAccount() &&
                        <FontAwesomeIcon icon={faExchangeAlt} className="ml-1" aria-hidden="true"/>}
                        {!editTheRow && !row.isPayeeAnAccount() && row.payeeName}
                    </td>

                    {/* category items */}
                    <td fld_id={catFld} className="table_ddown" onClick={(event => this.tdSelected(event))}>
                        {editTheRow ? <DropDown options={catItems}
                                                grouped={true}
                                                hasFocus={editTheRow && this.state.editFieldId === catFld}
                                                changed={this.handleCatChange}
                                                id={row.catItem}
                                                value={row.catItemName}
                                                tabindex="4"
                                                classes={"cat_inp"}
                                                autoSuggest={this.state.catSuggest}
                                                disabled={this.state.disableCat}
                                                clear={this.state.disableCat}
                        /> : row.catItemName}
                    </td>

                    <TxnTd
                        fld={memoFld}
                        row={row}
                        editTheRow={editTheRow}
                        trState={this.state}
                        onClick={(event) => this.tdSelected(event)}
                        onChange={(event) => this.handleInputChange(event, memoFld, false)}
                        tabindex="5"
                        classes={"memo_inp"}
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
                        incSave={true}
                        addingNew={this.props.addingNew}
                        saveTxn={this.saveTxn}
                        cancelEditTxn={this.cancelEditTxn}
                        tabindex="6"
                        classes={"out_inp"}
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
                        tabindex="7"
                        classes={"in_inp"}
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
        return <div
            onClick={typeof this.props.row != 'undefined' ? () => this.props.toggleCleared(this.props.row) : false || null}
            className={"cleared" + (this.props.cleared ? " has_cleared" : "")}>C</div>;
    }
}
