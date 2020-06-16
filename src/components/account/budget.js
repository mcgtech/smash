import React, {Component} from 'react'
import Account from "./account";
import AccDash, {AccountListTypes} from "./dash";
import {INIT_BAL_PAYEE} from './budget_const'
import AccDetails from "./details";
import ScheduleContainer from "./schedule";
import BudgetContainer from "./bud";
import RepContainer from "./rep";
import './budget.css'
import './budget_dash.css'
import './acc_details.css'
import SplitPane from 'react-split-pane';
import '../../utils/split_pane.css'
import {DESC} from './sort'
import {KEY_DIVIDER, BUDGET_PREFIX, ACC_PREFIX, SHORT_BUDGET_PREFIX, BUDGET_KEY} from './keys'
import {DATE_ROW} from "./rows";
import {getDateIso, timeSince} from "../../utils/date";
import Trans from "./trans";
import CatGroup, {CatItem, MonthCatItem} from "./cat";
import {handle_db_error, Loading} from "../../utils/db";
import {v4 as uuidv4} from "uuid";
import MetaTags from 'react-meta-tags';
import {faPlus} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import BudgetForm from './budget_form'
import AccForm from "./acc_form";

// PouchDB.debug.enable( "pouchdb:find" );

// TODO: load and save etc from couchdb
// TODO: delete broweser db and ensure all works as expected
// TODO: shutdown remote db and ensure all ok
// TODO: update remote db directly and ensure changes appear
export class Budget {
    constructor(budDoc) {
        this.bid = budDoc._id
        const lastDividerPosn = budDoc._id.lastIndexOf(KEY_DIVIDER)
        this.ashortId = budDoc._id.substring(lastDividerPosn + 1)
        this.brev = budDoc._rev
        this.bcreated = new Date(budDoc.created)
        this.blastOpened = new Date(budDoc.lastOpened)
        this.bname = budDoc.name
        this.baccounts = []
        this.bcats = null
        this.bpayees = budDoc.payees.sort(this.comparePayees)
        // calced in mem and not stored in db
        this.atotal = 0
        this.bccy = budDoc.ccy
        this.bcurrSel = budDoc.currSel
    }

    get shortId() {
        return this.ashortId;
    }

    static isBudgetId(id) {
        if (id === null)
            return false
        else {
            const items = id.split(KEY_DIVIDER)
            return items[0] === BUDGET_KEY
        }
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

    sortAccounts() {
        let {on, off, closed} = this.getAccsByGroup()
        on = Account.sortAccs(on)
        off = Account.sortAccs(off)
        closed = Account.sortAccs(closed)
        this.accounts = on.concat(off).concat(closed)
    }

    get id() {
        return this.bid
    }

    get rev() {
        return this.brev
    }

    get currSel() {
        return this.bcurrSel
    }

    set currSel(currSel) {
        this.bcurrSel = currSel
    }

    get ccy() {
        return this.bccy
    }

    set ccy(ccy) {
        this.bccy = ccy
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

    get lastOpened() {
        return this.blastOpened;
    }

    set lastOpened(lastOpened) {
        this.blastOpened = lastOpened;
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

    getAccount(id) {
        let item = null
        id = id + ''
        for (const acc of this.accounts) {
            if (acc.id === id) {
                item = acc
                break
            }
        }
        return item;
    }

    getAccsByGroup(accExcludeId) {
        let on = []
        let off = []
        let closed = []
        for (const acc of this.accounts) {
            if (accExcludeId === null || acc.id !== accExcludeId) {
                if (!acc.open)
                    closed.push(acc)
                else if (acc.onBudget)
                    on.push(acc)
                else
                    off.push(acc)
            }
        }
        return {on, off, closed};
    }

    getTransferAccounts(exclude_id) {
        let {on, off} = this.getAccsByGroup(exclude_id) // I use this so accs match lhs order
        const accs = on.concat(off)
        return accs.filter(function (acc) {
            return exclude_id === null || acc.id !== exclude_id;
            // eslint-disable-next-line
        }).map(function (acc) {
            if (acc.open)
                return {
                    id: acc.id,
                    name: acc.name,
                }
        });
    }

    getPayee(id, payees) {
        let item = null
        id = id + ''
        payees = typeof payees === "undefined" ? this.getPayeesFullList(false) : payees
        for (const payee of payees) {
            if (payee.id === id) {
                item = payee
                break
            }
        }
        return item;
    }

    getCatItem(id, cats) {
        let item = null
        cats = typeof cats === "undefined" ? this.getCatsFullList() : cats
        id = id + ''
        for (const cat of cats) {
            for (const catItem of cat.items) {
                if (catItem.id === id) {
                    item = catItem
                    break
                }
            }
            if (item != null)
                break
        }
        return item;
    }

    addPayee(db, txn, accDetailsCont, addAnother) {
        let budget = this
        let maxId = 0
        let newItem = {name: txn.payeeName, catSuggest: null}
        for (const payee of this.payees) {
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
        this.updateBudgetWithNewTxnPayee(db, txn, accDetailsCont, addAnother)
    }

    getTxn(id) {
        let theTxn = null
        let theAcc = null
        for (const acc of this.accounts) {
            const txn = acc.getTxn(id)
            if (txn !== null) {
                theTxn = txn
                theAcc = acc
                break
            }

        }
        return [theTxn, theAcc]
    }

    getTxns() {
        let txns = []
        for (const acc of this.accounts) {
            txns = txns.concat(acc.txns)

        }
        return txns
    }

    get clearedBalance() {
        let tot = 0
        for (const acc of this.accounts) {
            tot += acc.clearedBalance
        }
        return tot
    }

    get unclearedBalance() {
        let tot = 0
        for (const acc of this.accounts) {
            tot += acc.unclearedBalance
        }
        return tot
    }

    // TODO: round to two dec places
    // TODO: get rid of bal in Account class as we calc it?
    // TODO: rhs will result in clearedBalance and unclearedBalance being called twice - fix it
    // TODO: rhs title does not wok great when screen resized
    get workingBalance() {
        return this.clearedBalance + this.unclearedBalance
    }

    // TODO: merge these two
    save(db, postSaveFn) {
        const self = this
        const json = self.asJson()
        db.get(self.id).then(function (doc) {
            json._rev = doc._rev // in case it has been updated elsewhere
            return db.put(json)
        }).then(function () {
            if (typeof postSaveFn !== "undefined")
                postSaveFn()
        }).catch(function (err) {
            handle_db_error(err, 'Failed to update the budget.', true);
        });
    }

    getPayeesFullList(addInitBal) {
        let payees = [...this.payees]
        if (addInitBal)
            payees.unshift({"id": INIT_BAL_PAYEE, "name": "Initial balance", "catSuggest": null})
        return this.getTransferAccounts().concat(payees)
    }

    getCatsFullList() {
        return [Trans.getIncomeCat()].concat(this.cats)
    }

    asJson() {
        return {
            "_id": this.id,
            "_rev": this.rev,
            "type": "bud",
            "name": this.name,
            "bccy": this.ccy,
            "currSel": this.currSel,
            "created": this.created,
            "lastOpened": this.lastOpened,
            "payees": this.payees
        }
    }

    // save new payee to db and then save the txn which calls txn.txnPostSave which updates totals etc in UI
    // if the payee update fails then the txn is not saved
    updateBudgetWithNewTxnPayee(db, txn, accDetailsCont, addAnother) {
        const self = this
        const json = self.asJson()
        db.get(self.id).then(function (doc) {
            json._rev = doc._rev // in case it has been updated elsewhere
            db.put(json).then(function (result) {
                txn.save(db, accDetailsCont, addAnother)
            })
        }).catch(function (err) {
            handle_db_error(err, 'Failed to update the payee list in the budget. The transaction changes have not been saved.', true);
        });
    }

    // https://github.com/uuidjs/uuid
    static getNewId() {
        const uuid = uuidv4()
        return [uuid, BUDGET_PREFIX + uuid]
    }

    get total() {
        return this.btotal;
    }

    set total(total) {
        this.btotal = total;
    }

    // update account totals and budget total
    updateTotal = () => {
        let budTot = 0
        for (let acc of this.accounts) {
            acc.updateAccountTotal()
            budTot += acc.total
        }
        this.total = budTot
    }

    // postFn & accs are optional
    static addNewBudget(db, name, ccy, payees, postFn, accs) {
        const budIds = Budget.getNewId()
        const budId = budIds[1]
        const now = new Date().toISOString()

        // json
        const budJson = {
            "_id": budId,
            "type": "bud",
            "name": name,
            "currency": ccy,
            "currSel": BUD_SEL,
            "created": now,
            "lastOpened": now,
            "payees": payees
        }
        db.allDocs({include_docs: true}).then(allDocs => {
            return allDocs.rows.map(row => {
                return {_id: row.id, _rev: row.doc._rev, _deleted: true};
            });
        }).then(function () {
            db.put(budJson)
        }).then(function () {
            if (typeof postFn !== "undefined")
                postFn(db, budIds, accs)
        })
            .catch(function (err) {
                console.log(err);
            })
    }

    static createTestBudget(db, name, ccy) {
        // TODO: run code to delete all rows first - see below
        const accs = Budget.getStevesAccounts()
        const payees = Budget.getTestPayees() // TODO: only need if I am generating loads of txns
        Budget.addNewBudget(db, name, ccy, payees,
            Budget.postTestBudgetCreate, accs)
    }

    static postTestBudgetCreate(db, budIds, accs) {
        if (typeof budIds !== "undefined" && typeof accs !== "undefined") {
            let bulkAccJson = []
            let bulkTxnJson = []
            const shortBudId = budIds[0]

            // generate json for cats
            const cats = Budget.getDefaultCats(shortBudId)
            // const cats = Budget.getSteveCats(shortBudId)
            const catJson = cats[0]
            const catItemIds = cats[1]

            // generate json for accs & txns
            let weight = 0
            for (const acc of accs) {
                const accIdsBud = Account.getNewId(shortBudId)
                const shortAccId = accIdsBud[0]
                const longAccId = accIdsBud[1]
                bulkAccJson.push({
                    "_id": longAccId,
                    "type": "acc",
                    "bud": shortBudId,
                    "name": acc.name,
                    "open": true,
                    "onBudget": acc.on,
                    "notes": acc.notes,
                    "weight": weight,
                    "active": acc.active
                })
                // generate json for txn
                if (acc.bal > 0) {
                    const catKeyData = Trans.getIncomeKeyData(new Date())
                    bulkTxnJson.push(AccountsContainer.getDummyTxn(acc.on, shortBudId, shortAccId, new Date(), '',
                        0, acc.bal, false, INIT_BAL_PAYEE,
                        catKeyData[0], catItemIds))
                }
                weight += 1
            }
            // create single json list
            const json = bulkAccJson.concat(catJson).concat(bulkTxnJson)

            db.bulkDocs(json).catch(function (err) {
                console.log(err);
            })
        }
    }

    static getDefaultCats(shortBudId) {
        const groups = [{
            name: "Monthly Bills",
            items: ["Rent/Mortgage", "Phone", "Internet", "Cable TV", "Electricity", "Water"]
        },
            {
                name: "Everyday Expenses",
                items: ["Spending Money", "Groceries", "Fuel", "Restaurants", "Medical/Dental", "Clothing", "Household Goods"]
            },
            {
                name: "Rainy Day Funds",
                items: ["Emergency Fund", "Car Maintenance", "Car Insurance", "Birthdays", "Christmas", "Renters Insurance", "Retirement"]
            },
            {name: "Savings Goals", items: ["Car Replacement", "Vacation"]},
            {name: "Debt", items: ["Car Payment", "Student Loan"]},
            {name: "Giving", items: ["Tithing", "Charitable"]}]

        return Budget.getCats(shortBudId, groups, false)
    }

    static getSteveCats(shortBudId) {
        // TODO: add item notes
        const groups = [{name: "M - Claire Monthly", items: ["Cash Claire £300"]},
            {name: "M - Steve Monthly", items: ["Cash Steve £350"]},
            {
                name: "M - Everyday Expenses", items: ["Groceries (£850)", "General £80", "Claire Clothes £80",
                    "Corsa Claire petrol £210", "Corsa Steve Petrol £80", "Renters Insurance", "jsa"]
            },
            {
                name: "M - Monthly Bills", items: ["NW Reward Acc Fee £2", "TV License £13.50", "EIS £13.23",
                    "CH Ins £23.57", "Scot Widows £300", "Netflix £11.99", "Council Tax - £221",
                    "Cerys Accom £320", "Scottish Power £157", "SafeShield ASU £16.20",
                    "PlusNet BBand/Line £8", "Plusnet Mob Claire £9.50", "Plusnet Mob Chris £9.50",
                    "Spotify £14.99", "Mobile Cerys £10", "Mobile Steve £10", "Prime £7.99"]
            },
            {
                name: "Birthdays etc",
                items: ["Kids £25", "Birthdays James £21.5", "Birthdays McG £15.83", "21st Chris £3.5"]
            },
            {
                name: "Holidays",
                items: ["Summer hols at home £20", "Summer Vacation £250", "Kids summer hol cash £8.33"]
            },
            {
                name: "Predictable Rainy Day", items: ["Home Maintenance £40", "Household appliance £20",
                    "House Insurance £29", "Glasses Claire £1.66",]
            },
            {
                name: "Claire School Events", items: ["Halloween £1.67", "Children in need £0.83",
                    "Nov Night out £5", "Staff gifts £2.08", "Claire Summer End of Term £10"]
            },
            {
                name: "Cars", items: ["Car Repairs £30", "Breakdown £5.80", "Corsa Steve tax £12.50",
                    "i20 Insurance £16.35", "Car Replacement £50", "Corsa Ins £29", "Corsa tax £12.10",
                    "Corsa Steve Svc £12.50"]
            },
            {
                name: "Saving Goals", items: ["Weddings Kids £20", "Kids car help to buy £10",
                    "Suspended Std Life FSAVC £300", "Pension review £12.5",
                    "PlusNet LandLine £16.49"]
            },
            {
                name: "Xmas", items: ["Xmas School Night out £10", "Xmas Lunch School £0.83", "Xmas us £68",
                    "Xmas McG £11.73", "Xmas James £21.50", "Claire Xmas - Staff £2.50", "New Year £17",
                    "Xmas stockings and pjs £7.50", "Claire Hotel £7.50"]
            },
            {
                name: "Saving target reached", items: ["Glasses Cerys £4.20", "Glasses Steve £4.20",
                    "Cerys Compulsory Young Driver Excess", "New mobile phone £10", "Rainy Day"]
            }
        ]
        return Budget.getCats(shortBudId, groups, true)
    }

    static getNewCatGroup(shortBudId, name, weight) {
        return {
            "_id": CatGroup.getNewId(shortBudId),
            "type": "cat",
            "name": name,
            "weight": weight,
            "collapsed": false
        }
    }

    static getNewCatItem(shortBudId, catId, name, weight) {
        return {
            "_id": CatItem.getNewId(shortBudId),
            "type": "catItem",
            "cat": catId,
            "name": name,
            "weight": weight
        }
    }

    static getNewMonthCatItem(shortBudId, catItemId, budget, date) {
        return {
            "_id": MonthCatItem.getNewId(shortBudId, date),
            "type": "monthCatItem",
            "catItem": catItemId,
            "budget": budget,
            "overspending": null,
            "note": null
        }
    }

    // TODO: remove
    static getCats(shortBudId, groups, addRandMonthItems) {
        let catGroups = []
        let catItems = []
        let catMonthItems = []
        let catItemIdList = []
        let groupWeight = 0
        let catItemWeight = 0
        const budgets = [167, 1023, 782, 198, 657, 345, 740, 800, 965, 88]
        for (const group of groups) {
            let groupJson = Budget.getNewCatGroup(shortBudId, group.name, groupWeight)
            catGroups.push(groupJson)
            const items = groupJson._id.split(KEY_DIVIDER)
            const catId = items[3]
            const today = new Date()
            for (const catName of group.items) {
                const catItemJson = Budget.getNewCatItem(shortBudId, catId, catName, catItemWeight)
                const items = catItemJson._id.split(KEY_DIVIDER)
                const catItemId = items[3]
                catItems.push(catItemJson)
                catItemIdList.push(catItemId)
                catItemWeight += 1
                if (addRandMonthItems) {
                    const budget = budgets[Math.floor(Math.random() * budgets.length)]
                    catMonthItems.push(Budget.getNewMonthCatItem(shortBudId, catItemId, budget, today))
                }
            }
            groupWeight += 1
        }
        return [catGroups.concat(catItems).concat(catMonthItems), catItemIdList]
    }

    // TODO: remove this
    static getStevesAccounts() {
        // TODO: include notes
        return [
            {name: 'Natwest Joint Main', on: true, bal: 2146.78, active: true, notes: ''},
            // {name: 'Nationwide Flex Direct', on: true, bal: 3924.36, active: false, notes: ''},
            // {name: 'Halifax YNAB Budget', on: true, bal: 8030.62, active: false, notes: ''},
            // {name: 'PBonds 1 - Steve', on: true, bal: 1150, active: false, notes: ''},
            // {name: 'NS&I Bonds - Shortfall', on: false, bal: 10437.10, active: false, notes: ''},
            // {name: 'PBonds - Claire', on: false, bal: 50000, active: false, notes: ''},
            // {name: 'PBonds 2 - Steve', on: false, bal: 48850, active: false, notes: ''},
            // {name: 'Natwest Rewards', on: false, bal: 100.07, active: false, notes: ''},
            // {name: 'Gold Bars', on: false, bal: 318.45, active: false, notes: ''},
            // {name: 'Silver Coins', on: false, bal: 207.91, active: false, notes: ''},
            // {name: 'Gold Coins', on: false, bal: 1799.84, active: false, notes: ''},
            // {name: 'Steve Tesc Savings', on: false, bal: 5302.42, active: false, notes: ''},
            // {name: 'Cash', on: false, bal: 500, active: false, notes: ''}
        ]
    }

    // TODO: must always have initial balance as a payee even on go live and it musn't be deleted
    static getTestPayees() {
        return [
            {"id": "1", "name": "halfords", "catSuggest": null},
            {"id": "2", "name": "airbnb", "catSuggest": null},
            {"id": "3", "name": "tesco", "catSuggest": null},
            {"id": "4", "name": "amazon", "catSuggest": null},
            {"id": "5", "name": "plusnet", "catSuggest": null},
            {"id": "6", "name": "directline", "catSuggest": null},
            {"id": "7", "name": "EIS", "catSuggest": null},
            {"id": "8", "name": "vodaphone", "catSuggest": null},
            {"id": "9", "name": "apple", "catSuggest": null}]
    }

}

var MOUSE_DOWN = 'down'
var MOUSE_UP = 'up'
var MOUSE_LAST_Y = 0
var MOUSE_DIR = MOUSE_DOWN

// used to determine what is currently selected in lhs
export const BUD_SEL = 0
export const REP_SEL = 1
export const ALL_ACC_SEL = 2
export const IND_ACC_SEL = 3

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

const APP_NAME = 'Smash';

export default class AccountsContainer extends Component {
    constructor(props) {
        super(props);
        this.canceler = null;
        this.db = null
    }

    state = {
        loading: true,
        budget: this.props.budget,
        activeAccount: null,
        currSel: IND_ACC_SEL
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
    // TODO: move inside budget class?
    static fetchData(self, db, budget) {
        // TODO: tidy up

        const accsTxnsKey = SHORT_BUDGET_PREFIX + budget.shortId
        // load up acccs, txns, cats, catitems & monthCatItem
        db.allDocs({startkey: accsTxnsKey, endkey: accsTxnsKey + '\uffff', include_docs: true})
            .then(function (results) {
                if (results.rows.length > 0) {
                    var accs = []
                    var txns = {}
                    var catGroups = []
                    var catItems = []
                    var monthCatItems = []
                    let activeAccount = null

                    // extract budget and account data - assuming no order, eg txns could come before accs
                    for (const row of results.rows) {
                        const doc = row.doc
                        switch (doc.type) {
                            case 'acc':
                                let acc = new Account(doc)
                                accs.push(acc)
                                if (acc.active)
                                    activeAccount = acc
                                break
                            case 'txn':
                                let txn = new Trans(doc)
                                let accKey = SHORT_BUDGET_PREFIX + budget.shortId + KEY_DIVIDER + ACC_PREFIX + txn.acc
                                if (typeof txns[accKey] === "undefined")
                                    txns[accKey] = []
                                txns[accKey].push(txn)
                                break
                            case 'cat':
                                catGroups.push(new CatGroup(doc))
                                break
                            case 'catItem':
                                catItems.push(new CatItem(doc))
                                break
                            case 'monthCatItem':
                                // I need all loaded so I can calc balances
                                monthCatItems.push(new MonthCatItem(doc))
                                break
                            default:
                                break
                        }
                    }
                    if (accs.length > 0) {
                        // ensure we have an active account
                        activeAccount = activeAccount === null ? accs[0] : activeAccount

                        // sort the accounts by weight
                        budget.accounts = accs
                        budget.sortAccounts()
                    }

                    // now join the pieces together

                    // cats & catItems
                    catGroups.sort(function (a, b) {
                        return a.weight - b.weight;
                    })
                    for (const catGroup of catGroups) {
                        for (const catItem of catItems) {
                            // add cat item into correct group
                            if (catItem.cat === catGroup.shortId)
                                catGroup.items.push(catItem)
                        }
                        catGroup.items.sort(function (a, b) {
                            return a.weight - b.weight;
                        })
                    }
                    // monthCatItems
                    for (const monthCatItem of monthCatItems) {
                        const key = getDateIso(monthCatItem.date)
                        for (const catItem of catItems) {
                            if (catItem.shortId === monthCatItem.catItem)
                                catItem.monthItems.push({date: key, monthCatItem})
                        }
                    }
                    budget.cats = catGroups

                    // txns
                    for (let acc of accs) {
                        let txnsForAcc = txns[acc.id]
                        if (typeof txnsForAcc !== "undefined") {

                            // set default order
                            txnsForAcc = txnsForAcc.sort(Account.compareTxnsForSort(DATE_ROW, DESC));
                            AccountsContainer.enhanceTxns(txnsForAcc, budget, acc);
                            acc.txns = txnsForAcc
                        }
                    }
                    budget.updateTotal()

                    const state = {
                        budget: budget,
                        activeAccount: activeAccount,
                        loading: false,
                        currSel: budget.currSel
                    }
                    // show budget and accounts
                    self.setState(state)
                } else
                    self.setState({loading: false})
            })
            .catch(function (err) {
                self.setState({loading: false})
                handle_db_error(err, 'Failed to load the budget.', true)
            });
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
        var self = this
        const db = this.props.db
        AccountsContainer.fetchData(self, db, this.props.budget)
        // Budget.createTestBudget(db, 'House', 'GBP')

        // this.createDummyBudget(db); // TODO: when finished testing remove this
        // AccountsContainer.addNewBudget(db, 'Test 3', 'GBP')

        // TODO: enable
        // this.canceler = db.changes({
        //     since: 'now',
        //     live: true,
        //     include_docs: true,
        // }).on('change', () => {
        //     this.fetchData();
        // });

    }

    // TODO: remove?
    static generateDummyTrans(totalTxns, shortBudId, shortAccId) {
        let dt = new Date();
        const largeNoTxns = Array(totalTxns).fill().map((val, idx) => {
            const amt = (idx + 1) * 100
            let outAmt = 0
            let inAmt = 0
            // const cleared = Math.random() < 0.8
            const cleared = idx > 5
            if (Math.random() < 0.2)
                outAmt = amt
            else
                inAmt = amt

            dt.setDate(dt.getDate() - 1)
            return AccountsContainer.getDummyTxn(shortBudId, shortAccId, dt, idx + "", outAmt, inAmt, cleared)
        })
        return largeNoTxns;
    }

    static getDummyTxn(onBudget, shortBudId, shortAccId, dt, memo, outAmt, inAmt, cleared, payeeId, catItemId, catItemIds) {
        const payees = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
        const payee = payeeId === null ? payees[Math.floor(Math.random() * payees.length)] : payeeId
        if (onBudget)
            catItemId = catItemId === null ? catItemIds[Math.floor(Math.random() * catItemIds.length)] : catItemId
        else
            catItemId = ""
        return {
            "_id": Trans.getNewId(shortBudId),
            "type": "txn",
            "acc": shortAccId,
            "flagged": false,
            "date": getDateIso(dt),
            "payee": payee,
            "catItem": catItemId,
            "memo": memo,
            "out": outAmt,
            "in": inAmt,
            "cleared": cleared,
            "transfer": null
        }
    }

    createDummyBudget(db) {
        const self = this
        // budget ids
        // one
        const bud1Ids = Budget.getNewId()
        const bud1Uuid = bud1Ids[0]
        const bud1Id = bud1Ids[1]
        // two
        const bud2Ids = Budget.getNewId()
        const bud2Uuid = bud2Ids[0]
        const bud2Id = bud2Ids[1]

        // account ids
        // acc one - budget one
        const acc1IdsBud1 = Account.getNewId(bud1Id)
        const shortAccId1Bud1 = acc1IdsBud1[0]
        const acc1IdBud1 = acc1IdsBud1[1]

        // acc two - budget one
        const acc2IdsBud1 = Account.getNewId(bud1Id)
        const shortAccId2Bud1 = acc2IdsBud1[0]
        const acc2IdBud1 = acc2IdsBud1[1]

        // acc two - budget two
        const acc1IdsBud2 = Account.getNewId(bud2Id)
        const shortAccId1Bud2 = acc1IdsBud2[0]
        const acc1IdBud2 = acc1IdsBud2[1]

        // json
        const bud1Json = {
            "_id": bud1Id,
            "type": "bud",
            "name": "Test 1",
            "currency": "GBP",
            "created": new Date().toISOString(),
            "cats": [
                {
                    "id": "1",
                    "type": "cat",
                    "name": "M - Claire Monthly",
                    "weight": 0,
                    "items": [
                        {
                            "id": "1",
                            "type": "catitem",
                            "cat": "1",
                            "name": "Cash Claire £300",
                            "weight": 0,
                            "budgeted": 300,
                            "startdate": "2020-04-01",
                            "notes": ""
                        }
                    ]
                },
                {
                    "id": "2",
                    "type": "cat",
                    "name": "M - Steve Monthly",
                    "weight": 1,
                    "items": [
                        {
                            "id": "2",
                            "type": "catitem",
                            "catItem": "2",
                            "name": "Cash Steve £350",
                            "weight": 0,
                            "budgeted": 350,
                            "startdate": "2020-04-01",
                            "notes": ""
                        }
                    ]
                },
                {
                    "id": "3",
                    "type": "cat",
                    "name": "M - Everyday Expenses",
                    "weight": 2,
                    "items": [
                        {
                            "id": "3",
                            "name": "Groceries (£850)",
                            "weight": 0,
                            "budgeted": 850,
                            "startdate": "2020-04-01",
                            "notes": "blah, blah, blah"
                        },
                        {
                            "id": "4",
                            "name": "General £80",
                            "weight": 1,
                            "budgeted": 80,
                            "startdate": "2020-04-01",
                            "notes": "blah2, blah2, blah2"
                        },
                        {
                            "id": "5",
                            "name": "Claire Clothes £80",
                            "weight": 2,
                            "budgeted": 80,
                            "startdate": "2020-04-01",
                            "notes": "blah3, blah3, blah3"
                        },
                        {
                            "id": "6",
                            "name": "Corsa Claire petrol £210",
                            "weight": 3,
                            "budgeted": 210,
                            "startdate": "2020-04-01",
                            "notes": "blah4, blah4, blah4"
                        },
                        {
                            "id": "7",
                            "name": "Corsa Steve Petrol £80",
                            "weight": 4,
                            "budgeted": 80,
                            "startdate": "2020-04-01",
                            "notes": "blah5, blah5, blah5"
                        }
                    ]
                }
            ],
            "payees": [{"id": "1", "name": "airbnb", "catSuggest": null},
                {"id": "2", "name": "tesco", "catSuggest": null},
                {"id": "3", "name": "amazon", "catSuggest": null},
                {"id": "4", "name": "plusnet", "catSuggest": null},
                {"id": "5", "name": "directline", "catSuggest": null},
                {"id": "6", "name": "EIS", "catSuggest": null},
                {"id": "7", "name": "vodaphone", "catSuggest": null},
                {"id": "8", "name": "apple", "catSuggest": null}]
        }
        const bud2Json = {
            "_id": bud2Id,
            "type": "bud",
            "name": "Test 2",
            "currency": "GBP",
            "created": new Date().toISOString(),
            "cats": [
                {
                    "id": "1",
                    "type": "cat",
                    "name": "Saving",
                    "weight": 0,
                    "items": [
                        {
                            "id": "1",
                            "type": "catitem",
                            "cat": "1",
                            "name": "Xmas",
                            "weight": 0,
                            "budgeted": 300,
                            "startdate": "2020-04-01",
                            "notes": ""
                        }
                    ]
                },
                {
                    "id": "2",
                    "type": "cat",
                    "name": "Some stuff",
                    "weight": 1,
                    "items": [
                        {
                            "id": "2",
                            "type": "catitem",
                            "catItem": "2",
                            "name": "Things",
                            "weight": 0,
                            "budgeted": 12,
                            "startdate": "2020-04-01",
                            "notes": ""
                        }
                    ]
                },
                {
                    "id": "3",
                    "type": "cat",
                    "name": "Everyday",
                    "weight": 2,
                    "items": [
                        {
                            "id": "3",
                            "name": "Groceries",
                            "weight": 0,
                            "budgeted": 850,
                            "startdate": "2020-04-01",
                            "notes": "blah, blah, blah"
                        },
                        {
                            "id": "4",
                            "name": "General",
                            "weight": 1,
                            "budgeted": 80,
                            "startdate": "2020-04-01",
                            "notes": "blah2, blah2, blah2"
                        },
                        {
                            "id": "5",
                            "name": "Clothes",
                            "weight": 2,
                            "budgeted": 80,
                            "startdate": "2020-04-01",
                            "notes": "blah3, blah3, blah3"
                        },
                        {
                            "id": "6",
                            "name": "Petrol",
                            "weight": 3,
                            "budgeted": 210,
                            "startdate": "2020-04-01",
                            "notes": "blah4, blah4, blah4"
                        },
                        {
                            "id": "7",
                            "name": "Heating",
                            "weight": 4,
                            "budgeted": 80,
                            "startdate": "2020-04-01",
                            "notes": "blah5, blah5, blah5"
                        }
                    ]
                }
            ],
            "payees": [{"id": "1", "name": "Heather cafe", "catSuggest": null},
                {"id": "2", "name": "updikes", "catSuggest": null},
                {"id": "3", "name": "car fun", "catSuggest": null},
                {"id": "4", "name": "scot power", "catSuggest": null},
                {"id": "5", "name": "mables", "catSuggest": null},
                {"id": "6", "name": "HMRC", "catSuggest": null},
                {"id": "7", "name": "plusnet", "catSuggest": null},
                {"id": "8", "name": "google", "catSuggest": null}]
        }
        const acc1Bud1Json = {
            "_id": acc1IdBud1,
            "type": "acc",
            "bud": bud1Uuid,
            "name": "Natwest Joint - Main",
            "onBudget": true,
            "open": true,
            "notes": "123",
            "weight": 0,
            "active": true
        }

        const acc2Bud1Json = {
            "_id": acc2IdBud1,
            "type": "acc",
            "bud": bud1Uuid,
            "name": "Nationwide Flex Direct",
            "open": true,
            "onBudget": true,
            "notes": "456",
            "weight": 1,
            "active": false
        }
        const acc1Bud2Json = {
            "_id": acc1IdBud2,
            "type": "acc",
            "bud": "2",
            "name": "Cash",
            "onBudget": true,
            "open": true,
            "notes": "yo!",
            "weight": 0,
            "active": true
        }
        // https://stackoverflow.com/questions/29877607/pouchdb-delete-alldocs-javascript
        // delete all docs thne create dummy budget and accounts and load up txns
        db.allDocs({include_docs: true}).then(allDocs => {
            return allDocs.rows.map(row => {
                return {_id: row.id, _rev: row.doc._rev, _deleted: true};
            });
        }).then(deleteDocs => {
            // delete  all docs
            return db.bulkDocs(deleteDocs);
        }).then(function () {
            // create budget one
            return db.put(bud1Json)
        }).then(function () {
            // create budget two
            return db.put(bud2Json)
        }).then(function (result) {
            // create account 1 - bud 1
            return db.put(acc1Bud1Json)
        }).then(function () {
            // create account 2 - bud 1
            return db.put(acc2Bud1Json)
        }).then(function () {
            // create account 1 - bud 2
            return db.put(acc1Bud2Json)
        }).then(function () {
            self.insertDummyTxns(bud1Uuid, shortAccId1Bud1, 2);
            self.insertDummyTxns(bud1Uuid, shortAccId2Bud1, 5);
            self.insertDummyTxns(bud2Uuid, shortAccId1Bud2, 30000);
            console.log('Update budget.js componentDidMount() bud1Uuid constant with ' + bud1Uuid + ' and bud2Uuid constant with ' + bud2Uuid)
        }).catch(function (err) {
            console.log(err);
        })
    }

    insertDummyTxns(budUuid, short_aid, totalTxns) {
        // const long_aid = BUDGET_PREFIX + budId + KEY_DIVIDER + ACC_PREFIX + short_aid
        // add dummy txns to flex direct acc
        // load lots of txns for flex acc
        // note: clear old data (stop npm, delete and recreate db in faxuton, clear db caches in browser) and run:
        // curl -H "Content-Type:application/json" -d @src/backup/budget.json -vX POST http://127.0.0.1:5984/budget/_bulk_docs
        const db = this.props.db
        //
        const payees = ["1", "2", "3", "4", "5", "6", "7", "8"]
        const catItems = ["1", "2", "3", "4", "5", "6", "7"]
        let dt = new Date();
        const largeNoTxns = Array(totalTxns).fill().map((val, idx) => {
            const amt = (idx + 1) * 100
            let outAmt = 0
            let inAmt = 0
            // const cleared = Math.random() < 0.8
            const cleared = idx > 5
            if (Math.random() < 0.2)
                outAmt = amt
            else
                inAmt = amt

            const payee = payees[Math.floor(Math.random() * payees.length)]
            const catItemId = catItems[Math.floor(Math.random() * catItems.length)]
            // dt.setDate(dt.getDate() + 1);
            dt.setDate(dt.getDate() - 1)
            return {
                "_id": Trans.getNewId(BUDGET_PREFIX + budUuid),
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
            db.put(txn).catch(function (err) {
                console.log(err);
            })
        }
    }

    static enhanceTxns(txnsForAcc, budget, acc) {
        // enhance transactions by adding name equivalent for cat and payee to ease sorting and searching
        // and make code easier to understand
        const payees = budget.getPayeesFullList(true)
        const cats = budget.getCatsFullList()
        for (let txn of txnsForAcc) {
            txn.enhanceData(budget, cats, payees, acc)
        }
    }

    refreshBudgetState = (budget) => {
        budget = typeof budget === "undefined" ? this.state.budget : budget
        this.setState({budget: budget})
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
            bud.sortAccounts()
            Account.updateActiveAccount(db, self.state.activeAccount, targetAcc, self, bud)
        }).catch(function (err) {
            handle_db_error(err, 'Failed to save drag details.', true)
        });
    }

    // TODO: is this best place for this?
    handleSaveAccount = (formState, budget) => {
        const db = this.props.db
        const idDetails = Account.getNewId(budget.shortId)
        const id = idDetails[1]
        if (formState.acc === null) {
            this.saveNewAcc(id, budget, formState, db)
        } else {
            this.updateAcc(formState, budget, db);
        }
    }

    updateAcc(formState, budget, db) {
        // update account
        // in memory model
        // const self = this
        let accounts = this.state.budget.accounts
        const accId = formState.acc.id
        const index = accounts.findIndex((obj => obj.id === formState.acc.id))
        const budState = formState.budgetState === 'on'
        accounts[index].name = formState.name
        accounts[index].notes = formState.notes
        accounts[index].open = formState.open
        accounts[index].onBudget = budState
        budget.accounts = accounts
        this.setState({budget: budget})
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

    saveNewAcc(id, budget, formState, db) {
        const self = this
        // TODO: use toJson ?
        const acc = {
            "_id": id,
            "type": "acc",
            "bud": budget.shortId + "",
            "name": formState.name,
            "bal": 0,
            "onBudget": formState.budgetState === 'on',
            "open": formState.open,
            "flagged": false,
            "notes": "",
            "weight": 0,
            txns: []
        }
        db.put(acc).then(function (doc) {
            return db.get(doc.id);
        }).then(function (doc) {
            // update in memory model
            const acc = new Account(doc)
            let accounts = [...self.state.budget.accounts, acc]
            budget.accounts = accounts
            self.setState({budget: budget, activeAccount: acc})
        }).catch(function (err) {
            handle_db_error(err, 'Failed to save the account.', true)
        });
    }

    handleMoveAccount = (draggedAcc, targetListType, overWeight) => {
        let open
        let onBudget
        const dragWithin = ((draggedAcc.open && draggedAcc.onBudget && targetListType === AccountListTypes.BUDGET) ||
            (draggedAcc.open && !draggedAcc.onBudget && targetListType === AccountListTypes.OFF_BUDGET) ||
            (!draggedAcc.open && targetListType === AccountListTypes.CLOSED))
        if (dragWithin) {
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

    // TODO: stop being called twice
    getTxns = () => {
        if (this.state.budget !== null && this.state.activeAccount !== null)
            return this.state.currSel === ALL_ACC_SEL ? this.state.budget.getTxns() : this.state.activeAccount.txns
        else
            return []
    }

    // clicking on lhs
    dashItemClick = (currSelId, postStateFn) => {
        const db = this.props.db
        let bud = this.state.budget
        const self = this
        postStateFn = typeof postStateFn === "undefined" ? function () {
        } : postStateFn
        db.get(bud.id).then(function (result) {
            bud.rev = result._rev
            bud.currSel = currSelId
            result.currSel = currSelId
            return db.put(result)
        }).then(function () {
            self.setState({currSel: currSelId}, postStateFn())
        }).catch(function (err) {
            handle_db_error(err, 'Failed to update the budget.', true);
        });
    }

    budListClick = () => {
        this.props.gotoAllBudgets()
    }

    budClick = () => {
        this.dashItemClick(BUD_SEL)
    }

    repClick = () => {
        this.dashItemClick(REP_SEL)
    }

    allAccClick = () => {
        this.dashItemClick(ALL_ACC_SEL)
    }

    handleAccClick = (event, acc) => {
        Account.updateActiveAccount(this.props.db, this.state.activeAccount, acc, this, this.state.budget)
    }

    render() {
        const {budget} = this.state
        const panel1DefSize = localStorage.getItem('pane1DefSize') || '300';
        const panel2DefSize = localStorage.getItem('pane2DefSize') || '70%';
        return (
            <div>
                <Loading loading={this.state.loading}/>
                <div onMouseMove={this._onMouseMove} id='budget'>
                    <MetaTags>
                        <title>{this.state.budget == null ? APP_NAME : this.state.budget.name + ' - ' + APP_NAME}</title>
                    </MetaTags>
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
                                 activeAccount={this.state.activeAccount}
                                 allAccClick={this.allAccClick}
                                 repClick={this.repClick}
                                 budClick={this.budClick}
                                 currSel={this.state.currSel}
                                 budListClick={this.budListClick}
                        />
                        {/* budget */}
                        {this.state.currSel === BUD_SEL &&
                        <div id="budget_block">
                            <SplitPane>
                                <BudgetContainer/>
                            </SplitPane>
                        </div>
                        }
                        {/* report */}
                        {this.state.currSel === REP_SEL &&
                        <div id="report_block">
                            <SplitPane>
                                <RepContainer/>
                            </SplitPane>
                        </div>
                        }
                        {/* all and individual accounts */}
                        {(this.state.currSel === IND_ACC_SEL || this.state.currSel === ALL_ACC_SEL) &&
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
                                            currSel={this.state.currSel}
                                            txns={this.getTxns()}
                                />
                                }
                                <ScheduleContainer/>
                            </SplitPane>
                        </div>
                        }
                    </SplitPane>
                </div>
            </div>
        )
    }
}

export class BudgetList extends Component {

    state = {form_open: false, selectedBudget: null}

    onSelectedCurrency = currencyAbbrev => {
        console.log(currencyAbbrev)
    }

    // TODO: code this
    addNewBudget = () => {
        this.toggleBudgetForm(null)
    }

    handleOnClick = (budget) => {
        // this.toggleAccForm(event)
        this.toggleBudgetForm(budget)
        // this.props.onClick(budId)
    }

    openBudget = (budget) => {
        this.props.onClick(budget.id)
    }

    // toggleBudgetForm = (event, acc) => {
    toggleBudgetForm = (budget) => {
        // event.preventDefault()
        // if (!this.state.acc_form_open) {
        //
        // }
        // this.setState({acc_form_open: !this.state.acc_form_open, context_bud: acc})
        this.setState({form_open: !this.state.form_open, selectedBudget: this.state.form_open ? null : budget})
    }

    // TODO: code this
    handleSaveBudget = () => {
       alert('handleSaveBudget')
    }

    // TODO: code this
    handleDeleteBudget = () => {
       alert('handleDeleteBudget')
    }

    // TODO: continue work on popup
    // TODO: add delete logic
    // TODO: add add logic
    // TODO: add edit logic
    // TODO: change db name from budget to smash
    // TODO: test no budgets
    // TODO: add version no somewhere
    // TODO: on mobile etc right click won't work
    // TODO: do todos in apps.js
    // TODO: do todos in dropdown.js
    // TODO: do all todos
    render() {
        // const {budgets, onClick, editBudget, deleteBudget} = this.props
        const {budgets} = this.props
        return (
            <div className={"container"}>
                <div className={"row"} id={"app_header"}>
                    <div className={"col"}>{APP_NAME}</div>
                </div>
                <h5 className={"mt-4"}>Your Budgets</h5>
                <div className={"row"}>
                    {typeof budgets !== "undefined" && budgets.length > 0 &&
                    budgets.map((bud) => (
                        <div className={"col-xs-6 budgetItem"} onClick={() => this.handleOnClick(bud)}>
                            <div className={"bud_name"}>{bud.name}</div>
                            <div className={"budgetItemOpen"}>
                                <div className={"last_open"}>last opened</div>
                                <div className={"last_open_time"}>{timeSince(bud.lastOpened) + " ago"}</div>
                            </div>
                        </div>
                    ))
                    }
                     {/* https://stackoverflow.com/questions/48106407/how-to-vertically-center-text-in-my-bootstrap-4-column */}
                     <div className={"col-xs-6 budgetItem d-flex"} onClick={() => this.addNewBudget()}>
                         <FontAwesomeIcon icon={faPlus} className="mr-1 align-self-center"/>
                     </div>
                </div>
                 <BudgetForm toggleBudgetForm={this.toggleBudgetForm}
                             open={this.state.form_open}
                             // acc={this.state.context_acc}
                             budget={this.state.selectedBudget}
                             ccyOnChange={this.ccyOnChange}
                             openBudget={this.openBudget}
                             handleSaveBudget={this.handleSaveBudget}
                             handleDeleteBudget={this.handleDeleteBudget}
                 />
            </div>
        )
    }
}