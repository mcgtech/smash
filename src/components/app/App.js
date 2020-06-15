import React, {Component} from 'react'
import AccountsContainer, {Budget, BudgetList} from '../account/budget'
// https://www.manifold.co/blog/building-an-offline-first-app-with-react-and-couchdb
// https://github.com/manifoldco/definitely-not-a-todo-list
import PouchDB from 'pouchdb-browser'
import {BUD_COUCH_URL, BUD_DB} from "../../constants";
import {CCYDropDown} from "../../utils/ccy";
import {Loading} from "../../utils/db";
import {BUDGET_PREFIX} from "../account/keys";
import {handle_db_error} from "../../utils/db";

const db = new PouchDB(BUD_DB); // creates a database or opens an existing one

// Note: if not syncing then ensure cors is enabled in fauxton: http://127.0.0.1:5984/_utils/#_config/nonode@nohost/cors

// TODO: make this production proof
db.sync(BUD_COUCH_URL, {
    live: true,
    retry: true
}).on('change', function (info) {
    console.log('change')
}).on('paused', function (err) {
    // replication paused (e.g. replication up to date, user went offline)
    console.log('paused')
}).on('active', function () {
    // replicate resumed (e.g. new changes replicating, user went back online)
    console.log('active')
}).on('denied', function (err) {
    // a document failed to replicate (e.g. due to permissions)
    console.log('denied')
}).on('complete', function (info) {
    // handle complete
    console.log('complete')
}).on('error', function (err) {
    // handle error
    console.log('error')
    console.log(err)
});
// const db = new PouchDB('smash');
// const remoteDatabase = new PouchDB(`${COUCH_URL}/${BUD_DB}`);
// PouchDB.sync(db, remoteDatabase, {
//     live: true,
//     heartbeat: false,
//     timeout: false,
//     retry: true
// })
//     // TODO: remove?
//                 .on('complete', function (changes) {
//                   // yay, we're in sync!
//                     console.log("sync complete");
//                 }).on('change', function (change) {
//                     // yo, something changed!
//                     console.log("sync change");
//                 }).on('paused', function (info) {
//                   // replication was paused, usually because of a lost connection
//                     console.log("sync pause");
//                     console.log(info);
//                 }).on('active', function (info) {
//                   // replication was resumed
//                     console.log("sync active");
//                 }).on('error', function (err) {
//                   // boo, we hit an error!
//                     console.log("sync error");
//                   alert("data was not replicated to server, error - " + err);
//             });

// TODO: read the react redux tutorial
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
// https://react-select.com/home#getting-started and https://github.com/jedwatson/react-select
// no need to declare state or bind methods in constructor: https://hackernoon.com/the-constructor-is-dead-long-live-the-constructor-c10871bea599
// . you should use functional components if you are writing a presentational component which doesn’t have its own state
// or needs to access a lifecycle hook
// . you generally want to avoid changing the DOM directly when using react
// files: generally, reusable components go into their own files whereas components that are dependent on each other
//        for a specific purpose go in the same file
const CONFIG_ID = "smash_config"

class App extends Component {

    state = {budget: null, showAccList: true, loading: true}

    // TODO: change db name from budget to smash
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


    // TODO: need to store currSel in higher level document?
    // TODO: TODOs in dropdown.js
    componentDidMount() {
        const self = this

                // // const accs = Budget.getStevesAccounts()
                // const accs = []
                // // const payees = Budget.getTestPayees() // TODO: only need if I am generating loads of txns
                // const payees = []
                // Budget.addNewBudget(db, 'Test 6', 'CAD', payees,
                //                              Budget.postTestBudgetCreate, accs)

        // get config doc or create it if it doesnt exist
        db.get(CONFIG_ID).then(function (doc) {
            const showAccList = doc.activeBudget === null
            self.setState({showAccList: showAccList}, function () {
                // TODO: this need finished
                // TODO: need to call same logic after the put below
                if (showAccList)
                    this.loadBudgets()
                else
                    this.loadBudgetData(doc.activeBudget)
            })
        })
            .catch(function (err) {
                if (err.name === "not_found") {
                    const config = {_id: CONFIG_ID, activeBudget: null, type: "config"}
                    db.put(config).then(function () {
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

    // TODO: handle no budgets
    // TODO: add last opened to budget
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
                    console.log(budgets)
                budgets = budgets.sort((a, b) => (a.lastOpened < b.lastOpened) ? 1 : -1)
                self.setState({loading: false, budgets: budgets})
            } else
                alert('No budgets yet')
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
            self.setState({budget: new Budget(bud)}, function(){
                db.put(bud)
            })
        })
            .catch(function (err) {
                self.setState({loading: false})
                handle_db_error(err, 'Failed to load the budget.', true)
            });
    }

// TODO: only for testing
    ccyOnChange = () => {
        this.setState({showAccList: false})
    }

    render() {
        return (
            <div>
                {
                    this.state.budget && !this.state.showAccList &&
                    <AccountsContainer db={db} gotoAllBudgets={this.gotoAllBudgets} budget={this.state.budget}/>
                }
                {
                    !this.state.budget &&
                    <Loading loading={this.state.loading}/>
                }
                {
                    this.state.showAccList &&
                    // <CCYDropDown onChange={this.ccyOnChange}/>
                    <BudgetList db={db} budgets={this.state.budgets} onClick={this.budgetSelected}/>
                }
            </div>
        )
    }
}


export default App