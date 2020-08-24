import React, {Component} from 'react'
import AccountsContainer, {Budget, BudgetList} from '../account/budget'
import Trans from "../account/trans";
// https://www.manifold.co/blog/building-an-offline-first-app-with-react-and-couchdb
import PouchDB from 'pouchdb-browser'
import {BUD_COUCH_URL, DB_NAME} from "../../constants";
import {DB_PUSH, Loading} from "../../utils/db";
import {DAILY_FREQ, WEEKLY_FREQ, BI_WEEKLY_FREQ, MONTHLY_FREQ, YEARLY_FREQ, ONCE_FREQ} from "../account/details";
import {BUDGET_PREFIX, SHORT_BUDGET_PREFIX, ACC_PREFIX, KEY_DIVIDER, SCHED_EXECUTED_PREFIX} from "../account/keys";
import {handle_db_error, DB_PULL, DB_CHANGE, DB_PAUSED, DB_ACTIVE, DB_COMPLETE, DB_DENIED, DB_ERROR} from "../../utils/db";
import {ACC_DOC_TYPE, TXN_DOC_TYPE, TXN_SCHED_DOC_TYPE} from "../account/budget_const";
import {getDateIso} from "../../utils/date"
const cron = require("node-cron");
const db = new PouchDB(DB_NAME); // creates a database or opens an existing one
// https://github.com/pouchdb/upsert
PouchDB.plugin(require('pouchdb-upsert'))
// Note: if not syncing then ensure cors is enabled in fauxton: http://127.0.0.1:5984/_utils/#_config/nonode@nohost/cors

// Updating documents correctly - https://pouchdb.com/guides/documents.html#updating-documents%E2%80%93correctly
// https://github.com/FortAwesome/react-fontawesome#installation
// couchdb best practices: https://github.com/jo/couchdb-best-practices
// promises: https://blog.bitsrc.io/understanding-promises-in-javascript-c5248de9ff8f
// https://medium.com/@Charles_Stover/optimal-file-structure-for-react-applications-f3e35ad0a145
// https://www.codecademy.com/search?query=reactjs
// https://www.codecademy.com/articles/how-to-create-a-react-app
// https://www.taniarascia.com/getting-started-with-react/
// https://stories.jotform.com/7-reasons-why-you-should-use-react-ad420c634247#.skkxdv33n
// https://stories.jotform.com/offline-first-web-applications-d2d321444510
// https://www.valentinog.com/blog/redux/
// https://reactstrap.github.io/
// https://www.npmjs.com/package/react-datepicker
// https://github.com/algm/reactstrap-confirm
// https://www.npmjs.com/package/react-number-format
// https://blog.logrocket.com/a-guide-to-usestate-in-react-ecb9952e406c/
// https://medium.com/the-andela-way/react-drag-and-drop-7411d14894b9
// https://codepen.io/lopis/pen/XYgRKz
// no need to declare state or bind methods in constructor: https://hackernoon.com/the-constructor-is-dead-long-live-the-constructor-c10871bea599
// . you should use functional components if you are writing a presentational component which doesn’t have its own state
// or needs to access a lifecycle hook
// . you generally want to avoid changing the DOM directly when using react
// files: generally, reusable components go into their own files whereas components that are dependent on each other
//        for a specific purpose go in the same file
// Wasabi - pep up your finances
const CONFIG_ID = "wasabi_config"
const DEFAULT_SKIN_ID = "1"

// https://www.digitalocean.com/community/tutorials/nodejs-cron-jobs-by-examples
cron.schedule("* * * * *", function () {
    const budgetsOnlyKey = BUDGET_PREFIX
    db.allDocs({
        startkey: budgetsOnlyKey,
        endkey: budgetsOnlyKey + '\uffff',
        include_docs: true
    }).then(function (results) {
        if (results.rows.length > 0) {
            for (const row of results.rows) {
                const bud = new Budget(row.doc)
                AccountsContainer.fetchData(null, db, bud, processSchedule)
            }
        }
    })
    .catch(function (err) {
        console.log(err)
    })
});

const SCHED_RUN_LOG_ID = "schedRunLog"
// TODO: move into its own file
// TODO: dont run more than once when expected - ie need doc list with id and date of run so it doesnt keep running very time cron run
// TODO: handle each diff type of frequency
// TODO: highlight in bold whne added to budget
// TODO: add right click on txn added via sched to move back into sched
// TODO: still runs even when server stopped - is this an issue?
// TODO: will this run when browser shut or tab shut - if not then run when go to site?
// TODO: if laptop closed down or switched off it wont run, so prob need job that runs every 1/2 hour and whne server starts, that
//       checks to see if the schedule has been handled or not
// TODO: do other todos
// TODO: do the budget code
// TODO: if click flag or cleared then do all selected
// TODO: collapse all cats: https://youtu.be/5vOsZH0v1-8?t=316
// TODO: should I expand list of frequencies? https://youtu.be/5vOsZH0v1-8?t=439
// TODO: reports https://youtu.be/5vOsZH0v1-8?t=500
function processSchedule(budget) {
    // https://github.com/pouchdb/upsert
    db.upsert(SCHED_RUN_LOG_ID, function (doc) {
            const now = new Date()
            const time = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds()
            doc.date = getDateIso(now)
            doc.time = time
        return doc;
    }).then(function (res) {
                // TODO: get last date run and then run each date up to and including today
        // TODO: has run log id: schedRun:schedid:isodate run
        const date = new Date()
        for (const acc of budget.accounts) {
            for (let sched of acc.txnScheds) {
                let run = false
                switch(sched.freq)
                {
                    case ONCE_FREQ:
                        // if sched.id is not in the sched run doc list for today then run = true
                        break
                    case DAILY_FREQ:
                        // if no entry exists for the sched.id in the sched run doc list for today then run = true
                        executeSchedAction(budget, acc, sched, date, actionScheduleEvent, false)
                        break
                    case WEEKLY_FREQ:
                        // if today - sched.date / 7 is 0 and an entry for todays date is not in run doc list for today then run = true
                        break
                    case BI_WEEKLY_FREQ:
                        // if today - sched.date / 14 is 0 and an entry for todays date is not in run doc list for today then run = true
                        break
                    case MONTHLY_FREQ:
                        // if sched.date with month and year set to current month and year is equal to today and an entry for todays date is not in run doc list for today then run = true
                        break
                    case YEARLY_FREQ:
                        // if sched.date with year set to current year is equal to today and an entry for todays date is not in run doc list for today then run = true
                        break
                }
                // TODO: log fact sched has run - should only ever be one doc

            }
        }

    }).catch(function (err) {
        console.log(err)
    });
}

function actionScheduleEvent(budget, acc, sched, date)
{
    budget.addSchedToBudget(db, sched, acc, postProcessSchedule)
}

// TODO: delete acc needs to delete txnSCheds
// TODO: export/import budget needs to export/import txnSCheds
function postProcessSchedule(err, sched)
{
    if (typeof err === "undefined" || err === null)
        logSchedExecuted(sched)
}

function getSchedExecuteId(sched, date)
{
    return SCHED_EXECUTED_PREFIX + sched.id + KEY_DIVIDER + getDateIso(date)
}

function executeSchedAction(budget, acc, sched, date, postfetchFn, runOnFound)
{
    const logId = getSchedExecuteId(sched, date)
    db.get(logId).then(function(res){
        if (runOnFound)
            postfetchFn(budget, acc, sched, date)
    })
        .catch(function(err){
            console.log(err)
        if (!runOnFound)
            postfetchFn(budget, acc, sched, date)
        })
}

function logSchedExecuted(sched)
{
    const logId = getSchedExecuteId(sched, new Date())
    db.put(
        {
            _id: logId
        }
    )
        .catch(function(err){console.log('logSchedActioned failed: ' + err)})
}

class App extends Component {

    state = {budget: null, showAccList: true, loading: true, budgets: [],
             dbState: null, dir: null, skinId: null, txnCreatedBySched: false}

    componentDidMount() {
        // https://pouchdb.com/api.html#replication
        const self = this
        let direction = null
        db.sync(BUD_COUCH_URL, {
            live: true,
            retry: true
        }).on('change', function (info) {
            //  This event fires when the replication has written a new document. info will contain details about the
            //  change. info.docs will contain the docs involved in that change.
            const firstDoc = info.change.docs[0]
            const txnCreatedBySched = (direction === DB_PUSH && firstDoc.type === TXN_DOC_TYPE && firstDoc.createdBySched)
            direction = info.direction
            self.setState({dbState: DB_CHANGE, dir: direction, txnCreatedBySched: txnCreatedBySched}, function(){
                // if remote db updated then refresh
                if (direction === DB_PULL || txnCreatedBySched)
                    self.setupApp()
            })
        }).on('paused', function (err) {
            // This event fires when the replication is paused, either because a live replication is waiting for
            // changes, or replication has temporarily failed, with err, and is attempting to resume.
            if (self.state.dbState === null || self.state.dbState === DB_ACTIVE)
                self.setupApp()
            self.setState({dbState: DB_PAUSED})
        }).on('active', function () {
            // This event fires when the replication starts actively processing changes; e.g. when it recovers
            // from an error or new changes are available.
            self.setState({dbState: DB_ACTIVE})
        }).on('denied', function (err) {
            // This event fires if a document failed to replicate due to validation or authorization errors
            self.setState({dbState: DB_DENIED}, function(){
                handle_db_error(null, "A document failed to replicate due to validation or authorization errors.")
            })
        }).on('complete', function (info) {
            // This event fires when replication is completed or cancelled. In a live replication, only cancelling the
            // replication should trigger this event. info will contain details about the replication.
            // handle complete
            self.setState({dbState: DB_COMPLETE})
        }).on('error', function (err) {
            // This event is fired when the replication is stopped due to an unrecoverable failure.
            self.setState({dbState: DB_ERROR}, function(){
                handle_db_error(null, "Replication has stopped due to an unrecoverable failure.")
            })
        });
    }

    gotoAllBudgets = () => {
        this.updateActiveBudget(null)
    }

    budgetSelected = (id) => {
        this.updateActiveBudget(id)
    }

    updateActiveBudget = (id) => {
        const self = this
        db.get(CONFIG_ID).then(function (configDoc) {
            configDoc.activeBudget = id
            return db.put(configDoc)
        }).then(function(){
            const showAccList = id === null
            let state = {showAccList: showAccList}
            if (id === null)
                state['budget'] = null
            self.setState(state, function(){
                if (id === null)
                    self.loadBudgets()
                else
                    self.loadBudgetData(id)
            })
        })
            .catch(function (err) {
            self.setState({loading: false})
            handle_db_error(err, 'Failed to update config.', true)
        });
    }

    setupApp() {
        const self = this
        // get config doc or create it if it doesn't exist
        db.get(CONFIG_ID).then(function (doc) {
            const showAccList = doc.activeBudget === null
            self.setState({showAccList: showAccList, skinId: doc.skinId}, function () {
                self.handleConfigPostGet(showAccList, doc)
            })
        })
            .catch(function (err) {
                if (err.name === "not_found") {
                    // config not found so we need to create one
                    const config = {_id: CONFIG_ID, activeBudget: null, type: "config", skinId: DEFAULT_SKIN_ID}
                    db.put(config).then(function () {
                        self.handleConfigPostGet(true, null)
                    })
                        .catch(function (err) {
                            self.setState({loading: false})
                            handle_db_error(err, 'Failed to put the configuration.', true)
                        })
                } else {
                    self.setState({loading: false})
                    handle_db_error(err, 'Failed to load the configuration.', true)
                }
            });
    }

    handleConfigPostGet(showAccList, doc) {
        if (showAccList)
            this.loadBudgets()
        else
            this.loadBudgetData(doc.activeBudget)
    }

    loadBudgets() {
        const self = this
        const budgetsOnlyKey = BUDGET_PREFIX
        db.allDocs({
            startkey: budgetsOnlyKey,
            endkey: budgetsOnlyKey + '\uffff',
            include_docs: true
        }).then(function (results) {
            if (results.rows.length > 0) {
                let budgets = []
                for (const row of results.rows) {
                    const bud = new Budget(row.doc)
                    budgets.push(bud)
                }
                budgets = budgets.sort((a, b) => (a.lastOpened < b.lastOpened) ? 1 : -1)
                self.setState({loading: false, budgets: budgets})
            }
            else
                self.setState({loading: false})
        })
            .catch(function (err) {
                self.setState({loading: false})
                handle_db_error(err, 'Failed to check for budgets.', true)
            });
    }

    loadBudgetData(id) {
        const self = this
        db.get(id, {
            include_docs: true
        }).then(function (bud) {
            bud.lastOpened = new Date()
            const budget = new Budget(bud)
            self.setState({budget: budget}, function(){
                self.refreshBudgetItem(budget)
                db.put(bud)
            })
        })
            .catch(function (err) {
                self.setState({loading: false})
                handle_db_error(err, 'Failed to load the budget.', true)
            })
    }

    skinChanged = (event) => {
        const skinId = event.target.value
        const self = this
         db.get(CONFIG_ID).then(function (doc) {
             doc.skinId = skinId
             db.put(doc).then(function(){
                self.setState({skinId: skinId})
             })
         })
            .catch(function (err) {
                handle_db_error(err, 'Failed to save the skin change', true)
            })
    }

    configIsLoaded = () => {
        return this.state.skinId !== null
    }

    deleteBudget = (budget) => {
        const self = this
        this.setState({loading: true}, function(){
            db.get(budget.id).then(function(doc){
                return db.remove(doc);
            })
                .then(function(){
                    // delete acccs, txns, cats, catitems & monthCatItem
                    const key = SHORT_BUDGET_PREFIX + budget.shortId
                    db.allDocs({startkey: key, endkey: key + '\uffff', include_docs: true})
                        .then(function (results) {
                            for (const row of results.rows)
                            {
                                const item = row.doc
                                db.get(item._id).then(function(doc){
                                    return db.remove(doc)
                                }).catch(function (err) {
                                    // do nothing
                                })
                            }
                            // update state
                            const buds = self.state.budgets.filter((bud, i) => {return budget.id !== bud.id})
                            self.setState({budgets: buds, loading: false})
                        })
            })
            .catch(function (err) {
                self.setState({loading: false})
            })
        })
    }

    refreshBudgetItem = (targetBud) => {
        let newList = []
        let found = false
        for (let bud of this.state.budgets)
        {
            if (bud.id === targetBud.id)
            {
                newList.push(targetBud)
                found = true
            }
            else
                newList.push(bud)
        }
        if (!found)
            newList.push(targetBud)
        this.setState({budgets: newList})
    }

    // load up backup (changing all ids to new ones)
    applyBudget = (budgetJson) => {
        const self = this
        const bud = Budget.getBudgetFromJson(budgetJson)
        const jsonStr = bud.generateJson()
        const jsonObjs = JSON.parse(jsonStr)
        db.bulkDocs(jsonObjs)
            .then(function(){
                self.loadBudgets()
            })
            .catch(function (err) {
                    handle_db_error(err, 'Failed restore the budget.', true)
                })
    }

    render() {
        return (
            <div>
                {this.configIsLoaded() &&
                    <link rel="stylesheet" type="text/css" href={ process.env.PUBLIC_URL + '/theme' + this.state.skinId + '.css'} />}
                {/*show all budgets*/}
                {
                    this.configIsLoaded() && this.state.showAccList &&
                    <BudgetList db={db}
                                budgets={this.state.budgets}
                                refreshListItem={this.refreshBudgetItem}
                                skinChanged={this.skinChanged}
                                skinId={this.state.skinId}
                                applyBudget={this.applyBudget}
                                onClick={this.budgetSelected}
                                deleteBudget={this.deleteBudget}
                                dbState={this.state.dbState}/>
                }
                {/*show accounts & transactions etc*/}
                {
                    this.configIsLoaded() && this.state.budget && !this.state.showAccList &&
                    <AccountsContainer
                        db={db}
                        gotoAllBudgets={this.gotoAllBudgets}
                        budget={this.state.budget}
                        dbState={this.state.dbState}
                        dir={this.state.dir}
                        txnCreatedBySched={this.state.txnCreatedBySched}
                    />
                }
                {/*show loading symbol*/}
                {
                    !this.state.budget &&
                    <Loading loading={this.state.loading}/>
                }
            </div>
        )
    }
}

export default App