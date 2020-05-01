import React, {Component} from 'react'
import Account from "./account";
import AccDash, {AccountListTypes} from "./dash";
import AccDetails, {DEF_TXN_FIND_TYPE} from "./details";
import ScheduleContainer from "./schedule";
import './budget.css'
import './budget_dash.css'
import './acc_details.css'
import SplitPane from 'react-split-pane';
import '../../utils/split_pane.css'

import {FIRST_PAGE, PREV_PAGE, NEXT_PAGE, LAST_PAGE} from "../account/account";
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

    set created(created) {
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
        this.accounts = this.accounts.filter((acc, i) => {
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
// retrieve them with a single HTTP request - https://docs.couchdb.org/en/master/ddocs/views/joins.html & https://docs.couchdb.org/en/master/ddocs/views/joins.html#using-view-collation
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
//          To start couchdb: docker-compose up -d
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
// TODO: import from downloaded bank csv option?

export default class BudgetContainer extends Component {

    txnSelectDefault = {type: "txn", acc: null}
    // TODO: remove txnOrder, include_docs, ....
    skip = 0
    limit = 100
    txnFindDefault = {txnOrder: {rowId: 'date', dir: 'desc'},
                      search: {value: null, type: DEF_TXN_FIND_TYPE, exactMatch: true},
                      include_docs: true}

    constructor(props) {
        super(props);
        this.canceler = null;
        this.db = null
    }

    state = {
        loading: true,
        budget: null,
        activeAccount: null,
        catItems: null,
        payees: null,
        txnFind: this.txnFindDefault
    }

    // TODO: move in to util file
    _onMouseMove = (e) => {
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
    // TODO: associate with a user and budget
    // TODO: see https://pouchdb.com/external.html for authentication logins etc
    // Note: I use pouchdb mango queries for simple fetch, filter and sort queries and map/reduce queries for one to many fetches
    //       https://pouchdb.com/guides/queries.html
    //  eg: to get catitem for a txn I use https://docs.couchdb.org/en/master/ddocs/views/joins.html#linked-documents
    //      https://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html
    componentDidMount() {


        // TODO: remove this?
        // const db = this.props.db
        // Account.createDummyMapReduce(db);
        // db.query('my_index/by_name').then(function (res) {
        //     // got the query results
        //     console.log(res)
        // }).catch(function (err) {
        //     console.log(err)
        //     // some error
        // });

        // var x = function mapFun(doc) {
        //         if (doc.title) {
        //           console.log(doc.title);
        //         }
        //       }.toString()
        // console.log(x)


        this.fetchBudgetData("1")

        // TODO: when finished testing remove this
        // this.insertDummyData();
    }

    insertDummyData() {
        // load lots of txns for flex acc
        // note: clear old data (stop npm, delete and recreate db in faxuton, clear db caches in browser) and run:
        // curl -H "Content-Type:application/json" -d @src/backup/budget.json -vX POST http://127.0.0.1:5984/budget/_bulk_docs
        const db = this.props.db
        //
        // const payees = ['nationwide flex direct', 'halifax ynab budget', 'pbonds 1 - steve', 'airbnb', 'amazon', 'cazoo', 'cerys rent']
        const payees = [17,18,19,20,21,21,23]
        // const cats = ['cash claire £300', 'cash steve £350', 'corsa petrol', 'council tax', 'cerys accom']
        const catItems = [10,11,12,13,14,15,16]
        let dt = new Date('1996-4-1'); // 8760 days ago
        let clearbal = 0
        let unclearbal = 0
        let count = 0
        const totalTxns = 8760
        const largeNoTxns = Array(totalTxns).fill().map((val, idx) => {

            const amt = (idx + 1) * 100
            let outAmt = 0
            let inAmt = 0
            // const cleared = Math.random() < 0.8
            const cleared = count > 5
            if (Math.random() < 0.2)
            {
                outAmt = amt
                if (cleared)
                    clearbal =- amt
                else
                    unclearbal =- amt
            }
            else
            {
                inAmt = amt
                if (cleared)
                    clearbal =+ amt
                else
                    unclearbal =+ amt
            }

            const payee = payees[Math.floor(Math.random() * payees.length)]
            const catItemId = catItems[Math.floor(Math.random() * catItems.length)]
            dt.setDate(dt.getDate() + 1);
            return {
                "type": "txn",
                "acc": "5",
                "flagged": false,
                "date": dt.toISOString().substr(0, 10),
                "payee": payee,
                "catItem": catItemId,
                "memo": idx + "",
                "out": outAmt,
                "in": inAmt,
                "cleared": cleared,
            }
            count += 1
        });
        // update clearbal and unclearbal in account 5
        db.get("5").then(function(doc){
            doc.clearbal = clearbal
            doc.unclearbal = unclearbal
            return db.post(doc)
        }).then(function(doc){
            console.log(doc)
        }).catch(function (err) {
                console.log(err);
            });

        for (const txn of largeNoTxns) {
            db.post(txn).then(
                function (doc) {
                    console.log(doc.id)

                }
            ).catch(function (err) {
                console.log(err);
            })
        }
    }

// https://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html
    // https://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html
    // https://www.bennadel.com/blog/3255-experimenting-with-the-mango-find-api-in-pouchdb-6-2-0.htm
    // The .find() plugin will also search secondary indices; but, only the
    // indices created using the .find() plugin (presumably because those
    // are the only indices that offer insight into which fields were emitted
    // during the index population).
    // https://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html
    // promises: https://blog.bitsrc.io/understanding-promises-in-javascript-c5248de9ff8f
    // TODO: move into budget class
    fetchBudgetData(budId) {
        let budget, budName
        var self = this
        var accs = []
        const db = this.props.db

        // TODO: load up catitems into state.catItems and tie into txns list and update when new one added
        BudgetContainer.fetchDataPhase1(db, budId, budName, accs, budget, self);
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


    // TODO: merge calls for data into less calls
    static fetchDataPhase1(db, budId, budName, accs, budget, self) {
        db.find({
            selector: {
                _id: {
                    $eq: "bud:" + budId,
                }
            }
        }).then(
            function (results) {
                results.docs.forEach(
                    function (doc) {
                        budName = doc.name
                    }
                );
                return db.createIndex({index: {fields: ["type", "bud", "weight"]}, ddoc: 'accIndex'})
            }).then(function () {
            return db.find({
                use_index: 'accIndex',
                selector: {
                    type: "acc",
                    bud: budId,
                    weight: {$gte: null}
                }
            })
        }).then(function (results) {
            results.docs.forEach(
                function (doc) {
                    accs.push(new Account(doc))
                })

            budget = new Budget(budName, accs)
            const activeAccount = accs.length > 0 ? accs[0] : null
            return activeAccount
        }).then(function (activeAccount) {
            const payees = []
            const state = {
                budget: budget,
                activeAccount: activeAccount,
                payees: payees
            }
            // show budget and accounts
            self.setState(state)
            // load up txns asynchronously
            BudgetContainer.fetchDataPhase2(db, self, activeAccount);
        }).catch(function (err) {
            // TODO: decide best approach for this
            self.setState({loading: false})
            console.log(err);
        });
    }

    // linked docs - https://docs.couchdb.org/en/stable/ddocs/views/joins.html#linked-documents
    // views - https://pouchdb.com/api.html#query_database
    // relative performance - https://stackoverflow.com/questions/42029126/pouchdb-query-vs-find-vs-alldocs-performance
    static fetchDataPhase2(db, self, activeAccount) {
        db.createIndex({index: {fields: ["type", "weight"]}, ddoc: 'catIndex'}).then(function (activeAccount) {
            return db.find({
                use_index: 'catIndex',
                selector: {
                    type: "catitem",
                    weight: {$gte: null}
                }
            })}).then(function (results) {
                    const catItems = results.docs
                    // TODO: need to get cat item cat name to use a group inside drop down when editting
                    // TODO: load up payees
                    Account.loadTxns(self, activeAccount, true, catItems)
                }
            ).catch(function (err) {
                // TODO: decide best approach for this
                self.setState({loading: false})
                console.log(err);
            });

    }

    sortCol = (rowId) => {
        // TODO: move inside sortTxns
        const dir = this.state.txnFind.txnOrder.dir === 'desc' ? 'asc' : 'desc'
        const txnOrder = {rowId: rowId, dir: dir}
        let txnFind = this.state.txnFind
        txnFind['txnOrder'] = txnOrder
        this.setState({txnFind: txnFind}, () => {
            Account.sortTxns(this, this.state.activeAccount, false)
        })
    }

    // TODO: remove state variable?
    filterTxns = (state) => {
        const search = {value: state.target, type: state.type, exactMatch: state.exact}
        let txnFind = this.state.txnFind
        txnFind['search'] = search
        // changing state causes txns list to be rebuilt and during this is uses txnFind to filter
        this.setState({txnFind: txnFind})
    }

    resetTxns = (state) => {
        const txnFind = {...this.txnFindDefault}
        this.setState({txnFind: txnFind})

        // Account.updateTxns(this, this.state.activeAccount, true)
    }

    handleAccClick = (event, acc) => {
        // clear txns from memory of previously active account
        let oldAccAcc = this.state.activeAccount
        oldAccAcc.txns = []
        Account.loadTxns(this, acc, true)
    }


    // TODO: if filter/search or change acc then reset txnOptions
    firstPage = (acc) => {
        // Account.updateTxns(this, this.state.activeAccount, false, FIRST_PAGE)
    }

    // TODO: get dynamic totals to work with pagination
    // TODO: get this to work - remember: once skip grows to a large number, your performance will start to degrade pretty drastically
    //       see https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
    prevPage = () => {
        // Account.updateTxns(this, this.state.activeAccount, false, PREV_PAGE)
    }

    nextPage = () => {
        // Account.updateTxns(this, this.state.activeAccount, false, NEXT_PAGE)
    }

    // TODO: code this
    lastPage = () => {
        // Account.updateTxns(this, this.state.activeAccount, false, LAST_PAGE)
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
                if (account.id === targetAcc.id) {
                    if (open != null)
                        account.open = doc.open
                    if (weight != null)
                        account.weight = doc.weight
                    if (onBudget != null)
                        account.onBudget = doc.onBudget
                    break
                }
            if (targetAcc.txns.length > 0)
                self.setState({budget: bud, activeAccount: targetAcc})
            else
            {
                self.setState({budget: bud})
                // TODO: only load if acc dragged is different from activeAccount
                Account.updateTxns(self, targetAcc, true)
            }
        });
    }


    handleMoveAccount = (draggedAcc, targetListType, overWeight) => {
        let open
        let onBudget
        if (targetListType === AccountListTypes.BUDGET) {
            open = true
            onBudget = true
        } else if (targetListType === AccountListTypes.OFF_BUDGET) {
            open = true
            onBudget = false
        } else {
            open = false
            onBudget = false
        }
        const weight = MOUSE_DIR === MOUSE_DOWN ? overWeight + 1 : overWeight - 1
        this.setAccDragDetails(draggedAcc, open, weight, onBudget)
    }

    handleSaveAccount = formState => {
        let accounts
        const self = this
        const db = self.props.db
        let budget = this.state.budget
        // TODO: suss how to get and use bud id below
        if (formState.acc === null) {
            const acc = {
                "type": "acc",
                "bud": "1",
                "name": formState.name,
                "bal": 0,
                "onBudget": formState.budgetState === 'on',
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
        } else {
            // update account
            // in memory model
            accounts = this.state.budget.accounts
            const accId = formState.acc.id
            const index = accounts.findIndex((obj => obj.id === formState.acc.id))
            const budState = formState.budgetState === 'on'
            accounts[index].name = formState.name
            accounts[index].notes = formState.notes
            accounts[index].open = formState.open
            accounts[index].onBudget = budState
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

    render() {
        const {budget} = this.state
        const panel1DefSize = localStorage.getItem('pane1DefSize') || '300';
        const panel2DefSize = localStorage.getItem('pane2DefSize') || '70%';
        return (
            <div>
                { this.state.loading && <div className="loader">Loading ...</div>}
                <div onMouseMove={this._onMouseMove} id='budget'>
                    {/* https://github.com/tomkp/react-split-pane and examples: http://react-split-pane-v2.surge.sh/ */}
                    <SplitPane split="vertical" minSize={200} maxSize={450}
                               defaultSize={parseInt(panel1DefSize, 10)}
                               onChange={size => localStorage.setItem('pane1DefSize', size)}>
                        {/* TODO: pass thru fns etc in an object for tidiness */}
                        {/* TODO: insure I dont use components when the class simply displays */}
                        <AccDash budget={this.state.budget}
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
                                            // TODO: remove?
                                            payees={this.state.payees}
                                            budget={budget}
                                            makeTransfer={this.makeTransfer}
                                            firstPage={this.firstPage}
                                            prevPage={this.prevPage}
                                            nextPage={this.nextPage}
                                            lastPage={this.lastPage}
                                            txnFind={this.state.txnFind}
                                            sortCol={this.sortCol}
                                            resetTxns={this.resetTxns}
                                />}

                                <ScheduleContainer/>
                            </SplitPane>
                        </div>
                    </SplitPane>
                </div>
            </div>
        )
    }
}