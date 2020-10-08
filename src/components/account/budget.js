import React, {Component} from 'react'
import Account from "./account";
import AccDash, {AccDashSmall, AccountListTypes} from "./dash";
import {INIT_BAL_PAYEE, BUDGET_DOC_TYPE, ACC_DOC_TYPE, TXN_DOC_TYPE, TXN_SCHED_DOC_TYPE, CATEGORY_DOC_TYPE, CATEGORY_ITEM_DOC_TYPE, MONTH_CAT_ITEM_DOC_TYPE} from './budget_const'
import AccDetails, {FREQS} from "./details";
import ScheduleContainer from "./schedule";
import BudgetContainer from "./bud";
import RepContainer from "./rep";
import {SCHED_RUN_LOG_ID, getSchedExecuteId} from '../app/App'
import './budget.css'
import './budget_dash.css'
import './acc_details.css'
import SplitPane from 'react-split-pane';
import '../../utils/split_pane.css'
import {DESC} from './sort'
import {KEY_DIVIDER, BUDGET_PREFIX, ACC_PREFIX, SHORT_BUDGET_PREFIX, BUDGET_KEY, SCHED_EXECUTED_PREFIX, TXN_PREFIX} from './keys'
import {DATE_ROW} from "./rows";
import {getDateIso, timeSince, formatDate} from "../../utils/date";
import Trans from "./trans";
import CatGroup, {CatItem, MonthCatItem} from "./cat";
import {handle_db_error, Loading, DBState, DB_CHANGE, DB_PULL, DB_PUSH} from "../../utils/db";
import {v4 as uuidv4} from "uuid";
import MetaTags from 'react-meta-tags';
import {faPlus} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import BudgetForm from './budget_form'
import RestoreBudgetForm from './restore_budget_form'
import {defaultCcy, getCcyDetails} from "../../utils/ccy"
import $ from "jquery";
import {saveTextAsFile} from "../../utils/file";

export class Budget {
    constructor(budDoc) {
        let ccyIso
        if (typeof budDoc === "undefined")
        {
            const budIds = Budget.getNewId()
            const budId = budIds[1]
            const now = new Date().toISOString()
            this.id = budId
            this.brev = null
            this.bcreated = now
            this.blastOpened = now
            this.bname = ''
            this.baccounts = []
            this.bcats = []
            this.bpayees = []
            // calced in mem and not stored in db
            this.atotal = 0
            ccyIso = defaultCcy
            this.bcurrSel = BUD_SEL
        }
        else
        {
            let budId = typeof budDoc._id === "undefined" ? budDoc.id : budDoc._id
            this.id = budId
            this.brev = budDoc._rev
            this.bcreated = new Date(budDoc.created)
            this.blastOpened = new Date(budDoc.lastOpened)
            this.bname = budDoc.name
            this.baccounts = []
            this.bcats = []
            this.bpayees = budDoc.payees.sort(this.comparePayees)
            // calced in mem and not stored in db
            this.atotal = 0
            ccyIso = budDoc.currency
            this.bcurrSel = budDoc.currSel
        }
        this.txnsSched = []
        this.bccyDetails = getCcyDetails(ccyIso)
    }

    get ccyDetails() {
        return this.bccyDetails;
    }

    get ccy() {
        return this.ccyDetails.iso
    }

    set ccy(ccy) {
        this.bccyDetails = getCcyDetails(ccy)
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

    // https://stackoverflow.com/questions/37229561/how-to-import-export-database-from-pouchdb
     generateJson = () => {
        let bud = this
        // extract json for each budget doc
        // budget
        let json = [bud.asJson(false)]
        // accs
        for (const acc of bud.accounts)
        {
            json.push(acc.asJson(false))
            // txns
            for (const txn of acc.txns)
            {
                json.push(txn.asJson(false))
            }
            // txn scheds
            for (const txn of acc.txnScheds)
            {
                json.push(txn.asJson(false))
            }
        }
        // cats
        for (const cat of bud.cats)
        {
            json.push(cat.asJson(false))
            for (const item of cat.items)
            {
                json.push(item.asJson(false))
                for (const monthItem of item.monthItems)
                {
                    json.push(monthItem.monthCatItem.asJson(false))
                }
            }
        }
        return json
    }

    backup = (db) => {
        function pad(n) {return n<10 ? '0'+n : n}
        let bud = this
        let jsonItems = []
        db.get(SCHED_RUN_LOG_ID).then(function(doc){
            delete doc._rev
            // add schedRunLog to list to backup
            jsonItems.push(doc)
            const key = SCHED_EXECUTED_PREFIX + SHORT_BUDGET_PREFIX + bud.shortId
            // add schedEx entries to list to backup
            db.allDocs({startkey: key, endkey: key + '\uffff'})
                .then(function (results) {
                    for (const row of results.rows) {
                        delete row._rev
                        delete row.key
                        delete row.value
                        jsonItems.push(row)
                    }
                    const today = new Date()
                    const dateStr = new Date().getUTCFullYear() + '-'
                        + pad(today.getUTCMonth() + 1) + '-'
                        + pad(today.getUTCDate()) + 'T'
                        + pad(today.getUTCHours()) + ':'
                        + pad(today.getUTCMinutes()) + ':'
                        + pad(today.getUTCSeconds())
                    let name = bud.name.toLowerCase().replace(/ /g, '_')
                    // strip non alpha numeric
                    name = name.replace(/\W/g, '')
                    const fileName = name + "_" + dateStr + ".json"
                    // add all budget in memory entries to list to backup
                    jsonItems = jsonItems.concat(bud.generateJson(db))
                    const jsonStr = JSON.stringify(jsonItems, null, 4)
                    saveTextAsFile(fileName, jsonStr)
                })
        }).catch(function (err) {
            // TODO:
        })
    }

    get id() {
        return this.bid
    }

    set id(id) {
        this.bid = id
        const lastDividerPosn = this.bid.lastIndexOf(KEY_DIVIDER)
        this.ashortId = this.bid.substring(lastDividerPosn + 1)
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

    isNew() {
        return this.rev === null
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

    getAccount(id, useOld) {
        useOld = typeof useOld === "undefined" ? false : useOld
        let item = null
        id = id + ''
        for (const acc of this.accounts) {
            const currId = useOld ? acc.oldId : acc.id
            if (currId === id) {
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

    getTxnsScheds() {
        let scheds = []
        for (const acc of this.accounts) {
            for (let sched of acc.txnScheds) {
                scheds.push(sched)
            }
        }
        return scheds
    }

    addSchedToBudget(db, sched, acc, postProcessSchedule, runDate) {
        let txn = Object.assign(Object.create(Object.getPrototypeOf(sched)), sched)
        let accOfTrans = this.getAccount(txn.longAccId)
        const targetAccInTransfer = this.getAccount(txn.payee)
        const isTransfer = sched.isPayeeAnAccount()
        txn.id = Trans.getNewId(txn.budShort)
        txn.rev = null
        txn.createdBySched = sched.id
        txn.date = typeof runDate === "undefined" ? new Date() : runDate
        txn.type = TXN_DOC_TYPE
        txn.actionTheSave(false, db, this, targetAccInTransfer, accOfTrans, false, isTransfer,
            false, null, acc, postProcessSchedule, sched, runDate)
    }

    addPayee(db, txn, accDetailsCont, addAnother, isSched) {
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
        this.updateBudgetWithNewTxnPayee(db, txn, accDetailsCont, addAnother, isSched)
    }

    getTxn(id, useOld) {
        useOld = typeof useOld === "undefined" ? false : useOld
        let theTxn = null
        let theAcc = null
        for (const acc of this.accounts) {
            const txn = acc.getTxn(id, useOld)
            if (txn !== null) {
                theTxn = txn
                theAcc = acc
                break
            }

        }
        return [theTxn, theAcc]
    }

    getTxns(isSched) {
        isSched = typeof isSched === "undefined" ? false: isSched
        let txns = []
        for (const acc of this.accounts) {
            txns = txns.concat(isSched? acc.txnScheds : acc.txns)
        }
        return txns
    }

    // TODO: tidy up
    static getBudgetFromJson(budgetJson){
        let oldSchedExIds = []
        let schedExIds = []
        const jsonObjs = JSON.parse(budgetJson)
        let bud
        const budIds = Budget.getNewId()
        const budId = budIds[1]
        for (const json of jsonObjs)
        {
            // this is output in set order so we can be assured of how to consume below
            switch (json.type)
            {
                case BUDGET_DOC_TYPE:
                    const now = formatDate(new Date())
                    bud = new Budget(json)
                    bud.name = bud.name + " (" + now + ")"
                    bud.id = budId
                    break
                case ACC_DOC_TYPE:
                    let acc = new Account(json)
                    acc.oldId = acc.id
                    acc.oldShortId = acc.shortId
                    const accIdDetails = Account.getNewId(bud.shortId)
                    const accId = accIdDetails[1]
                    acc.id = accId
                    acc.bud = bud.shortId
                    bud.accounts.push(acc)
                    break
                case TXN_SCHED_DOC_TYPE:
                case TXN_DOC_TYPE:
                    for (const acc of bud.accounts)
                    {
                        if (acc.oldShortId === json.acc)
                        {
                            let txn = new Trans(json)
                            txn.oldId = txn.id
                            txn.id = Trans.getNewId(bud.shortId)
                            txn.acc = acc.shortId
                            // note: I use lon catItem id so that I can also have income
                            txn.oldCatItem = txn.catItem
                            if (json.type === TXN_DOC_TYPE)
                                acc.txns.push(txn)
                            else
                                acc.txnScheds.push(txn)
                            break
                        }
                    }
                    break
                case CATEGORY_DOC_TYPE:
                    let catGroup = new CatGroup(json)
                    catGroup.oldShortId = catGroup.shortId
                    catGroup.setId(CatGroup.getNewId(bud.shortId))
                    bud.cats.push(catGroup)
                    break
                case CATEGORY_ITEM_DOC_TYPE:
                    for (const catGroup of bud.cats)
                    {
                        if (catGroup.oldShortId === json.cat)
                        {
                            let catItem = new CatItem(json)
                            catItem.oldShortId = catItem.shortId
                            catItem.oldLongId = catItem.id
                            catItem.setId(CatGroup.getNewId(bud.shortId))
                            catItem.cat = catGroup.shortId
                            catGroup.items.push(catItem)
                            break
                        }
                    }
                    break
                case MONTH_CAT_ITEM_DOC_TYPE:
                    let catItem = bud.getOldCatItem(json.catItem, true)
                    // now create monthCatItem
                    if (catItem !== null)
                    {
                        let monthCatItem = new MonthCatItem(json)
                        monthCatItem.id = MonthCatItem.getNewId(bud.shortId, new Date(monthCatItem.datePart))
                        monthCatItem.catItem = catItem.shortId
                        const key = getDateIso(monthCatItem.date)
                        // catItem.monthItems.push(monthCatItem)
                        catItem.monthItems.push({date: key, monthCatItem})
                    }
                    break
                default:
                    if (typeof json.id !== "undefined" && json.id.startsWith(SCHED_EXECUTED_PREFIX))
                    {
                        oldSchedExIds.push(json.id)
                    }
                    break
            }
        }

        // iterate around txns and set the catItem to the new id for the catItem
        const txns = bud.getTxns(true).concat(bud.getTxns())
        for (const txn of txns)
        {
            let catItem = bud.getOldCatItem(txn.oldCatItem, false)
            if (catItem != null)
            {
                txn.catItem = catItem.id
            }

            // set transfer ids to new txn.ids
            if (txn.isPayeeAnAccount())
            {
                // update the payee
                let theAcc = bud.getAccount(txn.payee, true)
                if (theAcc != null)
                {
                    txn.payee = theAcc.id
                }
                // update the transfer id
                let opposite = bud.getTxn(txn.transfer, true)[0]
                if (opposite != null)
                {
                    txn.transfer = opposite.id
                }
            }

            // update createdBySched
            if (txn.createdBySched !== null)
            {
                let createdBySched = bud.getTxn(txn.createdBySched, true)[0]
                if (createdBySched != null)
                {
                    txn.createdBySched = createdBySched.id
                }
            }
        }

        // iterate around payee and set the catSuggest to the new id for the catItem
        for (const payee of bud.payees)
        {
            if (typeof payee.catSuggest !== "undefined" && payee.catSuggest !== null)
            {
                let catItem = bud.getOldCatItem(payee.catSuggest, false)
                if (catItem != null)
                {
                    payee.catSuggest = catItem.id
                }
            }
        }

        // update schedExIds to new ones
        for (const id of oldSchedExIds)
        {
            const pieces = id.split(KEY_DIVIDER)
            const oldBudId = pieces[2]
            const oldSchedShortId = pieces[4]
            const oldSchedId = SHORT_BUDGET_PREFIX + oldBudId + KEY_DIVIDER + TXN_PREFIX + oldSchedShortId
            const schedDate = new Date(pieces[5])
            // TODO: newSched is null - because I am passing in shortId
            const newSched = bud.getTxn(oldSchedId, true)[0]
            if (newSched !== null)
            {
                const newSchedExId = getSchedExecuteId(newSched, schedDate)
                schedExIds.push({_id: newSchedExId})
            }
        }
        return [bud, schedExIds]
    }

    // get catitem based on original id
    getOldCatItem = (catItemId, short) => {
        let catItem = null
        for (const catGroup of this.cats) {
            for (const item of catGroup.items) {
                const target = short ? item.oldShortId : item.oldLongId
                if (target === catItemId) {
                    catItem = item
                    break
                }
            }
            if (catItem !== null)
                break
        }
        return catItem
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

    get workingBalance() {
        return this.clearedBalance + this.unclearedBalance
    }

    save(db, postSaveFn) {
        const self = this
        const json = self.asJson(true)
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

    getCatItems() {
        const catItems = []
        for (const cat of this.cats) {
            for (const catItem of cat.items) {
                catItems.push(catItem)
            }
        }
        return catItems
    }

    getCatsFullList() {
        return [Trans.getIncomeCat()].concat(this.cats)
    }

    asJson(incRev) {
        let json = {
            "_id": this.id,
            "type": "bud",
            "name": this.name,
            "currency": this.ccy,
            "currSel": this.currSel,
            "created": this.created,
            "lastOpened": this.lastOpened,
            "payees": this.payees
        }
        if (incRev)
            json["_rev"] = this.rev
        return json
    }

    // save new payee to db and then save the txn which calls txn.txnPostSave which updates totals etc in UI
    // if the payee update fails then the txn is not saved
    updateBudgetWithNewTxnPayee(db, txn, accDetailsCont, addAnother, isSched) {
        const self = this
        const json = self.asJson(true)
        db.get(self.id).then(function (doc) {
            json._rev = doc._rev // in case it has been updated elsewhere
            db.put(json).then(function (result) {
                txn.save(db, accDetailsCont, addAnother, isSched)
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

    static getCats(shortBudId, groups, addRandMonthItems) {
        let catGroups = []
        let catItems = []
        let catMonthItems = []
        let catItemIdList = []
        let groupWeight = 0
        let catItemWeight = 0
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
                    const budgetAmount = 0
                    catMonthItems.push(Budget.getNewMonthCatItem(shortBudId, catItemId, budgetAmount, today))
                }
            }
            groupWeight += 1
        }
        return [catGroups.concat(catItems).concat(catMonthItems), catItemIdList]
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

const APP_NAME = 'Wasabi';

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

    // Note: I use pouchdb mango queries for simple fetch, filter and sort queries and map/reduce queries for one to many fetches
    //       https://pouchdb.com/guides/queries.html
    //  eg: to get catitem for a txn I use https://docs.couchdb.org/en/master/ddocs/views/joins.html#linked-documents
    //      https://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html
    componentDidMount() {
        const self = this
        const db = this.props.db
        AccountsContainer.fetchData(self, db, this.props.budget, null)
    }

    componentWillReceiveProps(nextProps)
    {
        // if remote db changed then update the UI
        if ((nextProps.dbState === DB_CHANGE && (nextProps.dir === DB_PULL)) ||
                ((nextProps.dir === DB_PUSH && typeof this.props.txnCreatedBySched !== "undefined" && this.props.txnCreatedBySched !== null)))
        {
            const self = this
            const db = this.props.db
            this.setState({budget: this.props.budget}, function(){
                AccountsContainer.fetchData(self, db, this.props.budget, null)
            })

        }
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
    static fetchData(self, db, budget, postFetchFn) {
        const key = SHORT_BUDGET_PREFIX + budget.shortId
        // load up acccs, txns, cats, catitems & monthCatItem
        db.allDocs({startkey: key, endkey: key + '\uffff', include_docs: true})
            .then(function (results) {
                if (results.rows.length > 0) {
                    var accs = []
                    var txns = {}
                    var txnScheds = {}
                    var catGroups = []
                    var catItems = []
                    var monthCatItems = []
                    let activeAccount = null

                    // extract budget and account data - assuming no order, eg txns could come before accs
                    for (const row of results.rows) {
                        const doc = row.doc
                        switch (doc.type) {
                            case ACC_DOC_TYPE:
                                let acc = new Account(doc)
                                accs.push(acc)
                                if (acc.active)
                                    activeAccount = acc
                                break
                            case TXN_DOC_TYPE:
                            case TXN_SCHED_DOC_TYPE:
                                let txn = new Trans(doc)
                                let accKey = SHORT_BUDGET_PREFIX + budget.shortId + KEY_DIVIDER + ACC_PREFIX + txn.acc
                                if (doc.type === TXN_DOC_TYPE)
                                {
                                    if (typeof txns[accKey] === "undefined")
                                        txns[accKey] = []
                                    txns[accKey].push(txn)
                                }
                                else
                                {
                                    if (typeof txnScheds[accKey] === "undefined")
                                        txnScheds[accKey] = []
                                    txnScheds[accKey].push(txn)
                                }
                                break
                            case CATEGORY_DOC_TYPE:
                                catGroups.push(new CatGroup(doc))
                                break
                            case CATEGORY_ITEM_DOC_TYPE:
                                catItems.push(new CatItem(doc))
                                break
                            case MONTH_CAT_ITEM_DOC_TYPE:
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
                        AccountsContainer.applyTxnsToAcc(txns, acc, budget, false)
                        AccountsContainer.applyTxnsToAcc(txnScheds, acc, budget, true)
                    }
                    budget.updateTotal()
                    // show budget and accounts
                    if (self !== null)
                    {
                        const state = {
                            budget: budget,
                            activeAccount: activeAccount,
                            loading: false,
                            currSel: budget.currSel
                        }
                        self.setState(state)
                    }
                } else
                {
                    if (self !== null)
                        self.setState({loading: false})
                }
                if (postFetchFn != null)
                    postFetchFn(budget, false)
            })
            .catch(function (err) {
                if (self !== null)
                {
                    self.setState({loading: false})
                    handle_db_error(err, 'Failed to fetch the budget.', true)
                }
                else
                {
                    console.log(err)
                }
            });
    }

    static applyTxnsToAcc(txns, acc, budget, isSched) {
        let txnsForAcc = txns[acc.id]
        if (typeof txnsForAcc !== "undefined") {

            // set default order
            txnsForAcc = txnsForAcc.sort(Account.compareTxnsForSort(DATE_ROW, DESC));
            AccountsContainer.enhanceTxns(txnsForAcc, budget, acc, isSched);
            if (isSched)
                acc.txnScheds = txnsForAcc
            else
                acc.txns = txnsForAcc
        }
    }

// TODO: remove
    randomDate(start, end) {
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }

    // TODO: remove
    dummyTxns(budget, activeAccount){
        const memos = ['hi', 'blue', 'peace', 'pen', 'age', 'roar', 'lion', 'age', 'pension', 'howdy folks!']
        let txns = []
        for (let i=0; i< 20000; i++)
        {
            const date = this.randomDate(new Date(2019, 0, 1), new Date())
            const budgetShortId = budget.shortId
            let inAmt = Math.floor(Math.random() * 900) + 125
            let outAmt = Math.floor(Math.random() * 900) + 98
            if (Math.random() < 0.5)
                inAmt = 0
            else
                outAmt = 0
            const catItems = budget.getCatItems()
            const payee = budget.payees[Math.floor(Math.random() * budget.payees.length)]
            const catItem = catItems[Math.floor(Math.random() * catItems.length)]
            let txn = {
                      "_id": Trans.getNewId(budgetShortId),
                      "type": "txn",
                      "acc": activeAccount.shortId,
                      "budShort": budgetShortId,
                      "flagged": false,
                      "date": getDateIso(date),
                      "catItem": typeof catItem === "undefined" ? '' : catItem.id,
                      "memo": memos[Math.floor(Math.random() * memos.length)],
                      "out": inAmt,
                      "in": outAmt,
                      "payee": typeof payee === "undefined" ? '0' : payee.id,
                      "cleared": true,
                      "transfer": null
                    }
            txns.push(txn)
        }
        this.props.db.bulkDocs(txns).catch(function (err) {
            handle_db_error(err, 'Failed to create dummy txns', true)
        })
    }

    handleDeleteAccount = targetAcc => {
        const self = this
        const db = self.props.db
        db.get(targetAcc.id).then(function (doc) {
            return db.remove(doc);
        }).then(function (result) {
            let txnIds = []
            for (const txn of targetAcc.txns)
                txnIds.push(txn.id)
            for (const txn of targetAcc.txnScheds)
                txnIds.push(txn.id)
            self.deleteTxns(txnIds)
            self.state.budget.removeAccount(targetAcc)
        }).catch(function (err) {
            handle_db_error(err, 'Failed to delete the account.', true)
        });
    }

    undoTxnDelete = () => {

    }

    deleteTxns = (txn_ids) => {
        this.state.activeAccount.deleteTxns(this.props.db, txn_ids, this.state.budget, this.refreshBudgetState)
    }

    addSchedToBudget = (txn_ids) => {
        this.state.activeAccount.addSchedToBudget(this.props.db, txn_ids, this.state.budget, this.refreshBudgetState)
    }

    moveBackToScheduler = (txn_ids) => {
        this.state.activeAccount.moveBackToScheduler(this.props.db, txn_ids, this.state.budget, this.refreshBudgetState)
    }

    _onMouseMove = (e) => {
        MOUSE_DIR = e.screenY < MOUSE_LAST_Y ? MOUSE_UP : MOUSE_DOWN
        MOUSE_LAST_Y = e.screenY
    }

    static enhanceTxns(txnsForAcc, budget, acc, isSched) {
        // enhance transactions by adding name equivalent for cat and payee to ease sorting and searching
        // and make code easier to understand
        const payees = budget.getPayeesFullList(true)
        const cats = budget.getCatsFullList()
        for (let txn of txnsForAcc) {
            if (isSched && typeof txn.freq !== "undefined")
            {
                const name = FREQS.find(x => x.id === txn.freq).name
                txn.freqName = name
            }
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
        const acc = {
            "_id": id,
            "type": "acc",
            "bud": budget.shortId + "",
            "name": formState.name,
            "bal": 0,
            "onBudget": formState.budgetState === 'on',
            "open": formState.open,
            "flagged": false,
            "notes": formState.notes,
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

    getTxns = () => {
        if (this.state.budget !== null && this.state.activeAccount !== null)
            return this.state.currSel === ALL_ACC_SEL ? this.state.budget.getTxns() : this.state.activeAccount.txns
        else
            return []
    }

    getTxnScheds = () => {
        if (this.state.budget !== null && this.state.activeAccount !== null)
            return this.state.currSel === ALL_ACC_SEL ? this.state.budget.getTxns(true) : this.state.activeAccount.txnScheds
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

    handleBurgerClick = () => {
        $('#budget > div.SplitPane.vertical > div.Pane.vertical.Pane1').toggle()
        $('#budget > div.SplitPane.vertical > div.Pane.vertical.Pane2').toggleClass('mobileDisabled')
    }

    backupBudget = () => {
        this.props.budget.backup(this.props.db)
    }

    render() {
        const {budget} = this.state
        const panel1DefSize = localStorage.getItem('pane1DefSize') || '300';
        const panel2DefSize = localStorage.getItem('pane2DefSize') || '500';
        return (
            <div>
                <Loading loading={this.state.loading}/>
                <div onMouseMove={this._onMouseMove} id='budget'>
                    <MetaTags>
                        <title>{this.state.budget == null ? APP_NAME : this.state.budget.name + ' - ' + APP_NAME}</title>
                    </MetaTags>
                    <AccDashSmall budget={budget} handleClick={this.props.gotoAllBudgets} handleBurgerClick={this.handleBurgerClick}/>
                    {/* https://github.com/tomkp/react-split-pane and examples: http://react-split-pane-v2.surge.sh/ */}
                    <SplitPane split="vertical" minSize={200} maxSize={450}
                               defaultSize={parseInt(panel1DefSize, 10)}
                               onChange={size => localStorage.setItem('pane1DefSize', size)}>
                        <AccDash budget={budget}
                                 backupBudget={this.backupBudget}
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
                                 budListClick={this.props.gotoAllBudgets}
                                 dbState={this.props.dbState}
                        />
                        {/* budget */}
                        {this.state.currSel === BUD_SEL &&
                        <div id="budget_block">
                            <BudgetContainer/>
                        </div>
                        }
                        {/* report */}
                        {this.state.currSel === REP_SEL &&
                        <div id="report_block">
                            <RepContainer/>
                        </div>
                        }
                        {/* right hand side: txns*/}
                        {(this.state.currSel === IND_ACC_SEL || this.state.currSel === ALL_ACC_SEL) &&
                        <div id="acc_details_block">
                            {this.state.activeAccount != null && this.state.budget.accounts != null &&
                                <SplitPane split="horizontal"
                                           defaultSize={parseInt(panel2DefSize, 10)}
                                           minSize={200}
                                           onChange={size => localStorage.setItem('pane2DefSize', size)}>
                                        <AccDetails db={this.props.db}
                                                    budget={budget}
                                                    activeAccount={this.state.activeAccount}
                                                    toggleCleared={this.toggleCleared}
                                                    toggleFlag={this.toggleFlag}
                                                    deleteTxns={this.deleteTxns}
                                                    moveBackToScheduler={this.moveBackToScheduler}
                                                    refreshBudgetState={this.refreshBudgetState}
                                                    currSel={this.state.currSel}
                                                    handleClick={this.handleBurgerClick}
                                                    txns={this.getTxns()}
                                        />
                                        <ScheduleContainer db={this.props.db}
                                                        budget={budget}
                                                        activeAccount={this.state.activeAccount}
                                                        toggleCleared={this.toggleCleared}
                                                        toggleFlag={this.toggleFlag}
                                                        deleteTxns={this.deleteTxns}
                                                        addSchedToBudget={this.addSchedToBudget}
                                                        refreshBudgetState={this.refreshBudgetState}
                                                        currSel={this.state.currSel}
                                                        handleClick={this.handleBurgerClick}
                                                        txns={this.getTxnScheds()}
                                                        />
                                </SplitPane>
                            }
                            {this.state.activeAccount === null && this.state.loading &&
                                <div>
                                    <div id="add_acc_block" className={"text-center scroll-container panel_level1"}>
                                    </div>
                                </div>
                            }
                            {this.state.activeAccount === null && !this.state.loading &&
                                <div>
                                    <div id="add_acc_block" className={"text-center scroll-container panel_level1"}>
                                        You will need to add at least one account before you can add transactions
                                    </div>
                                </div>
                            }
                        </div>
                        }
                    </SplitPane>
                </div>
            </div>
        )
    }
}

export class BudgetList extends Component {

    state = {budget_form_open: false, selectedBudget: null, restore_budget_form_open: false, showSkins: false}

    handleOnClick = (budget) => {
        this.toggleBudgetForm(budget)
    }

    openBudget = (budget) => {
        this.props.onClick(budget.id)
    }

    toggleBudgetForm = (budget) => {
        this.setState({budget_form_open: !this.state.budget_form_open,
            selectedBudget: this.state.budget_form_open ? null : budget})
    }

    toggleRestoreBudgetForm = (budget) => {
        this.setState({restore_budget_form_open: !this.state.restore_budget_form_open})
    }

    addNewBudget = () => {
        this.toggleBudgetForm(new Budget())
    }

    restoreBudget = () => {
        this.toggleRestoreBudgetForm()
    }

    // https://github.com/pouchdb/upsert
    handleSaveBudget = (formState, budget) => {
        const db = this.props.db
        const self = this
        let isNew = budget.isNew()
        let savedBud

        db.upsert(budget.id, function (doc) {
            if (isNew)
                doc = budget
            doc.name = formState.name
            if (isNew)
            {
                doc.ccy = formState.ccyItem.iso
                savedBud = doc
                return doc.asJson(true)
            }
            else
            {
                doc.currency = formState.ccyItem.iso
                savedBud = new Budget(doc)
                return doc
            }
        }).then(function (res) {
            savedBud.rev = res.rev
            self.props.refreshListItem(savedBud)
            if (isNew)
            {
                // add cats & catItems
                const cats = Budget.getDefaultCats(savedBud.shortId)[0]
                db.bulkDocs(cats).catch(function (err) {
                    handle_db_error(err, 'Failed to save the categories.', true)
                })
            }
        }).catch(function (err) {
            handle_db_error(err, 'Failed to save the budget.', true)
        });
    }

    handleDeleteBudget = (budget) => {
       this.props.deleteBudget(budget)
    }

    toggleSkinList = () => {
        this.setState({showSkins: !this.state.showSkins})
    }

    // wasabi: https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcT8Vorn3lh8HT7M9Tkjf6zKBv489I7SpIcqdg&usqp=CAU
    render() {
        const {budgets, skinChanged, skinId} = this.props
        return (
            <div className={"container"}>
                <div className={"row"} id={"app_header"}>
                    <div className={"col"}>{APP_NAME}</div>
                </div>
                <h5 className={"mt-4"}>Your Budgets</h5>
                <div className={"row"}>
                    {typeof budgets !== "undefined" && budgets.length > 0 &&
                    budgets.map((bud) => (
                        <div key={bud.id} className={"col-xs-6 budgetItem"} onClick={() => this.handleOnClick(bud)}>
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
                <div id={"bud_list_acts"}>
                    <div id={"bud_list_acts_links"}>
                        <div id="skinLink" onClick={() => this.toggleSkinList()}>
                            {this.state.showSkins && "Hide Skins"}
                            {!this.state.showSkins && "Show Skins"}
                        </div>
                        <div id="restore_bud" onClick={() => this.restoreBudget()}>
                             Restore a Budget
                         </div>
                     </div>
                    {this.state.showSkins &&
                    <select id="skinList" className={"form-control"} onChange={(e) => skinChanged(e)} value={skinId}>
                        <option value="1">Blue Yonder</option>
                        <option value="3">Orange Skies</option>
                        <option value="2">Pink Fizz</option>
                        <option value="4">Purple Haze</option>
                     </select>}
                 </div>
                <div><DBState dbState={this.props.dbState}/></div>
                 <BudgetForm toggleBudgetForm={this.toggleBudgetForm}
                             open={this.state.budget_form_open}
                             budget={this.state.selectedBudget}
                             openBudget={this.openBudget}
                             handleSaveBudget={this.handleSaveBudget}
                             handleDeleteBudget={this.handleDeleteBudget}
                 />
                 <RestoreBudgetForm toggleBudgetForm={this.toggleRestoreBudgetForm}
                             open={this.state.restore_budget_form_open}
                             applyBudget={this.props.applyBudget}
                 />
            </div>
        )
    }
}