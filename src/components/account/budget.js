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
import PouchdbFind from 'pouchdb-find';
// TODO: remove these
import PouchDB from 'pouchdb-browser'
PouchDB.plugin(PouchdbFind);
// PouchDB.debug.enable( "pouchdb:find" );

// TODO: load and save etc from couchdb
// TODO: delete broweser db and ensure all works as expected
// TODO: shutdown remote db and ensure all ok
// TODO: update remote db directly and ensure changes appear
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
            total += account.balance
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
//          http://127.0.0.1:5984/budget/_design/budget/_view/budget?include_docs=true
//      View Cookbook for SQL Jockeys: https://docs.couchdb.org/en/master/ddocs/views/nosql.html
//      Fauxton: http://127.0.0.1:5984/_utils/#database/budget/_all_docs
//      load up json doc:
//          http://docs.couchdb.org/en/latest/api/database/bulk-api.html#db-bulk-docs
//          curl -H "Content-Type:application/json" -d @src/backup/budget.json -vX POST http://127.0.0.1:5984/budget/_bulk_docs
// PouchDB was inspired by CouchDB (hence the name), but it is designed for storing local data and then syncing to a CouchDB database when a connection is available.
// PouchDB docs:  https://pouchdb.com/
//  async:  https://pouchdb.com/guides/async-code.html
//          https://pouchdb.com/2015/03/05/taming-the-async-beast-with-es7.html
// queries: https://pouchdb.com/guides/mango-queries.html, https://www.bennadel.com/blog/3255-experimenting-with-the-mango-find-api-in-pouchdb-6-2-0.htm
// pagination: https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
// Use and abuse your doc IDs (just over half way down) to avoid using map/reduce: https://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html
// Important - how to use views in pouchdb: https://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html
// Really useful:
//      https://www.bennadel.com/blog/3195-pouchdb-data-modeling-for-my-dig-deep-fitness-offline-first-mobile-application.htm
//      https://www.bennadel.com/blog/3196-creating-a-pouchdb-playground-in-the-browser-with-javascript.htm
//      https://www.bennadel.com/blog/3255-experimenting-with-the-mango-find-api-in-pouchdb-6-2-0.htm
//      https://www.bennadel.com/blog/3258-understanding-the-query-plan-explained-by-the-find-plugin-in-pouchdb-6-2-0.htm
// TODO: read Tips for writing views - https://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html
// TODO: change bd permissions and add admins http://127.0.0.1:5984/_utils/#/database/budget/permissions
// TODO: ensure if delete account then children are deleted etc
// TODO: handle getting single budget for single user
// TODO: follow this: https://pouchdb.com/2014/06/17/12-pro-tips-for-better-code-with-pouchdb.html
// TODO: see db per user approach: https://www.bennadel.com/blog/3195-pouchdb-data-modeling-for-my-dig-deep-fitness-offline-first-mobile-application.htm


export default class BudgetContainer extends Component
{
    constructor(props) {
        super(props);
        this.canceler = null;
        this.db = null
        this.txnOptions = {limit : 5}
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
        this.fetchBudgetData("1")

        // TODO: when finished testing remove this
        // load lots of txns for flex acc
        // note: clear old data and run this first: curl -H "Content-Type:application/json" -d @src/backup/budget.json -vX POST http://127.0.0.1:5984/budget/_bulk_docs
        // const db = this.props.db
        // const largeNoTxns = Array(8760).fill().map((val, idx) => {
        //     const amt = (idx + 1) * 100
        //     return {
        //                 "type": "txn",
        //                 "acc": "5",
        //                 "flagged": false,
        //                 "date": "2020-01-20",
        //                 "payee": "1",
        //                 "cat": "1",
        //                 "memo": idx + "",
        //                 "out": amt,
        //                 "in": 0,
        //                 "cleared": false
        //             }
        // });
        // for (const txn of largeNoTxns)
        // {
        //     db.post(txn).then(
        //             function (doc) {
        //                 console.log(doc.id)
        //
        //             }
        //         ).catch(function (err) {
        //     console.log(err);
        // })
        // }
    }

    fetchBudgetData(budId)
    {
        let budget, budName
        var self = this
        var accs = []
        const db = this.props.db
        // TODO: for testing only
        // Every PouchDB operation returns a Promise
        var promise = db.find({
                    selector: {
                        _id: {
                            $eq: "bud:" + budId,
                        }
                    }
                });

                promise.then(
                    function (results) {
                        results.docs.forEach(
                            function (doc) {
                                budName = doc.name
                            }
                        );

                    }
                ).then(
	function() {

		// The .find() plugin will also search secondary indices; but, only the
		// indices created using the .find() plugin (presumably because those
		// are the only indices that offer insight into which fields were emitted
		// during the index population).
        // https://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html
		var promise = db.createIndex({
			index: {
				fields: ["weight", "type", "bud"]
			}
		});

		return( promise );

    }
        ).then(
            function () {
                // Now that we have our [ type, age ] secondary index, we can search
                // the documents using both Type and Age.
                var promise = db.find({
                    selector: {
                        type: "acc",
                        bud: budId
                    }
                });

                promise.then(
                    function (results) {
                        results.docs.forEach(
                            function (doc) {
                                accs.push(new Account(doc))
                            }
                        );
                    budget = new Budget(budName, accs)

                    const activeAccount = accs.length > 0 ? accs[0] : null
                    const payees = []
                    const name = activeAccount != null ? activeAccount.name : ''

                    self.setState({
                        loading: false,
                        budget: budget,
                        activeAccount: activeAccount,
                        payees: payees})
                        Account.loadTxns(self, activeAccount, self.txnOptions)
                        return (promise);
                    })
                    }
                );
        // TODO: only load required data
        // this.fetchData();
        // TODO: enable
        // this.canceler = this.props.db.changes({
        //     since: 'now',
        //     live: true,
        //     include_docs: true,
        // }).on('change', () => {
        //     this.fetchData();
        // });
    }

    handleAccClick = (event, acc) => {
        // clear txns from memory of previously active account
        this.state.activeAccount.txns = []
        Account.loadTxns(this, acc, this.txnOptions)
    }
    // https://manifold.co/blog/building-an-offline-first-app-with-react-and-couchdb
    // https://docs.couchdb.org/en/stable/ddocs/views/intro.html
    // fetchData() {
    //     let bud
    //     let accs = []
    //     this.setState({
    //         loading: true,
    //         budget: null,
    //     });
    //     // TODO: suss how to access view
    //     // TODO: read: https://www.joshmorony.com/offline-syncing-in-ionic-2-with-pouchdb-couchdb/
    //     // TODO: suss multi user - https://www.joshmorony.com/creating-a-multiple-user-app-with-pouchdb-couchdb/
    //     // this.props.db.allDocs({
    //     //     include_docs: true,
    //     // }).then(result => {
    //     //     bud = result.rows[0].doc
    //     //     result.rows.forEach(function (row, index) {
    //     //         if (index > 0)
    //     //             accs.push(row.doc)
    //     //         {
    //     //             const doc = row.doc
    //     //         }
    //     //     });
    //     //     console.log(bud); // value
    //     //     console.log(accs); // value
    //     //     // this.setState({
    //     //     //     loading: false,
    //     //     //     elements: rows.map(row => row.doc),
    //     //     // })
    //     // }).catch((err) =>{
    //     //     console.log(err);
    //     // });
    //     // TODO: read https://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html
    //     //      and use?
    //     // TODO: suss how to create one to many using this approach
    //     // Note: I could have used map/reduce to handle one to many to reduce the no of
    //     //       GET calls, but as this app model is pretty simple it feels overkill
    //     //       so I have kept it simple
    //     //       Read more here: https://docs.couchdb.org/en/stable/ddocs/views/intro.html & https://pouchdb.com/api.html#query_database
    //     //                       & https://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html & https://www.bennadel.com/blog/3196-creating-a-pouchdb-playground-in-the-browser-with-javascript.htm
    //     // Create indices?
    //     // TODO: pass in the budget selected
    //     // TODO: to remove need for other indices, use the _id like: 'bud_1_acc_2...'
    //     const budId = "1"
    //     // this.props.db.find({
    //     //     selector: {_id: budId}
    //     // }).then(function (result) {
    //     //     console.log(result);
    //     //     this.props.db.find({
    //     //         selector: {type: 'acc', bud: budId}
    //     //     }).then(function (result) {
    //     //         console.log(result);
    //     //     })
    //     // }).catch(function (err) {
    //     //     console.log(err);
    //     //     console.log(err);
    //     // });
    //         const data = this.getDummyBudgetData()
    //         const accounts = data[0]
    //         const payees = data[1]
    //         const activeAccount = accounts.length > 0 ? accounts[0] : null
    //         this.setState({
    //             loading: false,
    //             budget: new Budget('House', accounts),
    //             activeAccount: activeAccount,
    //             payees: payees})
    // }

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
        const self = this
        const db = self.props.db
        db.get(targetAcc.id).then(function (doc) {
            return db.remove(doc);
        }).then(function (result) {
            self.state.budget.removeAccount(targetAcc)
            self.refreshBudgetState()
        }).catch(function (err) {
            console.log(err);
        });
    }

    setAccDragDetails = (targetAcc, open, weight, onBudget) => {
        const self = this
        const db = self.props.db
        db.get(targetAcc.id).then(function (doc) {
            if (open != null)
                doc.open = open
            if (weight != null)
                doc.weight = weight
            if (onBudget != null)
                doc.onBudget = onBudget
            return db.put(doc);
        }).then(function () {
            return db.get(targetAcc.id);
        }).then(function (doc) {
            // update in memory model
            let bud = self.state.budget
            for (const account of bud.accounts)
                if (account.id == targetAcc.id)
                {
                    if (open != null)
                        account.open = doc.open
                    if (weight != null)
                        account.weight = doc.weight
                    if (onBudget != null)
                        account.onBudget = doc.onBudget
                    break
                }
                self.setState({budget: bud})
        });
    }


    handleMoveAccount = (draggedAcc, targetListType, overWeight) => {
        // draggedAcc.open = true
        let open
        let onBudget
        if (targetListType == AccountListTypes.BUDGET)
        {
            open = true
            // draggedAcc.onBudget = true
            onBudget = true
        }
        else if (targetListType == AccountListTypes.OFF_BUDGET)
        {
            open = true
            // draggedAcc.onBudget = false
            onBudget = false
        }
        else
        {
            open = false
            // draggedAcc.onBudget = false
            onBudget = false
            // this.setAccDragDetails(draggedAcc, false)
            // draggedAcc.open = false
        }
        const weight = MOUSE_DIR == MOUSE_DOWN ? overWeight+1 : overWeight-1
        this.setAccDragDetails(draggedAcc, open, weight, onBudget)
    }

    handleSaveAccount = formState => {
        let accounts
        const self = this
        const db = self.props.db
        let budget = this.state.budget
        // TODO: suss how to get and use bud id below
        if (formState.acc == null)
        {
            const acc = {
                        "type": "acc",
                        "bud": "1",
                        "name": formState.name,
                        "bal": 0,
                        "onBudget": formState.budgetState == 'on',
                        "open": formState.open,
                        "flagged": false,
                        "notes": "",
                        "weight": 0,
                        txns: []
                    }
            db.post(acc).then(function (doc) {
                return db.get(doc.id);
            }).then(function (doc) {
                // update in memory model
                const acc = new Account(doc)
                accounts = [...self.state.budget.accounts, acc]
                budget.accounts = accounts
                self.setState({budget: budget})
            }).catch(function (err) {
              console.log(err);
            });
        }
        else
        {
            // update account
            // in memory model
            accounts = this.state.budget.accounts
            const accId = formState.acc.id
            const index = accounts.findIndex((obj => obj.id == formState.acc.id))
            const budState = formState.budgetState == 'on'
            accounts[index].name = formState.name
            accounts[index].notes = formState.notes
            accounts[index].open = formState.open
            accounts[index].onBudget = formState.budgetState == 'on'
            budget.accounts = accounts
            self.setState({budget: budget})
            // db
            db.get(accId).then(function (doc) {
                doc.name = formState.name
                doc.notes = formState.notes
                doc.open = formState.open
                doc.onBudget = budState
                return db.put(doc);
            })
        }
    }

    toggleCleared = (txn) => {
        const self = this
        const db = self.props.db
        const clear = !txn.clear
        // db
        db.get(txn.id).then(function (doc) {
            doc.cleared = clear
            return db.put(doc);
        }).then(function (doc) {
            txn.clear = clear
            self.refreshBudgetState()
        })
    }

    toggleFlag = (txn, refreshState, state) => {
        const self = this
        const db = self.props.db
        const flagged = typeof state == 'undefined' ? !txn.flagged : state
        // db
        db.get(txn.id).then(function (doc) {
            doc.flagged = flagged
            return db.put(doc);
        }).then(function (doc) {
            txn.flagged = flagged
            if (refreshState)
                self.refreshBudgetState()
        })
    }

    selectAllFlags = (allFlagged) => {
        for (let txn of this.state.activeAccount.txns)
            this.toggleFlag(txn, false, !allFlagged)
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

    render(){
        const {budget} = this.state
        const panel1DefSize = localStorage.getItem('pane1DefSize') || '300';
        const panel2DefSize = localStorage.getItem('pane2DefSize') || '70%';
        return (
            <div onMouseMove={this._onMouseMove} id='budget'>
                {/* https://github.com/tomkp/react-split-pane and examples: http://react-split-pane-v2.surge.sh/ */}
                <SplitPane split="vertical" minSize={200} maxSize={450}
                      defaultSize={parseInt(panel1DefSize, 10)}
                      onChange={size => localStorage.setItem('pane1DefSize', size)}>
                    {/* TODO: pass thru fns etc in an object for tidiness */}
                    {/* TODO: insure I dont use components when the class simply displays */}
                    <AccDash budget={budget}
                             setAccDragDetails={this.setAccDragDetails}
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
                            {this.state.activeAccount != null && this.state.budget.accounts != null &&
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