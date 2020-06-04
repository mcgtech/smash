import React, {Component} from 'react'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import * as PropTypes from "prop-types"
import Ccy from "../../utils/ccy"
import DropDown from "../../utils/dropDown"
import {strToFloat} from "../../utils/numbers"
import {getDateIso, formatDate} from "../../utils/date"
import Account from "./account"
import {ACC_KEY, KEY_DIVIDER, INCOME_KEY, TXN_PREFIX, SHORT_BUDGET_PREFIX, SHORT_BUDGET_KEY, ACC_PREFIX} from './keys'
import {INIT_BAL_PAYEE} from './budget_const'
import {handle_db_error} from "../../utils/db";
import {v4 as uuidv4} from 'uuid'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faExchangeAlt} from '@fortawesome/free-solid-svg-icons'
import {faFlag} from '@fortawesome/free-regular-svg-icons'
import $ from "jquery";
import {enterEvent, tabEvent} from "../../utils/eventHandlers";

export default class Trans {
    constructor(doc, budget, account) {
        if (doc === null) {
            this.tid = Trans.getNewId(budget.shortId)
            this.trev = null
            this.tacc = account.shortId
            this.tbudShort = budget.shortId
            this.tdate = new Date()
            this.tflagged = false
            this.tclear = false
            this.tin = 0
            this.tout = 0
            this.tcatItem = ""
            this.tpay = ""
            this.tmemo = ""
            // id of equal and opposite txn in a transfer
            this.ttransfer = null
        } else {
            this.tid = doc._id
            this.trev = doc._rev
            // TODO
            this.tacc = doc.acc
            if (typeof budget !== "undefined")
                this.taccObj = budget.getAccount(this.longAccId)
            this.tbudShort = doc.budShort
            this.tdate = new Date(doc.date)
            this.tflagged = doc.flagged
            this.tclear = doc.cleared
            this.tout = parseFloat(doc.out)
            this.tin = parseFloat(doc.in)
            this.tcatItem = doc.catItem
            this.tpay = doc.payee
            this.tmemo = doc.memo
            // id of equal and opposite txn in a transfer
            this.ttransfer = doc.transfer
        }
        // TODO: I do this in a number of place so move into util fn
        const lastDividerPosn = this.id.lastIndexOf(KEY_DIVIDER)
        this.ashortId = this.id.substring(lastDividerPosn + 1)
    }

    get longAccId() {
        return SHORT_BUDGET_PREFIX + this.budShort + KEY_DIVIDER + ACC_PREFIX + this.acc
    }

    get accObj()
    {
        return this.taccObj
    }

    set accObj(accObj)
    {
        this.taccObj = accObj
    }

    get accName()
    {
        return this.accObj.name
    }

    get budShort() {
        return this.tbudShort;
    }

    get shortId() {
        return this.ashortId;
    }

    // add cat and payee display data
    enhanceData(budget, cats, payees, acc) {
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
        this.accObj = acc
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
            "budShort": this.budShort,
            "flagged": this.flagged,
            "date": getDateIso(this.date),
            "catItem": this.catItem,
            "memo": this.memo,
            "out": this.out,
            "in": this.in,
            "payee": this.payee,
            "cleared": this.clear,
            "transfer": this.transfer
        }
    }

    // save the txn
    // TODO: test txn crud in all accs and single acc - try no refresh and refresh
    // TODO: test txn transfer crud in all accs and single acc - try no refresh and refresh
    save(db, accDetailsContainer, addAnother) {
        const self = this
        let opposite = null
        let budget = accDetailsContainer.props.budget
        let acc = self.accObj
        const targetAcc = accDetailsContainer.props.budget.getAccount(self.payee)
        const isTransfer = this.isPayeeAnAccount()
        const hasOpposite = typeof self.transfer !== "undefined" && self.transfer !== null
        const origTxn = acc.getTxn(self.id) // get txn that is in mem list
        const changeOfPayeeAcc = isTransfer && origTxn !== null && origTxn.isPayeeAnAccount() && origTxn.payee !== self.payee

        // add/update to in memory list of txns
        acc.applyTxn(self, null)
        budget.payees = Account.getUpdatedPayees(db, budget, self, [])

        // if we are changing a transfers payee account then we have to remove the opposite from
        // the original target acc
        if (changeOfPayeeAcc)
        {
            const origTargetAcc = accDetailsContainer.props.budget.getAccount(origTxn.payee)
            origTargetAcc.txns = origTargetAcc.txns.filter((txn, i) => {return txn.id !== origTxn.transfer})
        }

        // if txn is a transfer and transfer has not already been saved
        if (isTransfer)
        {
            if (hasOpposite)
            {
                // update the opposite
                db.get(self.transfer).then(function(doc){
                    opposite = self.getTransferOpposite(budget, accDetailsContainer.props.activeAccount, targetAcc, new Trans(doc, budget))
                    self.updateTxn(db, budget, acc, opposite, accDetailsContainer, addAnother, targetAcc)
                })
            }
            else
            {
                // create opposite
                opposite = this.getTransferOpposite(budget, accDetailsContainer.props.activeAccount, targetAcc, null)
                self.transfer = opposite.id
                self.updateTxn(db, budget, acc, opposite, accDetailsContainer, addAnother, targetAcc);
            }
        }
        else
        {
            if (hasOpposite)
            {
                // delete opposite
                const transId = self.transfer
                db.get(self.transfer).then(function(doc){
                    doc._deleted = true
                    db.put(doc).then(function(){
                        // get account that opp txn in
                        const txnDetails = accDetailsContainer.props.budget.getTxn(transId)
                        const oppAcc = txnDetails[1]
                        opposite = null
                        // update in mem list
                        oppAcc.txns = oppAcc.txns.filter((txn, i) => {return txn.id !== transId})
                        self.updateTxn(db, budget, acc, opposite, accDetailsContainer, addAnother, targetAcc)
                    })
                })
            }
            else
                self.updateTxn(db, budget, acc, opposite, accDetailsContainer, addAnother, targetAcc)
        }
    }

    updateTxn(db, budget, acc, opposite, accDetailsContainer, addAnother, targetAcc) {
        const self = this
        // note: I was getting conflict error with bulkDocs even with correct _rev, so I switched to doing it like this
        db.get(budget.id).then(function (result) {
            // update budget
            budget.rev = result._rev
            return db.put(budget.asJson())
        })
            .then(function (result) {
                budget.rev = result.rev
                // if its not new then we need to do a get first to ensure rev is correct
                if (self.isNew())
                    self.postTxnGet(db, acc, opposite, accDetailsContainer, budget, addAnother, targetAcc)
                else
                    db.get(self.id).then(function (result) {
                        self.postTxnGet(db, acc, opposite, accDetailsContainer, budget, addAnother, targetAcc)
                    })
            })
            .catch(function (err) {
                handle_db_error(err, 'Failed to save the txn.', true)
            });
    }

    postTxnGet(db, acc, opposite, accDetailsContainer, budget, addAnother, targetAcc) {
        const self = this
        const txnJson = self.asJson()
        db.put(txnJson).then(function (txnResult) {
            acc.applyTxn(self, txnResult)
            // save opposite if this is a transfer
            if (opposite !== null)
                    db.put(opposite.asJson()).then(function (oppResult) {
                        // add/update in memory list of txns
                        targetAcc.applyTxn(opposite, oppResult)
                        Trans.postTxnSave(accDetailsContainer, budget, addAnother)
                    })
                .catch(function (err) {
                    handle_db_error(err, 'Failed to save the opposite txn.', true)
                })
            else
                Trans.postTxnSave(accDetailsContainer, budget, addAnother)
        })
    }

    static postTxnSave(accDetailsContainer, budget, addAnother) {
        accDetailsContainer.editOff()
        budget.updateTotal()
        accDetailsContainer.props.refreshBudgetState(budget)
        if (addAnother)
            accDetailsContainer.addTxn()
    }

    getTransferOpposite(budget, activeAccount, targetAcc, prevOpposite)
    {
        // https://stackoverflow.com/questions/41474986/how-to-clone-a-javascript-es6-class-instance
        let opposite = Object.assign(Object.create(Object.getPrototypeOf(this)), this)
        if (prevOpposite === null)
        {
            opposite.id = Trans.getNewId(budget.shortId)
            opposite.rev = ''
        }
        else
        {
            opposite.id = prevOpposite.id
            opposite.rev = prevOpposite.rev
        }
        // switch amount
        if (opposite.out > 0)
        {
            opposite.in = opposite.out
            opposite.out = 0
        }
        else
        {
            opposite.out = opposite.in
            opposite.in = 0
        }
        // switch target account
        opposite.payee = activeAccount.id
        opposite.payeeName = activeAccount.name
        // set account
        opposite.acc = targetAcc.shortId
        // link to source txn
        opposite.transfer = this.id
        // category item
        // if on to off then opposite has no cat
        // if on to on then source & opposite have no cat
        // if off to off then source & opposite have no cat
        // if off to on then source & opposite have no cat
        opposite.catItem = ""
        opposite.catItemName = ""
        return opposite
    }

    get amount() {
        if (this.out === "")
            this.out = 0
        return this.out > 0 ? -1 * parseFloat(this.out) : parseFloat(this.in)
    }

    get id() {
        return this.tid
    }

    set id(id) {
        this.tid = id
    }

    get transfer() {
        return this.ttransfer
    }

    set transfer(transfer) {
        this.ttransfer = transfer
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
        const monthDigit = ("0" + (date.getMonth() + 1)).slice(-2)
        const year = date.getFullYear()
        const monthName = date.toLocaleString('default', {month: 'short'})
        return [INCOME_KEY + KEY_DIVIDER + year + ':' + monthDigit, monthName]
    }

    get acc() {
        return this.tacc
    }

    set acc(acc) {
        this.tacc = acc
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
        } else if (sourceAcc.onBudget && !this.isPayeeAnInitBal() && !hasCat) {
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
        if (enterEvent(e) || tabEvent(e)) {
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

    state = {value: null}

    componentWillReceiveProps(nextProps) {
        if (this.state.value === null && typeof nextProps.trState.txnInEdit !== "undefined" && nextProps.trState.txnInEdit !== null)
            this.setState({value: nextProps.trState.txnInEdit[this.props.fld]})
    }

    onKeyDown = (e) => {
        if (enterEvent(e) || tabEvent(e))
        {
            e.target.value = this.state.value
            // TODO: need to pass boolean to tell parent to tab to next
            this.props.onChange(e, true)
        }
    }


    onChange = (event) => {
        this.setState({value: event.target.value})
        this.props.onChange(event, false)
    }

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
                               onChange={this.onChange}
                               onFocus={e => e.target.select()}
                               tabindex={props.tabindex}
                               ref={props.fld}
                               className={props.classes + ' form-control'}
                               onKeyDown={this.onKeyDown}
                        />
                        {props.incSave && <div id="txn_save">
                            <button onClick={(event => props.saveTxn(txnInEdit, false))} type="button "
                                    className='btn prim_btn save_txn'>Save
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
    state = {editFieldId: dateFld, txnInEdit: null, catSuggest: null}

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
        else if (!editTheRow)
            this.setState({txnInEdit: null})
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
        txn.in = parseFloat(txn.in)
        txn.out = parseFloat(txn.out)
        let proceed
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
            // if the user is adding a payee then we want to stay on payee so dont switch to cat
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
        })
    }

    handleAccChange = (selectedOption, itemHilited) => {
        let txnInEdit = this.state.txnInEdit
        // txnInEdit.catItem = selectedOption.id
        // txnInEdit.catItemName = selectedOption.name
        this.setState({txnInEdit: txnInEdit}, function () {
            this.focusDate()
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

    handleInputChange = (event, fld, isCcy, useFn, postFn) => {
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
        this.setState({txnInEdit: txnInEdit}, function(){
            if (useFn && typeof postFn === "function")
                postFn()
        })
    }

    handleMemoInputChange = (event, fld, isCcy, gotoNext) => {
        this.handleInputChange(event, fld, isCcy, gotoNext, this.focusOut)
    }

    handleOutInputChange = (event, fld, isCcy, gotoNext) => {
        this.handleInputChange(event, fld, isCcy, gotoNext, this.focusIn)
    }

    handleInInputChange = (event, fld, isCcy, gotoNext) => {
        this.handleInputChange(event, fld, isCcy, gotoNext)
    }

    focusSib = (className) => {
        setTimeout(function () {
            $('.' + className + ':first-child').focus();
        }, 10)
    }

    focusDate = () => {
        this.focusSib('date_inp')
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

    focusOut = () => {
        this.focusSib('out_inp')
    }

    focusIn = () => {
        this.focusSib('in_inp')
    }

    // inout value: https://medium.com/capital-one-tech/how-to-work-with-forms-inputs-and-events-in-react-c337171b923b
    // if an account is selected in txn then cat should be blank as this signifies a transfer from one account to another
    render() {
        const payFld = "payFld"
        const accFld = "accFld"
        const catFld = "catFld"
        const memoFld = "memo"
        const outFld = "out"
        const inFld = "in"
        const {
            row, isChecked, toggleTxnCheck, toggleFlag, toggleCleared,
            payees, catItems, accItems, editTheRow, allAccs
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

                    {/* all accs */}
                    {allAccs &&
                    <td fld_id={accFld} className="table_ddown" onClick={(event => this.tdSelected(event))}>
                        {editTheRow ? <DropDown options={accItems}
                                                grouped={true}
                                                hasFocus={editTheRow && this.state.editFieldId === accFld}
                                                changed={this.handleAccChange}
                                                id={row.longAccId}
                                                value={row.catItemName}
                                                tabindex="2"
                                                classes={"cat_inp"}
                                                autoSuggest={this.state.catSuggest}
                                                clear={this.state.disableCat}
                        /> : row.accName}
                        </td>
                    }
                    {/* flagged */}
                    <td fld_id="flagFld" onClick={(event => this.tdSelected(event))}>
                        <FontAwesomeIcon icon={faFlag} className={row.flagged ? "flagged flag" : "flag"}
                                         onClick={() => toggleFlag(row, true)}/>
                    </td>

                    {/* date */}
                    <td fld_id={dateFld} onClick={(event => this.tdSelected(event))}>
                        {editTheRow ? <TxnDate handleChange={this.handleDateChange}
                                               tabindex="3"
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
                                                 tabindex="4"
                                                 allowAdd={true}
                                                 newEntryName={'Payee'}
                        />}
                        {/* if I don't split into separate lines then the ddown does not open when input box gets focus */}
                        {!editTheRow && row.isPayeeAnAccount() && row.payeeName}
                        {!editTheRow && row.isPayeeAnAccount() &&
                        <FontAwesomeIcon icon={faExchangeAlt} className="ml-1" aria-hidden="true"/>}
                        {!editTheRow && !row.isPayeeAnAccount() && row.payeeName}
                    </td>
                    {this.props.account.onBudget &&
                        <td fld_id={catFld} className="table_ddown" onClick={(event => this.tdSelected(event))}>
                        {editTheRow ? <DropDown options={catItems}
                                                grouped={true}
                                                hasFocus={editTheRow && this.state.editFieldId === catFld}
                                                changed={this.handleCatChange}
                                                id={row.catItem}
                                                value={row.catItemName}
                                                tabindex="5"
                                                classes={"cat_inp"}
                                                autoSuggest={this.state.catSuggest}
                                                disabled={this.state.disableCat}
                                                clear={this.state.disableCat}
                        /> : row.catItemName}
                        </td>
                    }
                    <TxnTd
                        fld={memoFld}
                        row={row}
                        editTheRow={editTheRow}
                        trState={this.state}
                        onClick={(event) => this.tdSelected(event)}
                        onChange={(event, gotoNext) => this.handleMemoInputChange(event, memoFld, false, gotoNext)}
                        tabindex="6"
                        classes={"memo_inp"}
                    />

                    <TxnTd
                        fld={outFld}
                        name="out"
                        row={row}
                        editTheRow={editTheRow}
                        trState={this.state}
                        onClick={(event) => this.tdSelected(event)}
                        onChange={(event, gotoNext) => this.handleOutInputChange(event, outFld, true, gotoNext)}
                        isCcy={true}
                        incSave={true}
                        addingNew={this.props.addingNew}
                        saveTxn={this.saveTxn}
                        cancelEditTxn={this.cancelEditTxn}
                        tabindex="7"
                        classes={"out_inp"}
                    />

                    <TxnTd
                        fld={inFld}
                        name="in"
                        row={row}
                        editTheRow={editTheRow}
                        trState={this.state}
                        onClick={(event) => this.tdSelected(event)}
                        onChange={(event, gotoNext) => this.handleInInputChange(event, inFld, true, gotoNext)}
                        isCcy={true}
                        tabindex="8"
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
