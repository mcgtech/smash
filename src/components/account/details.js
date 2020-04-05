import React, {Component} from 'react'
import Ccy from '../../utils/ccy'
import {TxnForm, TxnCleared, TxnTr} from './trans'
import {AccDashHead} from './dash'
import * as PropTypes from "prop-types";
import Account from "./account";

// TODO: when click on row hilite it and select check box
class AccDetailsHeader extends Component
{
    state = {
        allFlagged: false
    }

    selectAllFlags = () => {
        this.setState({allFlagged: !this.state.allFlagged})
        this.props.selectAllFlags(this.state.allFlagged)
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
                <th><i onClick={(event) => this.selectAllFlags()} className={'far fa-flag flag' + (this.state.allFlagged ? ' flagged' : '')}></i></th>
                <TxnRowColHead txnOrder={txnOrder} rowId='date' rowHead='Date' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId='payee' rowHead='Payee' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId='cat' rowHead='Category' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId='memo' rowHead='Memo' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId='out' rowHead='Outflow' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId='in' rowHead='Inflow' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId='clear' rowHead='Cleared' sortCol={sortCol}/>
            </tr>
            </thead>
        )
    }
}

const TxnRowColHead = props => {
    const {txnOrder, rowId, rowHead, sortCol} = props
    return (
        <th onClick={(event) => sortCol(rowId)}  className={txnOrder.rowId == rowId ? (txnOrder.dir == 'desc' ? 'sort_up' : 'sort_down') : ''}>{rowHead}</th>
    )
}

// https://www.taniarascia.com/getting-started-with-react/ - form section
class AccDetailsAction extends Component
{
      initialState = {
        searchActive: false, type: OUT_EQUALS_TS, target: '', exact: true, dateType: false
      }

      state = this.initialState

    searchActive = (active) => {
        this.setState({searchActive: active})
    }

    // https://reactjs.org/docs/forms.html
    handleChange = (event, updateActive) => {
        const dateTypes = [DATE_EQUALS_TS, DATE_MORE_EQUALS_TS, DATE_LESS_EQUALS_TS]
        const active = updateActive ? event.target.value.length > 0 : this.state.searchActive
        const target = event.target
        const value = target.name === 'exact' ? target.checked : target.value
        const name = target.name
        let dateType = false
        if (name == 'type' && dateTypes.includes(parseInt(value)))
            dateType = true
        this.setState({
            [name]: value,
            searchActive: active,
            dateType: dateType
        })
    }

    render() {
        const { searchActive, type, value } = this.state;
        const {addTxn, makeTransfer, totalSelected, deleteTxns, filterTxns, search} = this.props
        return (
            <div className="actions">
                <div>
                    <button type="button "className='btn sec_btn' onClick={addTxn}><i className="fas pr-1 fa-plus"></i>Add Txn</button>
                    <button type="button "className='btn sec_btn' onClick={makeTransfer}><i className="fas pr-1 fa-exchange-alt"></i>Make Transfer
                    </button>
                    {totalSelected != 0 && <button type="button "className='btn sec_btn' onClick={(event) => deleteTxns()}>
                        <i className="far pr-1 fa-trash-alt"></i>Delete</button>}
                </div>
                {totalSelected != 0 && <div className="col">
                    <div id="sel_tot"><Ccy amt={totalSelected}/></div>
                </div>}
                <div id="txn_search">
                    <div>
                        {/* TODO: use datepicker if this.state.dateType is true */}
                        <input id="target" type="text" className="form-control" placeholder="search"
                               name="target"
                               value={this.state.target}
                               onChange={(event) => this.handleChange(event,true)}
                               onFocus={(event) => this.searchActive(true)}
                               />
                        <select className={"form-control " + (this.state.searchActive ? '' : 'd-none')}
                               name="type"
                               value={this.state.type}
                               onChange={(event) => this.handleChange(event,false)}
                        >
                            <option value={OUT_EQUALS_TS}>Outflow equals</option>
                            <option value={OUT_MORE_EQUALS_TS}>Outflow more or equal to</option>
                            <option value={OUT_LESS_EQUALS_TS}>Outflow less or equal to</option>
                            <option value={IN_EQUALS_TS}>Inflow equals</option>
                            <option value={IN_MORE_EQUALS_TS}>Inflow more or equal to</option>
                            <option value={IN_LESS_EQUALS_TS}>Inflow less or equal to</option>
                            <option value={ANY_TS}>Any field</option>
                            <option value={PAYEE_TS}>In Payee</option>
                            <option value={CAT_TS}>In Category</option>
                            <option value={MEMO_TS}>In Memo</option>
                            <option value={DATE_EQUALS_TS}>Date Equals</option>
                            <option value={DATE_MORE_EQUALS_TS}>Date more or equal to</option>
                            <option value={DATE_LESS_EQUALS_TS}>Date less or equal to</option>
                        </select>
                    </div>
                    <div className={this.state.searchActive ? '' : 'd-none'}>
                        <div className="form-check" id="exact_block">
                            <input
                                    name="exact"
                                    onChange={(event) => this.handleChange(event,false)}
                                   checked={this.state.exact} type="checkbox" className="form-check-input" id="exact"/>
                                <label className="form-check-label" htmlFor="exact">exact</label>
                        </div>
                        {/* TODO: only enable button if input lenght > 0 */}
                        <button type="button" className="btn prim_btn float-left"
                            onClick={(event) => filterTxns(this.state)}>Search</button>
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
    // TODO: remove this
     isRowValid = (searchType, searchTarget, row) => {
        let validRow = true
            if (searchTarget.length > 0)
            {
                let targetAmt = parseFloat(searchTarget)
                switch (parseInt(searchType)) {
                    case OUT_EQUALS_TS:
                        validRow = row.out == targetAmt
                        break;
                    case OUT_MORE_EQUALS_TS:
                        validRow = row.out >= targetAmt
                        break;
                    case OUT_LESS_EQUALS_TS:
                        validRow = row.out <= targetAmt
                        break;
                    case IN_EQUALS_TS:
                        validRow = row.in == targetAmt
                        break;
                    case IN_MORE_EQUALS_TS:
                        validRow = row.in >= targetAmt
                        break;
                    case IN_LESS_EQUALS_TS:
                        validRow = row.in <= targetAmt
                        break;
                    case ANY_TS:
                        validRow = row.pay.toLowerCase().startsWith(searchTarget.toLowerCase()) ||
                                   row.cat.toLowerCase().startsWith(searchTarget.toLowerCase()) ||
                                   row.memo.toLowerCase().startsWith(searchTarget.toLowerCase())
                        break;
                    case PAYEE_TS:
                        validRow = row.pay.toLowerCase().startsWith(searchTarget.toLowerCase())
                        break;
                    case CAT_TS:
                        validRow = row.cat.toLowerCase().startsWith(searchTarget.toLowerCase())
                        break;
                    case MEMO_TS:
                        validRow = row.memo.toLowerCase().startsWith(searchTarget.toLowerCase())
                        break;
                    default:
                    // code block
            }
            }
        return validRow;
    }


    render() {
        const {account, toggleCleared, toggleFlag, toggleTxnCheck, txnsChecked, accounts,
            payees, editTxn, txnSelected, saveTxn, cancelEditTxn} = this.props
        let rows
        if (account) {
            rows = account.txns.map((row, index) => {
                const isChecked = typeof txnsChecked == 'undefined' ? false : txnsChecked.includes(row.id)
                // if (this.isRowValid(searchType, searchTarget, row)) - TODO: remove this
                    return (
                        <TxnTr row={row} isChecked={isChecked} txnSelected={txnSelected} toggleTxnCheck={toggleTxnCheck}
                               toggleFlag={toggleFlag} toggleCleared={toggleCleared} editTxn={editTxn}
                               accounts={accounts} payees={payees} saveTxn={saveTxn} cancelEditTxn={cancelEditTxn}/>
                    )
            })
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
export const OUT_EQUALS_TS = 0;
export const OUT_MORE_EQUALS_TS = 1;
export const OUT_LESS_EQUALS_TS = 2;
export const IN_EQUALS_TS = 3;
export const IN_MORE_EQUALS_TS = 4;
export const IN_LESS_EQUALS_TS = 5;
export const ANY_TS = 6;
export const PAYEE_TS = 7;
export const CAT_TS = 8;
export const MEMO_TS = 9;
export const DATE_EQUALS_TS = 10;
export const DATE_MORE_EQUALS_TS = 11;
export const DATE_LESS_EQUALS_TS = 12;
class AccDetails extends Component {
    state = {
        txnsChecked: [],
        allTxnsChecked: false,
        totalSelected: 0,
        searchType: OUT_EQUALS_TS,
        searchTarget: '',
        selectedIndexes: [],
        rows: [],
        editTxn: null // if user clicks twice on a txn row then they will be able to edit the fields
    }

    componentWillReceiveProps(nextProps)
    {
        this.setState({txnsChecked: [], allTxnsChecked: false, totalSelected: 0, searchType: OUT_EQUALS_TS,
            searchTarget: ''})
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
        if (event.target.type != "checkbox" && event.target.type != "submit")
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
            checkList = this.state.txnsChecked.filter(id => id != txn.id)
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
        const {activeAccount, toggleCleared, addTxn, makeTransfer, toggleFlag, selectAllFlags, filterTxns,
            deleteTxns, accounts, payees, budget, firstPage, prevPage, nextPage, lastPage,
            txnFind, sortCol} = this.props
        return (
            <div id="acc_details_cont" className="panel_level1">
                <AccDashHead budget={budget} burger={true}/>
                <AccSummary activeAccount={activeAccount}/>
                <AccDetailsAction addTxn={addTxn} makeTransfer={makeTransfer}
                                  totalSelected={this.state.totalSelected}
                                  search={txnFind.search}
                                  filterTxns={filterTxns}
                                  deleteTxns={() => deleteTxns(this.state.txnsChecked)}/>
                <div id="txns_block" className="lite_back">
                   {/*TODO: see https://github.com/adazzle/react-data-grid/pull/1869 for lazy loading?*/}
                   {/* https://github.com/adazzle/react-data-grid/issues/836*/}
                    <table className="table table-striped table-condensed table-hover table-sm">
                        <AccDetailsHeader account={activeAccount}
                                          allTxnsChecked={this.state.allTxnsChecked}
                                          selectAllTxns={this.selectAllTxns}
                                          selectAllFlags={selectAllFlags}
                                          txnOrder={txnFind.txnOrder}
                                          sortCol={sortCol}
                        />
                        <AccDetailsBody account={activeAccount}
                                        toggleCleared={toggleCleared}
                                        toggleFlag={toggleFlag}
                                        txnSelected={this.txnSelected}
                                        txnsChecked={this.state.txnsChecked}
                                        editTxn={this.state.editTxn}
                                        accounts={accounts}
                                        payees={payees}
                                        toggleTxnCheck={this.toggleTxnCheck}
                                        saveTxn={this.saveTxn}
                                        cancelEditTxn={this.cancelEditTxn}/>
                    </table>
                    <div id="pagin_controls" className="float-right">
                        <span onClick={firstPage}>First</span>
                        <span onClick={prevPage}>Prev</span>
                        <span onClick={nextPage}>Next</span>
                        <span onClick={lastPage}>Last</span>
                    </div>
                </div>
            </div>
        )
    }
}

export default AccDetails