import React, {Component} from 'react'
import Account from "./account";
import Trans from "./trans";
import AccDash, {AccountListTypes} from "./dash";
import AccDetails from "./details";
import ScheduleContainer from "./schedule";
import Payee from "./payee";
import './budget.css'
import './budget_dash.css'
import './acc_details.css'
import SplitPane from 'react-split-pane';
import '../../utils/split_pane.css'
// TODO: load and save etc from couchdb
class Budget {
    constructor(name, accounts) {
        this.bcreated = new Date()
        this.bname = name
        this.baccounts = accounts
    }

    get created() {
        return this.bcreated;
    }

    set name(created) {
        this.bcreated = created;
    }

    get name() {
        return this.bname;
    }

    set name(name) {
        this.bname = name;
    }

    get accounts() {
        return this.baccounts;
    }

    set accounts(accounts) {
        this.baccounts = accounts;
    }

    removeAccount = targetAcc => {
        this.accounts =  this.accounts.filter((acc, i) => {
              return acc.id !== targetAcc.id
            })
    }

    getTotal = () => {
        let total = 0;
        for (const account of this.accounts)
            total += account.workingBalance
        return total;
    }
}
var MOUSE_DOWN = 'down'
var MOUSE_UP = 'up'
var MOUSE_LAST_Y = 0
var MOUSE_DIR = MOUSE_DOWN

// Access db
// ---------
// https://manifold.co/blog/building-an-offline-first-app-with-react-and-couchdb
// http://localhost:5984
// doc ids: https://www.bennadel.com/blog/3195-pouchdb-data-modeling-for-my-dig-deep-fitness-offline-first-mobile-application.htm
// https://www.javatpoint.com/couchdb-create-document
// One to many
// -----------
// https://github.com/jo/couchdb-best-practices#document-modeling
// What we’d probably want then would be a way to join the blog post and the various comments together to be able to
// retrieve them with a single HTTP request - https://docs.couchdb.org/en/master/ddocs/views/joins.html
// How Views work (inc sorting)
// ----------------------------
// https://docs.couchdb.org/en/stable/ddocs/views/intro.html
// https://docs.couchdb.org/en/stable/ddocs/views/intro.html#find-one
// https://docs.couchdb.org/en/stable/ddocs/views/joins.html
// https://docs.couchbase.com/server/6.5/learn/views
//      map fn: https://docs.couchbase.com/server/6.5/learn/views/views-writing-map.html
//      reduce fn: https://docs.couchbase.com/server/6.5/learn/views/views-writing-reduce.html
//      sql to views: https://docs.couchbase.com/server/6.5/learn/views/views-trans-sql.html
//      querying views: https://docs.couchbase.com/server/6.5/learn/views/views-querying.html
//      joins with views: https://docs.couchdb.org/en/master/ddocs/views/joins.html
//          http://127.0.0.1:5984/test_view/_design/test/_view/test
// TODO: change bd permissions and add admins http://127.0.0.1:5984/_utils/#/database/budget/permissions
// TODO: ensure if delete account then children are deleted etc


export default class BudgetContainer extends Component
{
    constructor(props) {
        super(props);
        this.canceler = null;
    }
    state = {
        loading: true,
        budget: null,
        activeAccount: null,
        payees: null
    }

    // TODO: move in to util file
    _onMouseMove = (e) =>
    {
        MOUSE_DIR = e.screenY < MOUSE_LAST_Y ? MOUSE_UP : MOUSE_DOWN
        MOUSE_LAST_Y = e.screenY
    }

    // TODO: get this to work
    componentWillUnmount() {
        // this.canceler.cancel();
    }
    // TODO: when select txn show delete option
    // TODO: get search to work
    // TODO: make responsive
    // TODO: move save fns etc into another file/class
    // TODO: load from db via redux
    // TODO: load data asynchronously? - https://hackernoon.com/the-constructor-is-dead-long-live-the-constructor-c10871bea599
    // TODO: associate with a user
    componentDidMount()
    {
    // TODO: only load required data
        this.fetchData();
    // TODO: get this to work
        // this.canceler = this.props.db.changes({
        //     since: 'now',
        //     live: true,
        //     include_docs: true,
        // }).on('change', () => {
        //     this.fetchData();
        // });
    }

    // https://manifold.co/blog/building-an-offline-first-app-with-react-and-couchdb
    // https://docs.couchdb.org/en/stable/ddocs/views/intro.html
    fetchData() {
        this.setState({
            loading: true,
            budget: null,
        });
        // this.props.db.allDocs({
        //     include_docs: true,
        // }).then(result => {
        //     const rows = result.rows;
        //     this.setState({
        //         loading: false,
        //         elements: rows.map(row => row.doc),
        //     })
        // }).catch((err) =>{
        //     console.log(err);
        // });
            const data = this.getDummyBudgetData()
            const accounts = data[0]
            const payees = data[1]
            const activeAccount = accounts.length > 0 ? accounts[0] : null
            this.setState({
                loading: false,
                budget: new Budget('House', accounts),
                activeAccount: activeAccount,
                payees: payees})
    }

    getDummyBudgetData() {
        const largeNoTxns = Array(8760).fill().map((val, idx) => {
            return new Trans(idx, new Date(), true, 811.09, 0, 'Groceries', 'tesco', 'blah blah')
        });
        const accounts = [
            new Account(1, 'Natwest Joint', 331.77, true, true, 0,
                '0345 900 0200\n' +
                '\n' +
                'Blah blah blah.\n' +
                'Blah blah blah.\n' +
                'Blah blah blah.\n' +
                '26/07/1994', [
                    new Trans(1, new Date(), true, 811.09, 0, 'Groceries', 'tesco', 'blah blah'),
                    new Trans(2, new Date(), false, 0, 811111.99, 'Spotify', 'spotify', ''),
                    new Trans(3, new Date(), true, 20.60, 0, 'HiLife Gym', 'council', ''),]),
            new Account(2, 'Nation Wide Flex Direct', 4658.15, true, true,
                1, '5% on bal up to £2,500.\n' +
                'Must pay in £1,000  a month.\n' +
                'Blah blah blah', largeNoTxns),
            new Account(3, 'Family Saving (Suzy) - PBonds 2', 19731.00, true, false,
                0, '', [
                    new Trans(6, new Date(), true, 0.55, 0, 'Tesco', 'tesco', ''),
                    new Trans(7, new Date(), false, 0, 354400, 'Stamps', 'tesco', '')]),
            new Account(4, 'Family Saving (Ali) - PBonds 1', 28370.00, true, false,
                1, ', ', [
                    new Trans(1, new Date(), false, 0, 890, 'Tangerines', 'tesco', '')]),
        ]
        // const activeAccount = accounts.length > 0 ? accounts[0] : null
        const payees = [new Payee(1, 'Tesco'), new Payee(2, 'Amazon'), new Payee(3, 'Andrew TSB')]

        return [accounts, payees]
        // this.setState({budget: new Budget('House', accounts), activeAccount: activeAccount, payees: payees})
    }

    refreshBudgetState = () => {
        this.setState({budget: this.state.budget})
    }

    handleDeleteAccount = targetAcc => {
        this.state.budget.removeAccount(targetAcc)
        this.refreshBudgetState()
    }

    setAccountWeight = (targetAcc, weight) => {
        targetAcc.weight = weight
        this.refreshBudgetState()
    }

    setAccountState = (targetAcc, open) => {
        targetAcc.open = open
        this.refreshBudgetState()
    }

    handleMoveAccount = (draggedAcc, targetListType, overWeight) => {
        draggedAcc.open = true
        if (targetListType == AccountListTypes.BUDGET)
            draggedAcc.onBudget = true
        else if (targetListType == AccountListTypes.OFF_BUDGET)
            draggedAcc.onBudget = false
        else
            draggedAcc.open = false
        const weight = MOUSE_DIR == MOUSE_DOWN ? overWeight+1 : overWeight-1
        this.setAccountWeight(draggedAcc, weight)
    }

    handleSaveAccount = formState => {
        let accounts
        if (formState.acc == null)
        {
            // TODO: set correct id, weight and bal
            const acc = new Account(20, formState.name, 28370.00,
                                    formState.open,
                           formState.budgetState == 'on',
                                1, formState.notes, [], false)
            accounts = [...this.state.budget.accounts, acc]
        }
        else
        {
            accounts = this.state.budget.accounts
            const index = accounts.findIndex((obj => obj.id == formState.acc.id))
            accounts[index].name = formState.name
            accounts[index].notes = formState.notes
            accounts[index].open = formState.open
            accounts[index].onBudget = formState.budgetState == 'on'
        }
        let budget = this.state.budget
        budget.accounts = accounts
        this.setState({budget: budget})
    }

    toggleCleared = (txn) => {
        txn.clear = !txn.clear
        this.refreshBudgetState()
    }

    toggleFlag = (txn) => {
        txn.flagged = !txn.flagged
        this.refreshBudgetState()
    }

    selectAllFlags = (allFlagged) => {
        let accounts = this.state.budget.accounts
        for (const account of accounts)
            for (let txn of account.txns)
                txn.flagged= !allFlagged
        this.refreshBudgetState()
    }

    addTxn = () => {
        alert('addTxn')
    }

    deleteTxns = (txn_ids) => {
        this.state.activeAccount.deleteTxns(txn_ids)
        this.refreshBudgetState()
    }

    makeTransfer = () => {
        alert('makeTransfer')
    }

    handleAccClick = (event, acc) => {
        this.setState({activeAccount: acc})
    }

    render(){
        const {budget} = this.state
        const panel1DefSize = localStorage.getItem('pane1DefSize') || '300';
        const panel2DefSize = localStorage.getItem('pane2DefSize') || '70%';
        return (
            <div onMouseMove={this._onMouseMove} id='budget'>
                {/* https://github.com/tomkp/react-split-pane  and examples: http://react-split-pane-v2.surge.sh/ */}
                <SplitPane split="vertical" minSize={200} maxSize={450}
                      defaultSize={parseInt(panel1DefSize, 10)}
                      onChange={size => localStorage.setItem('pane1DefSize', size)}>
                    {/* TODO: pass thru fns etc in an object for tidiness */}
                    {/* TODO: insure I dont use components when the class simply displays */}
                    <AccDash budget={budget}
                             setAccountState={this.setAccountState}
                             handleSaveAccount={this.handleSaveAccount}
                             handleDeleteAccount={this.handleDeleteAccount}
                             handleMoveAccount={this.handleMoveAccount}
                             handleAccClick={this.handleAccClick}
                             activeAccount={this.state.activeAccount}/>
                    <div id="acc_details_block">
                        <SplitPane split="horizontal"
                                   defaultSize={parseInt(panel2DefSize, 10)}
                                   minSize={200}
                                   onChange={size => localStorage.setItem('pane2DefSize', size)}>
                            {this.state.activeAccount != null &&
                            <AccDetails activeAccount={this.state.activeAccount}
                                        toggleCleared={this.toggleCleared}
                                        toggleFlag={this.toggleFlag}
                                        selectAllFlags={this.selectAllFlags}
                                        addTxn={this.addTxn}
                                        filterTxns={this.filterTxns}
                                        deleteTxns={this.deleteTxns}
                                        accounts={this.state.budget.accounts}
                                        payees={this.state.payees}
                                        budget={budget}
                                        makeTransfer={this.makeTransfer}/>}

                            <ScheduleContainer/>
                        </SplitPane>
                    </div>
                </SplitPane>
            </div>
        )
    }
}