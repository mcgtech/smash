import React, {Component} from 'react'
import AccountsContainer, {Budget, BudgetList} from '../account/budget'
// https://www.manifold.co/blog/building-an-offline-first-app-with-react-and-couchdb
// https://github.com/manifoldco/definitely-not-a-todo-list
import PouchDB from 'pouchdb-browser'
import {BUD_COUCH_URL, BUD_DB} from "../../constants";
import {Loading} from "../../utils/db";
import {BUDGET_PREFIX, SHORT_BUDGET_PREFIX} from "../account/keys";
import {handle_db_error} from "../../utils/db";

const db = new PouchDB(BUD_DB); // creates a database or opens an existing one
// https://github.com/pouchdb/upsert
PouchDB.plugin(require('pouchdb-upsert'))
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
// Wasabi - pep up your finances
const CONFIG_ID = "wasabi_config"

class App extends Component {

    state = {budget: null, showAccList: true, loading: true, budgets: []}

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


    componentDidMount() {

            // // const accs = Budget.getStevesAccounts()
                // const accs = []
                // // const payees = Budget.getTestPayees() // TODO: only need if I am generating loads of txns
                // const payees = []
                // Budget.addNewBudget(db, 'Test 6', 'CAD', payees,
                //                              Budget.postTestBudgetCreate, accs)


        const self = this
        // get config doc or create it if it doesnt exist
        db.get(CONFIG_ID).then(function (doc) {
            const showAccList = doc.activeBudget === null
            self.setState({showAccList: showAccList}, function () {
                self.handleConfigPostGet(showAccList, doc)
            })
        })
            .catch(function (err) {
                if (err.name === "not_found") {
                    // config not found so we need to create one
                    const config = {_id: CONFIG_ID, activeBudget: null, type: "config"}
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
            self.setState({budget: new Budget(bud)}, function(){
                db.put(bud)
            })
        })
            .catch(function (err) {
                self.setState({loading: false})
                handle_db_error(err, 'Failed to load the budget.', true)
            })
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

    render() {
        return (
            <div>
                {/*show accounts & transactions etc*/}
                {
                    this.state.budget && !this.state.showAccList &&
                    <AccountsContainer db={db} gotoAllBudgets={this.gotoAllBudgets} budget={this.state.budget}/>
                }
                {/*show loading symbol*/}
                {
                    !this.state.budget &&
                    <Loading loading={this.state.loading}/>
                }
                {/*show all budgets*/}
                {
                    this.state.showAccList &&
                    <BudgetList db={db}
                                budgets={this.state.budgets}
                                refreshListItem={this.refreshBudgetItem}
                                onClick={this.budgetSelected}
                                deleteBudget={this.deleteBudget}/>
                }
            </div>
        )
    }
}

export default App