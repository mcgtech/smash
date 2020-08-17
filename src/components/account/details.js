import React, {Component} from 'react'
import Ccy from '../../utils/ccy'
import Trans from '../account/trans'
import {TxnCleared, TxnTr, TxnDate} from './trans'
import Account from "./account";
import * as PropTypes from "prop-types";
import {ASC, DESC} from './sort'
import {getPageCount} from './pagin'
import {getDateIso} from "../../utils/date";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrashAlt, faSortUp, faSortDown, faClock } from '@fortawesome/free-solid-svg-icons'
import {ALL_ACC_SEL} from "./budget"
// https://github.com/AdeleD/react-paginate
import ReactPaginate from 'react-paginate';
import {
    DATE_ROW,
    FLAGGED_ROW,
    PAYEE_ROW,
    CAT_ITEM_ROW,
    MEMO_ROW,
    IN_ROW,
    OUT_ROW,
    CLEAR_ROW,
    FREQ_ROW,
    ACC_ROW,
    AUTO_ROW
} from './rows'
import {TXN_DOC_TYPE, TXN_SCHED_DOC_TYPE} from './budget_const'
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

export class AccDetailsHeader extends Component
{
    state = {
        allFlagged: false
    }

    render() {
        const {selectAllTxns, allTxnsChecked, txnOrder, sortCol, currSel, isSched} = this.props
        return (
            <thead>
            <tr className="txn_row">
                <th className="txn_sel"><input onChange={(event) => selectAllTxns(event)} type="checkbox" checked={allTxnsChecked}/></th>
                {currSel === ALL_ACC_SEL && <TxnRowColHead txnOrder={txnOrder} rowId={ACC_ROW} rowHead='Account' sortCol={sortCol}/>}
                <TxnRowColHead txnOrder={txnOrder} rowId={FLAGGED_ROW} rowHead='Flag' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId={DATE_ROW} rowHead='Date' sortCol={sortCol}/>
                {isSched &&
                <TxnRowColHead txnOrder={txnOrder} rowId={FREQ_ROW} rowHead='Frequency' sortCol={sortCol}/>}
                <TxnRowColHead txnOrder={txnOrder} rowId={PAYEE_ROW} rowHead='Payee' sortCol={sortCol}/>
                {(this.props.account.onBudget || currSel === ALL_ACC_SEL) &&
                <TxnRowColHead txnOrder={txnOrder} rowId={CAT_ITEM_ROW} rowHead='Category' sortCol={sortCol}/>}
                <TxnRowColHead txnOrder={txnOrder} rowId={MEMO_ROW} rowHead='Memo' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId={OUT_ROW} rowHead='Outflow' sortCol={sortCol}/>
                <TxnRowColHead txnOrder={txnOrder} rowId={IN_ROW} rowHead='Inflow' sortCol={sortCol}/>
                {!isSched &&
                <TxnRowColHead txnOrder={txnOrder} rowId={CLEAR_ROW} rowHead='Cleared' sortCol={sortCol}/>}
                {!isSched &&
                <TxnRowColHead txnOrder={txnOrder} rowId={AUTO_ROW} rowHead={ <FontAwesomeIcon icon={faClock} className="mr-1"/>} sortCol={sortCol}/>}
            </tr>
            </thead>
        )
    }
}

const TxnRowColHead = props => {
    const {txnOrder, rowId, rowHead, sortCol} = props
    return (
        <th onClick={(event) => sortCol(rowId)}>
            {rowHead}
            {txnOrder.rowId === rowId ?
                                        (txnOrder.dir === DESC ?
                                            <span><FontAwesomeIcon icon={faSortUp} className={'ml-1'}/></span>
                                            :
                                            <span><FontAwesomeIcon icon={faSortDown} className={'ml-1'}/></span> )
                                      : ''}
        </th>
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
        this.setState({target: getDateIso(date)})
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
            state['target'] = new Date()
        this.setState(state)
    }

    render() {
        const {addTxn, totalSelected, deleteTxns, filterTxns, txnsChecked, budget, isSched, addingNew} = this.props
        const txnsAreSelected = txnsChecked.length > 0
        return (
            <div className="actions">
                <div>
                    <button disabled={addingNew ? true : false} type="button "className='btn sec_btn add_txn' onClick={() => addTxn(isSched)}><FontAwesomeIcon icon={faPlus} className="pr-1"/>
                        {isSched ? "Add Schedule" : "Add Txn"}
                    </button>
                    {txnsAreSelected && <button  disabled={addingNew ? true : false} type="button "className='btn sec_btn' onClick={(event) => deleteTxns()}>
                        <FontAwesomeIcon icon={faTrashAlt} className="pr-1"/>Delete</button>}
                </div>
                {!isSched && txnsAreSelected && <div className="col">
                    <div id="sel_tot"><Ccy amt={totalSelected} ccyDetails={budget.ccyDetails}/></div>
                </div>}
                {!isSched && <div id="txn_search">
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
                                   incSymbol={false}
                                   placeholder={'search'}
                                   ccyDetails={budget.ccyDetails}
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
                                disabled={this.state.target.length > 0 || this.state.dateSearch ? false : true}
                                onClick={(event) => filterTxns(this.state, 0)}>Search</button>
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
                </div>}
            </div>
        )
    }
}

TxnCleared.propTypes = {
    onClick: PropTypes.func,
    row: PropTypes.any
};

export const FREQS = [{id: "1", name: "daily"}, {id: "2", name: "weekly"}, {id: "3", name: "bi-weekly"},
               {id: "4", name: "monthly"}, {id: "5", name: "yearly"}]

export class AccDetailsBody extends Component
{
  render() {
      // if we are adding a new Txn then we add this id to the start of displayList, so that we cal determine
      // when looping around displayList that we need to add a new Txn
      // const displayListNewRowId = -1
      const {
          account, budget, toggleCleared, toggleFlag, toggleTxnCheck, txnsChecked, addingNew,
          // editTxn,
          editTxnId,
          txnSelected, saveTxn, displayList, cancelEditTxn, txns, currSel, isSched
      } = this.props
      let rows = []
      if (account) {
          if (displayList.length > 0) {
              for (const rowId of displayList) {
                  const row = txns[rowId]
                  if (typeof row != 'undefined') {
                      const isChecked = typeof txnsChecked == 'undefined' ? false : txnsChecked.includes(row.id)
                      const showEditRow = editTxnId === row.id
                      let trRow = <TxnTr budget={budget}
                                         row={row}
                                         key={row.id}
                                         isChecked={isChecked}
                                         account={account}
                                         txnSelected={txnSelected}
                                         toggleTxnCheck={toggleTxnCheck}
                                         toggleFlag={toggleFlag}
                                         toggleCleared={toggleCleared}
                                         saveTxn={saveTxn}
                                         cancelEditTxn={cancelEditTxn}
                                         editTheRow={showEditRow}
                                         addingNew={addingNew}
                                         currSel={currSel}
                                         isSched={isSched}
                                         freqItems={FREQS}
                      />
                      rows.push(trRow)
                  }
              }
          }
      }
      return (<tbody>{rows}</tbody>)
  }
}
AccDetailsBody.defaultProps = {
    toggleFlag: function(event){},
    toggleCleared: function(event){},
    isSched: false
}

const AccSummary = props => {
    const {activeItem, budget} = props
    return (
        <div id="acc_summ">
            <div className={'acc_body'}>
                <div className={'acc_overview'}>
                    <div className={'acc_name ellipsis'}>{activeItem.name}</div>
                    <div className={'acc_stats'}>
                        <div>
                            <div className={'acc_balance'}>
                                <div>
                                    <div className={'acc_title'}>Cleared</div>
                                    <div className={'acc_value'}><Ccy amt={activeItem.clearedBalance} ccyDetails={budget.ccyDetails}/></div>
                                </div>
                            </div>
                            <div className={'acc_operator'}>+</div>
                            <div className={'acc_balance'}>
                                <div>
                                    <div className={'acc_title'}>Uncleared</div>
                                    <div className={'acc_value'}><Ccy amt={activeItem.unclearedBalance} ccyDetails={budget.ccyDetails}/></div>
                                </div>
                            </div>
                            <div className={'acc_operator'}>=</div>
                            <div className={'acc_balance'}>
                                <div>
                                    <div className={'acc_title'}>Working</div>
                                    <div className={'acc_value'}><Ccy amt={activeItem.workingBalance} ccyDetails={budget.ccyDetails}/></div>
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
    txnFindDefault = {txnOrder: {rowId: DATE_ROW, dir: DESC},
                  search: {value: null, type: DEF_TXN_FIND_TYPE, exactMatch: true},
                  include_docs: true}
    defaultPaginDetails = {pageSize: 100, pageCount: null}
    displayList = []
    defaultState = {
        txnsChecked: [],
        allTxnsChecked: false,
        addingNew: false,
        isSched: this.props.isSched,
        totalSelected: 0,
        searchType: OUT_EQUALS_TS,
        searchTarget: '',
        selectedIndexes: [],
        offset: 0,
        rows: [],
        txns: [],
        txnFind: {...this.txnFindDefault},
        paginDetails: {...this.defaultPaginDetails},
        editTxn: null // if user clicks twice on a txn row then they will be able to edit the fields
    }

    state = this.defaultState

    // https://stackoverflow.com/questions/37440408/how-to-detect-esc-key-press-in-react-and-how-to-handle-it/46123962
    constructor(props) {
        super(props);
        this.escFunction = this.escFunction.bind(this);
        this.mouseFunction = this.mouseFunction.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        const txns = typeof this.props.txns === "undefined" ? [] : [...this.props.txns]
        // when loading, loading up first page worth of unfiltered results
        this.setPageData(nextProps)
        this.setState({txns: txns})
    }

    componentDidMount() {
        document.addEventListener("keydown", this.escFunction, false)
        document.addEventListener("mousedown", this.mouseFunction, false)
        this.setPageData(this.props)

    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.escFunction, false);
        document.removeEventListener("mousedown", this.mouseFunction, false);
    }

    mouseFunction(event) {
        if (!document.getElementById("txns_block").contains(event.target) &&
            !document.getElementById("txnSched_block").contains(event.target))
            this.editOff()
    }

    setPageData(props) {
        const activeAccount = props.activeAccount
        if (typeof activeAccount != 'undefined') {
            // const txns = props.txns
            const txns = this.state.txns
            if (typeof txns !== "undefined" && txns.length > 0) {
                this.updateDisplayList(0, this.state.txnFind, txns)
                const paginDetails = this.state.paginDetails
                paginDetails['pageCount'] = getPageCount(txns.length, this.state.paginDetails.pageSize)
                this.setState({paginDetails: paginDetails})
            }
        }
    }

    handlePageClick = data => {
        let selected = data.selected
        const offset = Math.ceil(selected * this.state.paginDetails.pageSize)
        this.filterTxns(null, offset)
      }

    sortCol = (rowId) => {
        const dir = this.state.txnFind.txnOrder.dir === DESC ? ASC : DESC
        const txnOrder = {rowId: rowId, dir: dir}
        let txnFind = this.state.txnFind
        txnFind['txnOrder'] = txnOrder

        // need to sort then update the display list which filters
        Account.sortTxns(this, this.state.txns)
        this.updateDisplayList(0, txnFind, this.state.txns)

        // setting txnFind causes AccDetailsBody to be rebuilt
        this.setState({txnFind: txnFind})
    }

    // the actual filtering takes place using txnFind in allowDisplay which is called in updateDisplayList
    // this updates displayList which is used in AccDetailsBody to show the txns,
    filterTxns = (actionsState, offset) => {
        let txnFind = this.state.txnFind
        let state = {offset: offset}
        if (actionsState != null)
        {
            const search = {value: actionsState.target, type: actionsState.type, exactMatch: actionsState.exact}
            txnFind['search'] = search
            state['txnFind'] = txnFind
        }
        // let total = this.updateDisplayList(offset, txnFind, this.props.txns)
        let total = this.updateDisplayList(offset, txnFind, this.state.txns)
        // set pagination details
        let paginDetails = this.state.paginDetails
        paginDetails['pageCount'] = getPageCount(total, this.state.paginDetails.pageSize)
        state['paginDetails'] = paginDetails
        // the following causes AccDetailsBody to be rebuilt
        this.setState(state)
    }

    updateDisplayList(startPos, txnFind, txns) {
        let total = 0
        let count = 0
        const len = txns.length
        let rowId
        this.displayList = []
        for (rowId = 0; rowId < len; rowId++) {
            let row = txns[rowId]
            const allow = Account.allowDisplay(row, txnFind)
            if (allow) {
                if (rowId >= startPos && count < this.state.paginDetails.pageSize) {
                    this.displayList[count] = rowId
                    count += 1
                }
                total += 1
            }
        }
        return total;
    }

    editOff() {
        const txns = typeof this.props.txns === "undefined" ? [] : [...this.props.txns]
        this.setState({editTxn: null, addingNew: false, txns: txns})
    }

    // escape handler
    escFunction(event) {
        if (event.keyCode === 27) {
            this.editOff()
        }
    }

    // TODO: when create new txn/sched and select date it does not close date popup
    // TODO: if edit txn then sched or vice versa then things go wrong to close the opposite one
    // TODO: when create new txn/sched and select date it goes wrong if we are in all accs
    // TODO: save partially hidden on bottom txns
    // TODO: save and restore freq
    // TODO: save and restore for export/import
    // TODO: test, add, update, transfer, delete etc in both lists
    // TODO: when save txnSched or txn the payees are removed from the budget!!!
    // TODO: if edit last txn in #txns_block, #txnSched_block then save is partially hidden
    // TODO: test rest of columns and sorting
    // TODO: dont hide edit if click on things during edit of sched
    saveTxn = (txn, addAnother) => {
        const self = this
        const db = self.props.db

        // if payee doesn't exist then add it - check all txns in all accs in budget
        if (txn.payee == null && txn.payeeName.length > 0)
        {
            // its a new payee (id is null and something has been typed into search box - ie no match has been found in
            // existing list of payees), so save it first - save of txn happens inside this
            this.props.budget.addPayee(db, txn, self, addAnother, self.props.isSched)
        }
        else
            txn.save(db, self, addAnother, self.props.isSched)
    }

    deleteTxns = () =>
    {
        const txnsChecked = this.state.txnsChecked
        this.resetEditState()
        this.props.deleteTxns(txnsChecked)
    }

    cancelEditTxn = (event) => {
        this.editOff()
    }

    // row selected
    txnSelected = (event, txn) => {
        this.toggleTxn(true, txn);
        // only go to edit mode if the checkbox hasn't been click or the save or cancel button clicked
        if (event === null || (event.target.type !== "checkbox" && event.target.type !== "submit"))
        {
            if (this.state.txnsChecked.includes(txn.id))
                this.setState({editTxn: txn.id, txnsChecked: [], allTxnsChecked: false, totalSelected: 0})
        }
    }

    selectAllTxns = (event) => {
        if (event.target.checked)
        {
            // only include ones displayed
            // let summ = Account.getTxnSumm(this.displayList, this.props.txns)
            let summ = Account.getTxnSumm(this.displayList, this.state.txns)
            this.setState({txnsChecked: summ[0], totalSelected: summ[1], allTxnsChecked: true, editTxn: null})
        }
        else
            this.resetEditState()
    }

    resetEditState = () =>
    {
        this.setState({txnsChecked: [], totalSelected: 0, allTxnsChecked: false, editTxn: null, addingNew: false})
    }

    // check box clicked
    toggleTxnCheck = (event, txn) => {
        const checked = event.target.checked
        this.toggleTxn(checked, txn, !checked)
    }

    toggleTxn(checked, txn, resetEdit) {
        let tot = this.state.totalSelected
        let checkList = null
        if (checked) {
            if (!this.state.txnsChecked.includes(txn.id)) {
                tot += txn.amount
                checkList = [...this.state.txnsChecked, txn.id]
            }
        } else {
            checkList = this.state.txnsChecked.filter(id => id !== txn.id)
            tot -= txn.amount
        }
        let state = {totalSelected: parseFloat(tot.toFixed(2)), txnsChecked: checkList}
        if (resetEdit) {
            state['editTxn'] = null
            state['addingNew'] = false
        }
        if (checkList != null)
            this.setState(state)
    }

    resetTxns = () => {
        const txnFind = {...this.txnFindDefault}
        // let txns = this.props.txns
        let txns = this.state.txns
        // set default order
        txns = txns.sort(Account.compareTxnsForSort(DATE_ROW, DESC))
        this.updateDisplayList(0, txnFind, txns)
        const paginDetails = this.state.paginDetails
        paginDetails['pageCount'] = getPageCount(txns.length, this.state.paginDetails.pageSize)
        this.setState({txnFind: txnFind, paginDetails: paginDetails})
    }

    addTxn = (isSched) => {
        const newTrans = new Trans(null, this.props.budget, this.props.activeAccount)
        newTrans.type = isSched ? TXN_SCHED_DOC_TYPE : TXN_DOC_TYPE
        let txns = this.state.txns
        txns.unshift(newTrans)
        // TODO: editTxnId is somehow getting set to null
        this.setState({addingNew: true, isSched: isSched, txnsChecked: [newTrans.id], totalSelected: 0,
                             editTxnId: newTrans.id, txns: txns}, function(){
                this.resetTxns()
                this.txnSelected(null, newTrans)
        })
    }

    render() {
        // const {activeAccount, toggleCleared, toggleFlag, budget, currSel, txns, isSched} = this.props
        const {activeAccount, toggleCleared, toggleFlag, budget, currSel, isSched} = this.props
        return (
            <div id={isSched ? "sched_cont" : "acc_details_cont"} className={isSched ? "" : "panel_level1"}>
                {!isSched &&
                    <AccSummary activeItem={currSel === ALL_ACC_SEL ? budget : activeAccount} budget={budget}/>}
                <AccDetailsAction addTxn={this.addTxn}
                                  totalSelected={this.state.totalSelected}
                                  txnsChecked={this.state.txnsChecked}
                                  budget={budget}
                                  isSched={isSched}
                                  resetTxns={this.resetTxns}
                                  filterTxns={this.filterTxns}
                                  addingNew={this.state.addingNew}
                                  deleteTxns={this.deleteTxns}/>
                <div id={isSched ? "txnSched_block" : "txns_block"} className="lite_back">
                    <table className="table table-striped table-condensed table-hover table-sm">
                        <AccDetailsHeader account={activeAccount}
                                          allTxnsChecked={this.state.allTxnsChecked}
                                          selectAllTxns={this.selectAllTxns}
                                          txnOrder={this.state.txnFind.txnOrder}
                                          sortCol={this.sortCol}
                                          currSel={currSel}
                                          isSched={isSched}
                        />
                        <AccDetailsBody account={activeAccount}
                            budget={budget}
                            toggleCleared={toggleCleared}
                            toggleFlag={toggleFlag}
                            txnSelected={this.txnSelected}
                            txnsChecked={this.state.txnsChecked}
                            editTxnId={this.state.editTxn}
                            addingNew={this.state.addingNew}
                            toggleTxnCheck={this.toggleTxnCheck}
                            saveTxn={this.saveTxn}
                            displayList={this.displayList}
                            currSel={currSel}
                            txns={this.state.txns}
                            cancelEditTxn={this.cancelEditTxn}
                            isSched={isSched}
                        />
                    </table>
                    {this.state.paginDetails.pageCount > 1 &&
                        <ReactPaginate
                              previousLabel={'prev'}
                              nextLabel={'next'}
                              breakLabel={'...'}
                              pageCount={this.state.paginDetails.pageCount}
                              marginPagesDisplayed={2}
                              pageRangeDisplayed={5}
                              onPageChange={this.handlePageClick}
                              containerClassName={'pagination'}
                              activeClassName={'active'}
                        />
                    }
                </div>
            </div>
        )
    }
}
AccDetailsBody.defaultProps = {
    toggleCleared: function(event){},
    isSched: false
}

export default AccDetails