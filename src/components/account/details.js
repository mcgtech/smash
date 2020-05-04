import React, {Component} from 'react'
import Ccy from '../../utils/ccy'
import {TxnForm, TxnCleared, TxnTr, TxnDate} from './trans'
import {AccDashHead} from './dash'
import Account from "./account";
import * as PropTypes from "prop-types";
import {DESC} from './sort'
import {DATE_ROW, FLAGGED_ROW, PAYEE_ROW, CAT_ITEM_ROW, MEMO_ROW, IN_ROW, OUT_ROW, CLEAR_ROW} from './rows'

export const OUT_EQUALS_TS = 0;
export const OUT_MORE_EQUALS_TS = 1;
export const OUT_LESS_EQUALS_TS = 2;
export const IN_EQUALS_TS = 3;
export const IN_MORE_EQUALS_TS = 4;
export const IN_LESS_EQUALS_TS = 5;
export const PAYEE_TS = 6;
export const CAT_TS = 7;
export const MEMO_TS = 8;
export const DATE_EQUALS_TS = 9;
export const DATE_MORE_EQUALS_TS = 10;
export const DATE_LESS_EQUALS_TS = 11;
export const DEF_TXN_FIND_TYPE = OUT_EQUALS_TS

// TODO: when click on row hilite it and select check box
class AccDetailsHeader extends Component
{
    state = {
        allFlagged: false
    }

    // TODO: make responsive and sortable that can handle lots of rows
    // TODO: when edit field, when hit enter, go to next field
    // TODO: decide how to handle no internet - in regards to icons etc
    render() {
        const {selectAllTxns, account, allTxnsChecked, txnOrder, sortCol} = this.props
        return (
            <thead>
            <tr className="txn_row">
                <th className="txn_sel"><input onClick={(event) => selectAllTxns(event, account)} type="checkbox" checked={allTxnsChecked}/></th>
                <TxnRowColHead txnOrder={txnOrder} rowId={FLAGGED_ROW} rowHead='Flag' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId={DATE_ROW} rowHead='Date' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId={PAYEE_ROW} rowHead='Payee' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId={CAT_ITEM_ROW} rowHead='Category' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId={MEMO_ROW} rowHead='Memo' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId={OUT_ROW} rowHead='Outflow' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId={IN_ROW} rowHead='Inflow' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId={CLEAR_ROW} rowHead='Cleared' sortCol={sortCol}/>
            </tr>
            </thead>
        )
    }
}

const TxnRowColHead = props => {
    const {txnOrder, rowId, rowHead, sortCol} = props
    return (
        <th onClick={(event) => sortCol(rowId)}  className={txnOrder.rowId === rowId ? (txnOrder.dir === DESC ? 'sort_up' : 'sort_down') : ''}>{rowHead}</th>
    )
}

// https://www.taniarascia.com/getting-started-with-react/ - form section
class AccDetailsAction extends Component {
    initialState = {
        searchActive: false, type: DEF_TXN_FIND_TYPE, target: '', exact: true, dateSearch: false, textSearch: false,
        floatSearch: true
    }

    state = this.initialState

    searchActive = (active) => {
        this.setState({searchActive: active})
    }

    handleDateChange = (date) => {
        this.setState({target: date.toISOString().substr(0, 10)})
    }

    resetTxns = () => {
        this.setState(this.initialState, function(){this.props.resetTxns()})
    }

    // https://reactjs.org/docs/forms.html
    handleChange = (event) => {
        const dateTypes = [DATE_EQUALS_TS, DATE_MORE_EQUALS_TS, DATE_LESS_EQUALS_TS]
        const textTypes = [PAYEE_TS, CAT_TS, MEMO_TS]
        const floatTypes = [OUT_EQUALS_TS, OUT_MORE_EQUALS_TS, OUT_LESS_EQUALS_TS, IN_EQUALS_TS, IN_MORE_EQUALS_TS, IN_LESS_EQUALS_TS]
        const target = event.target
        let value = target.name === 'exact' ? target.checked : target.value
        const name = target.name
        const typeId = parseInt(value)
        let dateSearch = name === 'type' && dateTypes.includes(typeId)
        let textSearch = name === 'type' && textTypes.includes(typeId)
        let floatSearch = name === 'type' && floatTypes.includes(typeId)
        if (this.state.floatSearch)
            // remove commas
            value = value.replace(/,/g, '');
        const hasTarget = this.state.target !== ''
        let state = {
            [name]: value,
        }
        // if event is a type selection
        if (name === 'type')
        {
            state['dateSearch'] = dateSearch
            state['textSearch'] = textSearch
            state['floatSearch'] = floatSearch
        }
        // if switching from date to other type then need to clear out the date
        if (this.state.dateSearch && !dateSearch)
            state['target'] = ''
        // set default date target
        if (dateSearch && !hasTarget)
            // if date not yet selected then need to set default
            // TODO: maybe store as a default date somewhere as I use it in default state (search for it)?
            state['target'] = new Date()
        this.setState(state)
    }

    render() {
        const {addTxn, makeTransfer, totalSelected, deleteTxns, filterTxns} = this.props
        return (
            <div className="actions">
                <div>
                    <button type="button "className='btn sec_btn' onClick={addTxn}><i className="fas pr-1 fa-plus"></i>Add Txn</button>
                    <button type="button "className='btn sec_btn' onClick={makeTransfer}><i className="fas pr-1 fa-exchange-alt"></i>Make Transfer
                    </button>
                    {totalSelected !== 0 && <button type="button "className='btn sec_btn' onClick={(event) => deleteTxns()}>
                        <i className="far pr-1 fa-trash-alt"></i>Delete</button>}
                </div>
                {totalSelected !== 0 && <div className="col">
                    <div id="sel_tot"><Ccy amt={totalSelected}/></div>
                </div>}
                <div id="txn_search">
                    <div id="txn_search_lhs">
                        {this.state.dateSearch ?
                            <TxnDate hasFocus={true} handleChange={this.handleDateChange}/>
                            :
                            this.state.textSearch ?
                                <input id="target" type="text" className="form-control" placeholder="search"
                                   name="target"
                                   value={this.state.target}
                                   onChange={(event) => this.handleChange(event,true)}
                                   onFocus={(event) => this.searchActive(true)}
                                   />
                                :
                                <Ccy amt={this.state.target} displayType="input" verbose={true} allowNegative={false}
                                   name="target"
                                   prefix={''}
                                   placeholder={'search'}
                                   onFocus={() => this.searchActive(true)}
                                   onChange={(event) => this.handleChange(event)}
                            />
                        }
                        <select className={"form-control " + (this.state.searchActive ? '' : 'd-none')}
                               name="type"
                               value={this.state.type}
                               onChange={(event) => this.handleChange(event)}
                        >
                            <option value={OUT_EQUALS_TS}>Outflow equals</option>
                            <option value={OUT_MORE_EQUALS_TS}>Outflow more or equal to</option>
                            <option value={OUT_LESS_EQUALS_TS}>Outflow less or equal to</option>
                            <option value={IN_EQUALS_TS}>Inflow equals</option>
                            <option value={IN_MORE_EQUALS_TS}>Inflow more or equal to</option>
                            <option value={IN_LESS_EQUALS_TS}>Inflow less or equal to</option>
                            <option value={PAYEE_TS}>In Payee</option>
                            <option value={CAT_TS}>In Category</option>
                            <option value={MEMO_TS}>In Memo</option>
                            <option value={DATE_EQUALS_TS}>Date Equals</option>
                            <option value={DATE_MORE_EQUALS_TS}>Date more or equal to</option>
                            <option value={DATE_LESS_EQUALS_TS}>Date less or equal to</option>
                        </select>
                    </div>
                    <div className={this.state.searchActive ? '' : 'd-none'}>
                        <button type="button" className="btn prim_btn float-left"
                                disabled={this.state.target.length > 0 ? false : true}
                                onClick={(event) => filterTxns(this.state)}>Search</button>
                        <button type="button" className="btn btn-secondary float-left"
                                onClick={(event) => this.resetTxns()}>Reset</button>
                        <div className={this.state.textSearch ? '' : 'd-none'} id="exact_block">
                            <input id="exact" type="checkbox"
                                name="exact"
                                onChange={(event) => this.handleChange(event)}
                                checked={this.state.exact}
                            />
                            <label htmlFor="exact">exact</label>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

TxnCleared.propTypes = {
    onClick: PropTypes.func,
    row: PropTypes.any
};

class AccDetailsBody extends Component
{
    render() {
        const {account, txnFind, toggleCleared, toggleFlag, toggleTxnCheck, txnsChecked, accounts,
            catItems, payees, editTxn, txnSelected, saveTxn, cancelEditTxn, pageSize, lastPaginId} = this.props
        let rows = []
        if (account) {
            let total = 0
            const len = account.txns.length
            let rowId
            for (rowId = 0; rowId < len && total < pageSize; rowId++) {
                let row = account.txns[rowId]
                if (lastPaginId == null || rowId > lastPaginId)
                {
                    const allow = Account.allowDisplay(row, txnFind)
                    if (allow)
                    {
                        const isChecked = typeof txnsChecked == 'undefined' ? false : txnsChecked.includes(row.id)
                        let trRow = <TxnTr row={row} isChecked={isChecked} txnSelected={txnSelected} toggleTxnCheck={toggleTxnCheck}
                                   toggleFlag={toggleFlag} toggleCleared={toggleCleared} editTxn={editTxn}
                                   accounts={accounts} payees={payees} saveTxn={saveTxn} cancelEditTxn={cancelEditTxn}
                                   catItems={catItems}/>
                        rows.push(trRow)
                        total += 1
                    }
                }
            }
            lastPaginId = rowId
            return (<tbody><TxnForm accounts={accounts} payees={payees}/>{rows}</tbody>)
        } else
            return (<tbody><TxnForm accounts={accounts} payees={payees}/><TxnForm/></tbody>)
    }
}

const AccSummary = props => {
    const {activeAccount} = props
    return (
        <div id="acc_summ">
            <div className={'acc_body'}>
                <div className={'acc_overview'}>
                    <div className={'acc_name ellipsis'}>{activeAccount.name}</div>
                    <div className={'acc_stats'}>
                        <div>
                            <div className={'acc_balance'}>
                                <div>
                                    <div className={'acc_title'}>Cleared</div>
                                    <div className={'acc_value'}><Ccy amt={activeAccount.clearedBalance}/></div>
                                </div>
                            </div>
                            <div className={'acc_operator'}>+</div>
                            <div className={'acc_balance'}>
                                <div>
                                    <div className={'acc_title'}>Uncleared</div>
                                    <div className={'acc_value'}><Ccy amt={activeAccount.unclearedBalance}/></div>
                                </div>
                            </div>
                            <div className={'acc_operator'}>=</div>
                            <div className={'acc_balance'}>
                                <div>
                                    <div className={'acc_title'}>Working</div>
                                    <div className={'acc_value'}><Ccy amt={activeAccount.workingBalance}/></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
            )
}

class AccDetails extends Component {
    defaultState = {
        txnsChecked: [],
        allTxnsChecked: false,
        totalSelected: 0,
        searchType: OUT_EQUALS_TS,
        searchTarget: '',
        selectedIndexes: [],
        rows: [],
        editTxn: null // if user clicks twice on a txn row then they will be able to edit the fields
    }

    state = this.defaultState

    componentWillReceiveProps(nextProps)
    {
        this.setState(this.defaultState)
    }
    toggleCleared = () => {}

    // https://stackoverflow.com/questions/37440408/how-to-detect-esc-key-press-in-react-and-how-to-handle-it/46123962
    constructor(props) {
        super(props);
        this.escFunction = this.escFunction.bind(this);
        this.mouseFunction = this.mouseFunction.bind(this);
    }


  // TODO: remove unused fns
    editOff() {
        this.setState({editTxn: null})
    }

    escFunction(event) {
        if (event.keyCode === 27) {
            this.editOff();
        }
    }

    saveTxn = (event, txn) => {
        console.log(event.target)
    }

    cancelEditTxn = (event) => {
        this.editOff();
    }

    // TODO: use editMode switch to editting the txn
    // TODO: handle added/delete txn
    // row selected
    txnSelected = (event, txn) => {
        this.toggleTxn(true, txn);
        // only go to edit mode if the checkbox hasn't been click or the save or cancel button clicked
        if (event.target.type !== "checkbox" && event.target.type !== "submit")
        {
            if (this.state.txnsChecked.includes(txn.id))
                this.setState({editTxn: txn.id})
        }
    }
    mouseFunction(event) {
        if (!document.getElementById("txns_block").contains(event.target))
            this.editOff();
    }

    componentDidMount() {
        document.addEventListener("keydown", this.escFunction, false);
        document.addEventListener("mousedown", this.mouseFunction, false);
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.escFunction, false);
        document.removeEventListener("mousedown", this.mouseFunction, false);
    }

    selectAllTxns = (event, acc) => {
        if (event.target.checked)
        {
            let summ = acc.getTxnSumm()
            this.setState({txnsChecked: summ[0], totalSelected: summ[1], allTxnsChecked: true, editTxn: null})
        }
        else
            this.setState({txnsChecked: [], totalSelected: 0, allTxnsChecked: false, editTxn: null})
    }

    // check box clicked
    toggleTxnCheck = (event, txn) => {
        const checked = event.target.checked
        this.toggleTxn(checked, txn, !checked)
    }

    toggleTxn(checked, txn, resetEdit) {
        // TODO: ensure that total doenst keep increasing if I keep clicking on row
        let tot = this.state.totalSelected
        let checkList = null
        if (checked) {
            if (!this.state.txnsChecked.includes(txn.id))
            {
                tot += txn.amount
                checkList = [...this.state.txnsChecked, txn.id]
            }
        } else {
            checkList = this.state.txnsChecked.filter(id => id !== txn.id)
            tot -= txn.amount
        }
        let state = {totalSelected: parseFloat(tot.toFixed(2)), txnsChecked: checkList}
        if (resetEdit)
            state['editTxn'] = null
        if (checkList != null)
            this.setState(state)
    }

    // TODO: is this being called multiple time on page load - if so why?
    render() {
        const {activeAccount, toggleCleared, addTxn, makeTransfer, toggleFlag, filterTxns,
            deleteTxns, accounts, payees, budget, firstPage, prevPage, nextPage, lastPage,
            txnFind, sortCol, resetTxns, pageSize, lastPaginId} = this.props
        return (
            <div id="acc_details_cont" className="panel_level1">
                <AccDashHead budget={budget} burger={true}/>
                <AccSummary activeAccount={activeAccount}/>
                <AccDetailsAction addTxn={addTxn} makeTransfer={makeTransfer}
                                  totalSelected={this.state.totalSelected}
                                  resetTxns={resetTxns}
                                  filterTxns={filterTxns}
                                  deleteTxns={() => deleteTxns(this.state.txnsChecked)}/>
                <div id="txns_block" className="lite_back">
                   {/*TODO: see https://github.com/adazzle/react-data-grid/pull/1869 for lazy loading?*/}
                   {/* https://github.com/adazzle/react-data-grid/issues/836*/}
                    <table className="table table-striped table-condensed table-hover table-sm">
                        <AccDetailsHeader account={activeAccount}
                                          allTxnsChecked={this.state.allTxnsChecked}
                                          selectAllTxns={this.selectAllTxns}
                                          txnOrder={txnFind.txnOrder}
                                          sortCol={sortCol}
                        />
                        <AccDetailsBody account={activeAccount}
                                        txnFind={txnFind}
                                        toggleCleared={toggleCleared}
                                        toggleFlag={toggleFlag}
                                        txnSelected={this.txnSelected}
                                        txnsChecked={this.state.txnsChecked}
                                        editTxn={this.state.editTxn}
                                        accounts={accounts}
                                        payees={payees}
                                        toggleTxnCheck={this.toggleTxnCheck}
                                        saveTxn={this.saveTxn}
                                        lastPaginId={lastPaginId}
                                        pageSize={pageSize}
                                        cancelEditTxn={this.cancelEditTxn}/>
                    </table>
                    {activeAccount.txns.length > pageSize && <div id="pagin_controls" className="float-right">
                        <span onClick={firstPage}>First</span>
                        <span onClick={prevPage}>Prev</span>
                        <span onClick={nextPage}>Next</span>
                        <span onClick={lastPage}>Last</span>
                    </div>}
                </div>
            </div>
        )
    }
}

export default AccDetails