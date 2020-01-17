import React, {Component} from 'react'
import Ccy from '../../utils/ccy'
import {TxnForm, TxnCleared} from './trans'
import {AccDashHead} from './dash'
import * as PropTypes from "prop-types";

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

    render() {
        const {selectAllTxns, account, allTxnsChecked} = this.props
        return (
            <thead>
            <tr>
                <th><input onClick={(event) => selectAllTxns(event, account)} type="checkbox" checked={allTxnsChecked}/></th>
                <th><i onClick={(event) => this.selectAllFlags()} className={'far fa-flag flag' + (this.state.allFlagged ? ' flagged' : '')}></i></th>
                <th>Date</th>
                <th>Payee</th>
                <th>Category</th>
                <th>Memo</th>
                <th>Outflow</th>
                <th>Inflow</th>
                <th>Cleared</th>
            </tr>
            </thead>
        )
    }
}

class AccDetailsAction extends Component
{
    render() {
        const {addTxn, makeTransfer, totalSelected, deleteTxns, updateTarget, updateSearchType, searchTarget} = this.props
        return (
            <div id="actions" className="row">
                <div className='col-6'>
                    <div className='acc_det_act' onClick={addTxn}><i className="fas pr-1 fa-plus"></i>Add</div>
                    <div className='acc_det_act' onClick={makeTransfer}><i className="fas pr-1 fa-exchange-alt"></i>Transfer
                    </div>
                    {totalSelected != 0 && <div className='acc_det_act' onClick={(event) => deleteTxns()}>
                        <i className="far pr-1 fa-trash-alt"></i>Delete</div>}
                </div>
                {totalSelected != 0 && <div className="col">
                    <div id="sel_tot"><Ccy amt={totalSelected}/></div>
                </div>}
                <div className="col">
                    <input id="txn_search" type="text" className="form-control float-right" placeholder="search"
                           onChange={(event) => updateTarget(event)}/>
                    <select id="search_type"
                            className={"form-control " + (searchTarget.length == 0 ? 'd-none' : '')}
                            onChange={(event) => updateSearchType(event)}>
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
                    </select>
                </div>
            </div>
        )
    }
}

TxnCleared.propTypes = {
    onClick: PropTypes.func,
    row: PropTypes.any
};
const AccDetailsBody = props => {
    const {account, toggleCleared, toggleFlag, toggleTxnSel, txnsChecked, searchTarget, searchType, accounts, payees} = props
    let rows
    if (account) {
        rows = account.txns.map((row, index) => {
            const isChecked = txnsChecked.includes(row.id)
            // TODO: move into function
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
            if (validRow)
                return (
                    <tr key={index} className={isChecked ? 'table-warning' : ''}>
                        <td><input onChange={(event) => toggleTxnSel(event, row)} type="checkbox" checked={isChecked}/>
                        </td>
                        <td><i onClick={() => toggleFlag(row)}
                               className={'far fa-flag flag' + (row.flagged ? ' flagged' : '')}></i></td>
                        <td>{row.date.toDateString()}</td>
                        <td>{row.pay}</td>
                        <td>{row.cat}</td>
                        <td>{row.memo}</td>
                        <td><Ccy amt={row.out}/></td>
                        <td><Ccy amt={row.in}/></td>
                        <td><TxnCleared toggleCleared={toggleCleared} row={row} cleared={row.clear}/></td>
                    </tr>
                )
        })
        return <tbody><TxnForm accounts={accounts} payees={payees}/>{rows}</tbody>
    } else
        return <tbody><TxnForm accounts={accounts} payees={payees}/><TxnForm/></tbody>
}

const AccDetailsTitle = props => {
    const {activeAccount} = props
    return (
        <div className={'account'}>
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
class AccDetails extends Component {
    state = {
        txnsChecked: [],
        allTxnsChecked: false,
        totalSelected: 0,
        searchType: OUT_EQUALS_TS,
        searchTarget: ''
    }

    componentWillReceiveProps(nextProps)
    {
        this.setState({txnsChecked: [], allTxnsChecked: false, totalSelected: 0, searchType: OUT_EQUALS_TS,
            searchTarget: ''})
    }
    selectAllTxns = (event, acc) => {
        if (event.target.checked)
        {
            let summ = acc.getTxnSumm()
            this.setState({txnsChecked: summ[0], totalSelected: summ[1], allTxnsChecked: true})
        }
        else
            this.setState({txnsChecked: [], totalSelected: 0, allTxnsChecked: false})
    }
    toggleTxnSel = (event, txn) => {
        let tot = this.state.totalSelected
        let checkList
        if (event.target.checked)
        {
            tot += txn.amount
            checkList = [...this.state.txnsChecked, txn.id]
        }
        else
        {
            checkList = this.state.txnsChecked.filter(id => id != txn.id)
            tot -= txn.amount
        }
        this.setState({totalSelected: parseFloat(tot.toFixed(2)), txnsChecked: checkList})
    }
    updateTarget = (event) => {
        this.setState({searchTarget: event.target.value})
    }
    updateSearchType = (event) => {
        this.setState({searchType: event.target.value})
    }
    render() {
        const {activeAccount, toggleCleared, addTxn, makeTransfer, toggleFlag, selectAllFlags, filterTxns,
            deleteTxns, accounts, payees, budget} = this.props
        return (
            <div id="acc_details_cont">
                <AccDashHead budget={budget} burger={true}/>
                <AccDetailsTitle activeAccount={activeAccount}/>
                {/*<AccDetailsAction addTxn={addTxn} makeTransfer={makeTransfer}*/}
                {/*                  totalSelected={this.state.totalSelected}*/}
                {/*                  searchTarget={this.state.searchTarget}*/}
                {/*                  filterTxns={filterTxns}*/}
                {/*                  updateTarget={this.updateTarget}*/}
                {/*                  updateSearchType={this.updateSearchType}*/}
                {/*                  deleteTxns={() => deleteTxns(this.state.txnsChecked)}/>*/}
                {/*<div className="scroll-container">*/}
                {/*    <div className="scroll-panel">*/}
                {/*        /!*<table className="table table-striped table-condensed table-hover">*!/*/}
                {/*        /!*    <AccDetailsHeader account={activeAccount}*!/*/}
                {/*        /!*                      allTxnsChecked={this.state.allTxnsChecked}*!/*/}
                {/*        /!*                      selectAllTxns={this.selectAllTxns}*!/*/}
                {/*        /!*                      selectAllFlags={selectAllFlags}/>*!/*/}
                {/*        /!*    <AccDetailsBody account={activeAccount}*!/*/}
                {/*        /!*                    toggleCleared={toggleCleared}*!/*/}
                {/*        /!*                    toggleFlag={toggleFlag}*!/*/}
                {/*        /!*                    txnsChecked={this.state.txnsChecked}*!/*/}
                {/*        /!*                    searchTarget={this.state.searchTarget}*!/*/}
                {/*        /!*                    searchType={this.state.searchType}*!/*/}
                {/*        /!*                    accounts={accounts}*!/*/}
                {/*        /!*                    payees={payees}*!/*/}
                {/*        /!*                    toggleTxnSel={this.toggleTxnSel}/>*!/*/}
                {/*        /!*</table>*!/*/}
                {/*    </div>*/}
                {/*</div>*/}
            </div>
        )
    }
}

export default AccDetails