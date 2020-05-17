import React, {Component} from 'react'
import Account from "./account";
import AccDash, {AccountListTypes} from "./dash";
import AccDetails from "./details";
import ScheduleContainer from "./schedule";
import './budget.css'
import './budget_dash.css'
import './acc_details.css'
import SplitPane from 'react-split-pane';
import '../../utils/split_pane.css'
import {DESC} from './sort'
import {KEY_DIVIDER, BUDGET_PREFIX, ACC_PREFIX, TXN_PREFIX} from './keys'
import {DATE_ROW} from "./rows";
import {getDateIso} from "../../utils/date";
import Trans from "./trans";
import handle_error, {handle_db_error} from "../../utils/db";

// PouchDB.debug.enable( "pouchdb:find" );

// TODO: load and save etc from couchdb
// TODO: delete broweser db and ensure all works as expected
// TODO: shutdown remote db and ensure all ok
// TODO: update remote db directly and ensure changes appear
class Budget {
    constructor(budDoc) {
        this.bid = budDoc._id
        this.brev = budDoc._rev
        this.bcreated = new Date()
        this.bname = budDoc.name
        this.baccounts = []
        this.bcats = budDoc.cats
        this.bpayees = budDoc.payees.sort(this.comparePayees)
    }

    comparePayees(a, b) {
        const A = a.name.toLowerCase()
        const B = b.name.toLowerCase()
        if (A < B) {
            return -1;
        }
        if (A > B) {
            return 1;
        }
        return 0;
    }

    get id() {
        return this.bid
    }

    get rev() {
        return this.brev
    }

    set rev(rev) {
        this.brev = rev
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

    get payees() {
        return this.bpayees;
    }

    set payees(payees) {
        this.bpayees = payees;
    }

    get cats() {
        return this.bcats;
    }

    set cats(cats) {
        this.bcats = cats;
    }

    removeAccount = targetAcc => {
        this.accounts = this.accounts.filter((acc, i) => {
            return acc.id !== targetAcc.id
        })
    }

    getTotal = () => {
        let total = 0;
        for (const account of this.accounts)
            total += account.total
        return total;
    }

    getTransferAccounts() {
        return this.accounts.filter(function (acc) {
            return acc.open;
        }).map(function (acc) {
            if (acc.open)
                return {
                    id: acc.id,
                    name: acc.name,
                }
        });
    }

    getPayee(id) {
        let item = null
        id = id + ''
        const payees = this.getTransferAccounts().concat(this.payees)
        for (const payee of payees)
        {
            if (payee.id === id)
            {
                item = payee
                break
            }
        }
        return item;
    }

    getCatItem(id) {
        let item = null
        const cats = [Trans.getIncomeCat()].concat(this.cats)
        id = id + ''
        for (const cat of cats)
        {
            for (const catItem of cat.items)
            {
                if (catItem.id === id)
                {
                    item = catItem
                    break
                }
            }
            if (item != null)
                break
        }
        return item;
    }

    addPayee(db, txn, accDetailsCont) {
        let budget = this
        let maxId = 0
        let newItem = {name: txn.payeeName, catSuggest: null}
        for (const payee of this.payees)
        {
            // payee id must be a string so that it can hold acc_id if transfer selected
            const id = parseInt(payee.id)
            if (id > maxId)
                maxId = id
        }
        maxId += 1
        newItem.id = maxId + ''
        // get list of payees ready for save - doing this will update the in memory model also
        budget.payees.push(newItem)
        budget.payees = this.payees.sort(this.comparePayees)
        txn.payee = newItem.id
        txn.payeeName = newItem.name

        // adds new payee to budget in db, save txn with new payee details, and refreshes budget container
        this.updateBudgetWithNewTxnPayee(db, txn, accDetailsCont)
    }

    // TODO: merge these two
    save(db, postSaveFn) {
        const self = this
        const json = self.asJson()
        db.get(self.id).then(function (doc) {
            json._rev = doc._rev // in case it has been updated elsewhere
            return db.put(json)
        }).then(function(){
            if (typeof postSaveFn !== "undefined")
                postSaveFn()
        }).catch(function (err) {
            handle_db_error(err, 'Failed to update the budget.', true);
        });
    }

    // save new payee to db and then save the txn which calls txn.txnPostSave which updates totals etc in UI
    // if the payee update fails then the txn is not saved
    updateBudgetWithNewTxnPayee(db, txn, accDetailsCont) {
        const self = this
        const json = self.asJson()
        db.get(self.id).then(function (doc) {
            json._rev = doc._rev // in case it has been updated elsewhere
            db.put(json).then(function (result) {
                txn.save(db, accDetailsCont)
            })
        }).catch(function (err) {
            handle_db_error(err, 'Failed to update the payee list in the budget. The transaction changes have not been saved.', true);
        });
    }

     asJson()
    {
        return {
                "_id": this.id,
                "_rev": this.rev,
                "type": "bud",
                "name": this.name,
                "currency": this.ccy,
                "created": this.created,
                "cats": this.cats,
                "payees": this.payees
        }
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
    constructor(props) {
        super(props);
        this.canceler = null;
        this.db = null
    }

    state = {
        loading: true,
        budget: null,
        activeAccount: null
    }

    // TODO: update totals?
    // TODO: is db being updated?
    handleDeleteAccount = targetAcc => {
        const self = this
        const db = self.props.db
        db.get(targetAcc.id).then(function (doc) {
            return db.remove(doc);
        }).then(function (result) {
            self.state.budget.removeAccount(targetAcc)
            self.refreshBudgetState()
        }).catch(function (err) {
            handle_db_error(err, 'Failed to delete the account.', true)
        });
    }

    // TODO: code this - hold in memory list of delete txns, grouped by datetime and every type this is run restore
    //       the newest, when no more left disable the undo button
    undoTxnDelete = () => {

    }

    // TODO: update totals
    deleteTxns = (txn_ids) => {
        this.state.activeAccount.deleteTxns(this.props.db, txn_ids, this.state.budget, this.refreshBudgetState)
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
        // TODO: pass this in
        const budId = "1"
        var self = this
        const db = this.props.db
        BudgetContainer.fetchData(self, db, budId);
        // TODO: enable
        // this.canceler = db.changes({
        //     since: 'now',
        //     live: true,
        //     include_docs: true,
        // }).on('change', () => {
        //     this.fetchData();
        // });

        // TODO: when finished testing remove this
        // this.insertDummyData("1", "2");
    }

    insertDummyData(budId, short_aid) {
        const long_aid = BUDGET_PREFIX + budId + KEY_DIVIDER + ACC_PREFIX + short_aid
        const totalTxns = 8760
        // add dummy txns to flex direct acc
        // load lots of txns for flex acc
        // note: clear old data (stop npm, delete and recreate db in faxuton, clear db caches in browser) and run:
        // curl -H "Content-Type:application/json" -d @src/backup/budget.json -vX POST http://127.0.0.1:5984/budget/_bulk_docs
        const db = this.props.db
        let accTotalAmt = 0
        //
        const payees = ["11","12","13","14","15","16"]
        const catItems = ["4","5","6","7","8","9","10"]
        let dt = new Date('1996-4-1'); // 8760 days ago
        const largeNoTxns = Array(totalTxns).fill().map((val, idx) => {
            const amt = (idx + 1) * 100
            let outAmt = 0
            let inAmt = 0
            // const cleared = Math.random() < 0.8
            const cleared = idx > 5
            if (Math.random() < 0.2)
            {
                accTotalAmt -= amt
                outAmt = amt
            }
            else
            {
                accTotalAmt += amt
                inAmt = amt
            }

            const payee = payees[Math.floor(Math.random() * payees.length)]
            const catItemId = catItems[Math.floor(Math.random() * catItems.length)]
            dt.setDate(dt.getDate() + 1);
            return {
                "_id": BUDGET_PREFIX + budId + KEY_DIVIDER + TXN_PREFIX + idx,
                "type": "txn",
                "acc": short_aid,
                "flagged": false,
                "date": getDateIso(dt),
                "payee": payee,
                "catItem": catItemId,
                "memo": idx + "",
                "out": outAmt,
                "in": inAmt,
                "cleared": cleared,
                "transfer": null
            }
        });
        for (const txn of largeNoTxns) {
            db.put(txn).then(
                function (doc) {
                    console.log(doc.id)

                }
            ).catch(function (err) {
                console.log(err);
            })
        }
        // update account total
        db.get(long_aid).then(function (doc) {
            const acc = new Account(doc)
            let json = acc.asJson()
            json._id = doc._id
            json._rev = doc._rev
            json.total = accTotalAmt
            return db.put(json);
        }).catch(function (err) {
            console.log(err);
        })
    }

    // see 'When not to use map/reduce' in https://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html
    // allDocs is the fastest so to reduce no of requests and make it as fast as possible I use the id for stuffing data
    // used to load the correct docs
    // after many false starts I have taken approach of making the _id of docs be prefixed with budget and id then the
    // doc type and id, I will then load up the budget, accouns and all txns in one go as this ends up being most
    // efficient way to do using couchdb and happens to be way financier does it
    // Note: I originally used pochdb.find() with createIndex() with an index on each column.
    //       With this I was able to sort, search and paginate.
    //       I had an issue with using this approach for cat items as a cat item belongs to a cat and one or more
    //       txns. Due to this I now use ids to load budget with now contains cats, cat items and payees using allDocs()
    //      and allDocs() to load txns. This is much more efficient and doesn't require individual indices.
    //      I store all txns in memory and do the sorting, searching and pagination via this in memory model, but only
    //      add a page worth to the virtual dom. Cat items and payees are added to each txn in a xxxName field eg
    //      catItemName and I do the sorting etc on this field.
    //      Using this approach with 9K txns added approx 5 MB to RAM which is acceptable. This approach also
    //      reduces the total requests to the db to two.
    // TODO: confirm that local db is auto kept in sync with remote, so loading up all txns should not take long as its
    //       getting them from local db
    static fetchData(self, db, budId) {
        // TODO: tidy up
        // get budget & accounts & txns (all prefixed with budgetKey)
        const key = BUDGET_PREFIX + budId
        db.allDocs({startkey: key, endkey: key + '\uffff', include_docs: true})
            .then(function(results){
                let budget
                var accs = []
                var txns = {}
                let activeAccount = null

                // TODO: decide if we need type and id in budget.cats and budget.payees
                // extract budget and account data - assuming no order, eg txns could come before accs
                for (const row of results.rows)
                {
                    const doc = row.doc
                    switch(doc.type)
                    {
                        case 'bud':
                            budget = new Budget(doc)
                            break
                        case 'acc':
                            let acc = new Account(doc)
                            accs.push(acc)
                            if (acc.active)
                                activeAccount = acc
                            break
                        case 'txn':
                            // TODO: do I need to store type inside cat and catitems?
                            let txn = new Trans(doc)
                            let accKey = BUDGET_PREFIX + budId + KEY_DIVIDER + ACC_PREFIX + txn.acc
                            if (typeof txns[accKey] === "undefined")
                                txns[accKey] = []
                            txns[accKey].push(txn)
                            break
                        default:
                            break
                    }
                }

                // ensure we have an active account
                if (accs.length > 0)
                    activeAccount = activeAccount === null ? accs[0]: activeAccount

                // now join the pieces together
                budget.accounts = accs
                for (let acc of accs)
                {
                    let txnsForAcc = txns[acc.id]
                    if (typeof txnsForAcc !== "undefined")
                    {

                        // set default order
                        txnsForAcc = txnsForAcc.sort(Account.compareTxnsForSort(DATE_ROW, DESC));
                        BudgetContainer.enhanceTxns(txnsForAcc, budget);
                        acc.txns = txnsForAcc
                    }
                    acc.updateAccountTotal()
                }

                const state = {
                    budget: budget,
                    activeAccount: activeAccount,
                    loading: false
                }
                // show budget and accounts
                self.setState(state)
            })
            .catch(function (err) {
                self.setState({loading: false})
                handle_db_error(err, 'Failed to load the budget.', true)
        });
    }

    static enhanceTxns(txnsForAcc, budget) {
        // enhance transactions by adding name equivalent for cat and payee to ease sorting and searching
        // and make code easier to understand
        for (let txn of txnsForAcc) {
            let catItem = budget.getCatItem(txn.catItem)
            let payeeItem = budget.getPayee(txn.payee)
            if (catItem === null || payeeItem === null)
            {
                throw 'Budget corrupt, please reload from  you most recent backup. Code: 1.'
            }
            if (catItem !== null)
                txn.catItemName = catItem.name
            if (payeeItem !== null)
                txn.payeeName = payeeItem.name
        }
    }

    handleAccClick = (event, acc) => {
        Account.updateActiveAccount(this.props.db, this.state.activeAccount, acc, this)
    }

    refreshBudgetState = (budget) => {
        budget = typeof budget === "undefined" ? this.state.budget : budget
        this.setState({budget: budget})
    }

    // TODO: add catch
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
            Account.updateActiveAccount(db, self.state.activeAccount, targetAcc, self)
        }).catch(function (err) {
                handle_db_error(err, 'Failed to save drag details.', true)
            });
    }

    handleSaveAccount = formState => {
        let accounts
        const self = this
        const db = self.props.db
        let budget = this.state.budget
        if (formState.acc === null) {
            // TODO: use put and provide an id following correct id name strategy
            // TODO: use toJson ?
            const acc = {
                "type": "acc",
                "bud": "1", // TODO: suss how to get and use bud id
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
                handle_db_error(err, 'Failed to save the account.', true)
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
            }).catch(function (err) {
                handle_db_error(err, 'Failed to update the account.', true)
            });
        }
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

    // TODO: code this
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
                                    <AccDetails db={this.props.db}
                                                budget={budget}
                                                activeAccount={this.state.activeAccount}
                                                toggleCleared={this.toggleCleared}
                                                toggleFlag={this.toggleFlag}
                                                deleteTxns={this.deleteTxns}
                                                refreshBudgetState={this.refreshBudgetState}
                                                makeTransfer={this.makeTransfer}
                                    />
                                }
                                <ScheduleContainer/>
                            </SplitPane>
                        </div>
                    </SplitPane>
                </div>
            </div>
        )
    }
}