import {
    OUT_EQUALS_TS, OUT_MORE_EQUALS_TS, OUT_LESS_EQUALS_TS, IN_EQUALS_TS, IN_MORE_EQUALS_TS, IN_LESS_EQUALS_TS,
    PAYEE_TS, CAT_TS, MEMO_TS, DATE_EQUALS_TS, DATE_MORE_EQUALS_TS, DATE_LESS_EQUALS_TS
} from "../account/details";
import {KEY_DIVIDER, ACC_PREFIX, SHORT_BUDGET_PREFIX} from './keys'
import {ASC, DESC} from './sort'
import {handle_db_error, validateBulkDocs} from "../../utils/db";
import {v4 as uuidv4} from "uuid";

let ACC = null
let POST_FN = null
export default class Account {
    constructor(doc) {
        const lastDividerPosn = doc._id.lastIndexOf(KEY_DIVIDER)
        const shortId = doc._id.substring(lastDividerPosn + 1)
        this.aid = doc._id
        // account id is made up of 'budget:x' - where x is unique string + ':account:y' - where y is unique string
        // ashortId is y
        this.ashortId = shortId
        this.aname = doc.name
        this.aopen = doc.open
        this.aonBudget = doc.onBudget
        this.aweight = doc.weight
        this.anotes = doc.notes
        this.atxns = []
        this.aactive = doc.active
        this.abud = doc.bud
        // calced in mem and not stored in db
        this.atotal = 0
    }

    asJson()
    {
        return {
                "_id": this.id,
                "type": "acc",
                "bud": this.bud,
                "name": this.name,
                "onBudget": this.onBudget,
                "open": this.open,
                "notes": this.notes,
                "weight": this.weight,
                "active": this.active
        }
    }

    // https://github.com/uuidjs/uuid
    static getNewId(budgetId)
    {
        const uuid = uuidv4()
        return [uuid, SHORT_BUDGET_PREFIX + budgetId + KEY_DIVIDER + ACC_PREFIX + uuid]
    }


    get id() {
        return this.aid;
    }

    get shortId() {
        return this.ashortId;
    }

    get balance() {
        return this.abal;
    }

    get bud() {
        return this.abud;
    }

    set bud(bud) {
        this.abud = bud;
    }

    get name() {
        return this.aname;
    }

    set name(name) {
        this.aname = name;
    }

    get active() {
        return this.aactive;
    }

    set active(active) {
        this.aactive = active;
    }

    get open() {
        return this.aopen;
    }

    set open(open) {
        this.aopen = open;
    }

    get onBudget() {
        return this.aonBudget;
    }

    set onBudget(on) {
        this.aonBudget = on;
    }

    get weight() {
        return this.aweight;
    }

    set weight(weight) {
        this.aweight = weight;
    }

    get notes() {
        return this.anotes;
    }

    set notes(notes) {
        this.anotes = notes;
    }

    get txns() {
        return this.atxns;
    }

    set txns(txns) {
        this.atxns = txns;
    }

    get clearedBalance() {
        return this.getClearBalance(true);
    }

    get unclearedBalance() {
        return this.getClearBalance(false);
    }

    // TODO: round to two dec places
    // TODO: get rid of bal in Account class as we calc it?
    // TODO: rhs will result in clearedBalance and unclearedBalance being called twice - fix it
    // TODO: rhs title does not wok great when screen resized
    get workingBalance() {
        return this.clearedBalance + this.unclearedBalance
    }

    getTxnSumm(displayList) {
        let ids = []
        let tot = 0
        for (const i of displayList) {
            let txn = this.txns[i]
            tot += txn.amount
            ids.push(this.txns[i].id)
        }
        return [ids, tot];
    }

    getTxn(id) {
        let txn = null
        let i
        for (i = 0; i < this.txns.length; i++) {
            let currTxn = this.txns[i]
            if (currTxn.id === id)
            {
                txn = currTxn
                break
            }
        }
        return txn
    }

    applyTxn(txn, result) {
        let found = false
        let i
        for (i = 0; i < this.txns.length; i++) {
            let currTxn = this.txns[i]
            if (currTxn.id === txn.id)
            {
                this.txns[i] = txn
                found = true
                break
            }
        }
        if (result !== null)
            // update in memory revision id so future saves work
            txn.rev = result.rev
        if (!found)
            this.txns.unshift(txn)
    }

    // TODO: I have just added code here to update allAccs in budget - test it and do rest of work on pieces of paper
    static updateActiveAccount = (db, from, to, budgetCont, budget) => {
        db.get(from.id).then(function (doc) {
            let json = from.asJson()
            json._rev = doc._rev
            json.active = false
            return db.put(json);
        }).then(function (response) {
            return db.get(to.id)
        }).then(function (doc) {
            let json = to.asJson()
            json._rev = doc._rev
            json.active = true
            return db.put(json)
        }).then(function(){
            return db.get(this.props.budget.id)
        }).then(function (result) {
            result.allAccs = false
            return db.put(result)
        }).then(function () {
            budgetCont.setState({activeAccount: to, allAccs: false})
        }).catch(function (err) {
            handle_db_error(err, 'Failed to update the active account.', true)
        });
    }

    static getUpdatedPayees(db, budget, txn, exclusionTxnIds) {
        let payees = []
        let filteredPayees = []
        // // get list of all txns including the new one
        // let allTxns = txn !== null && txn.isNew() ? [txn] : []
        let allTxns = []
        for (const acc of budget.accounts) {
            allTxns = allTxns.concat(acc.txns)
        }

        // hold list to work out later on if payee is still used by at least one txn
        for (const payee of budget.payees) {
            // update catSuggest for the payee used for the save txn
            const catSuggest = Account.getNewCatSuggest(txn, payee);
            payees[payee.id] = {id: payee.id, name: payee.name, catSuggest: catSuggest, inUse: false}
        }

        // get list of all txns for this budget and see if payees are still in use and if not then delete
        // from budget payee list
        // how startkey etc work - https://docs.couchdb.org/en/stable/ddocs/views/intro.html#reversed-results
        for (const txn of allTxns) {
            // if txn is not in the exclusion list uses any of the payees then set inUse to true
            const txnInExclusionList = exclusionTxnIds.filter(exId => exId === txn.id).length > 0
            if (!txnInExclusionList && payees.filter(item => item.id === txn.payee).length > 0)
                payees[txn.payee].inUse = true
        }

        // now iterate over payees and get rid of ones that are no longer used
        for (const payee of payees) {
            if (typeof payee !== "undefined" && payee.inUse)
                filteredPayees.push({id: payee.id, name: payee.name, catSuggest: payee.catSuggest})
        }
        return filteredPayees
    }

    static getNewCatSuggest(txn, payee) {
        return txn !== null && txn.catItem !== null && !txn.isPayeeAnAccount() && txn.payee === payee.id ? txn.catItem : payee.catSuggest
    }

    // I struggled to get searching & sorting to work across one to many relationships eg category items
    // so I check how much memory would be taken up by loading all the txn objects into an account
    // and 8K took up 7MB of ram which is acceptable so I decided to stop using mango-queries and to
    // use this approach instead - ie load all txns and store in account, only show x items in v dom at any one time
    // and when sorting I update the full list of txns in account
    static sortTxns(budgetCont, txns) {
        let txnFind = budgetCont.state.txnFind
        let rowdId = txnFind.txnOrder.rowId
        txns = txns.sort(Account.compareTxnsForSort(rowdId, txnFind.txnOrder.dir));
    }

    static compareTxnsForSort(key, order = ASC) {
        return function innerSort(a, b) {
            const varA = (typeof a[key] === 'string')
                ? a[key].toUpperCase() : a[key];
            const varB = (typeof b[key] === 'string')
                ? b[key].toUpperCase() : b[key];
            let comparison = 0;
            if (varA > varB) {
                comparison = 1;
            } else if (varA < varB) {
                comparison = -1;
            }
            return (
                (order === DESC) ? (comparison * -1) : comparison
            );
        };
    }

    // for efficiency I will do the filter in the code to update the v dom so that I only go through the list of txns once
    // let rowdId = txnFind.txnOrder.rowId
    static allowDisplay(row, txnFind) {
        let allow = true
        if (txnFind.search.value != null && txnFind.search.value.length > 0) {
            let searchType = parseInt(txnFind.search.type)
            const vals = Account.getFilterValues(searchType, row, txnFind.search.value)
            const rowVal = vals[0]
            const filterVal = vals[1]
            switch (searchType) {
                // TODO: if filter on date but dont click a date then the filter button is grayed out even though date is
                case PAYEE_TS:
                case CAT_TS:
                case MEMO_TS:
                    if (txnFind.search.exactMatch)
                        allow = rowVal === filterVal
                    else
                        allow = rowVal.includes(filterVal)
                    break
                case DATE_EQUALS_TS:
                case OUT_EQUALS_TS:
                case IN_EQUALS_TS:
                    allow = rowVal === filterVal
                    break
                case OUT_MORE_EQUALS_TS:
                case IN_MORE_EQUALS_TS:
                case DATE_MORE_EQUALS_TS:
                    allow = rowVal >= filterVal
                    break
                case OUT_LESS_EQUALS_TS:
                case IN_LESS_EQUALS_TS:
                case DATE_LESS_EQUALS_TS:
                    allow = rowVal <= filterVal
                    break
                default:
                    break
            }
        }
        return allow
    }

    static getFilterValues(searchType, row, filterValue) {
        let newFilterValue = filterValue
        let rowValue = Account.getTxnRowValue(searchType, row)
        let newRowValue = rowValue
        switch (searchType) {
            case OUT_EQUALS_TS:
            case OUT_MORE_EQUALS_TS:
            case OUT_LESS_EQUALS_TS:
            case IN_EQUALS_TS:
            case IN_MORE_EQUALS_TS:
            case IN_LESS_EQUALS_TS:
                newFilterValue = parseFloat(filterValue)
                newRowValue = parseFloat(rowValue)
                break
            case PAYEE_TS:
            case CAT_TS:
            case MEMO_TS:
                newFilterValue = filterValue.toLowerCase()
                newRowValue = rowValue.toLowerCase()
                break
            case DATE_EQUALS_TS:
            case DATE_MORE_EQUALS_TS:
            case DATE_LESS_EQUALS_TS:
                newFilterValue = new Date(filterValue).getTime()
                newRowValue = rowValue.getTime()
                break
            default:
                break
        }
        return [newRowValue, newFilterValue]
    }

    static getTxnRowValue(searchType, row) {
        let rowValue
        switch (searchType) {
            case OUT_EQUALS_TS:
            case OUT_MORE_EQUALS_TS:
            case OUT_LESS_EQUALS_TS:
                rowValue = row.out
                break
            case IN_EQUALS_TS:
            case IN_MORE_EQUALS_TS:
            case IN_LESS_EQUALS_TS:
                rowValue = row.in
                break
            case PAYEE_TS:
                rowValue = row.payeeName
                break
            case CAT_TS:
                rowValue = row.catItemName
                break
            case MEMO_TS:
                rowValue = row.memo
                break
            case DATE_EQUALS_TS:
            case DATE_MORE_EQUALS_TS:
            case DATE_LESS_EQUALS_TS:
                rowValue = row.date
                break
            default:
                break
        }

        return rowValue
    }

    get total() {
        return this.atotal;
    }

    set total(total) {
        this.atotal = total;
    }

    updateAccountTotal = () => {
        let total = 0;
        for (const txn of this.txns) {
            total += txn.in
            total -= txn.out
        }
        this.total = total
    }

    getClearBalance(cleared) {
        let total = 0
        let i
        let txn
        for (i = 0; i < this.txns.length; i++) {
            txn = this.txns[i]
            if ((cleared && txn.clear) || (!cleared && !txn.clear))
                total += txn.amount
        }
        return total;
    }

    deleteTxns = (db, ids, budget, postFn) => {
        // get a list of json txn objects for deletion
        ACC = this
        POST_FN = postFn
        let delIds = []
        let oppositeAcc = null
        let opposite = null
        let oppositeIds = []

        // get a list of json txns to delete
        for (const id of ids)
        {
            const txn = this.getTxn(id)
            if (txn != null)
            {
                delIds.push(txn.id)
                if (txn.isPayeeAnAccount())
                {
                    // delete opposite txn
                    const txnDetails = budget.getTxn(txn.transfer)
                    opposite = txnDetails[0]
                    if (opposite !== null)
                    {
                        const accId = SHORT_BUDGET_PREFIX + budget.shortId + KEY_DIVIDER + ACC_PREFIX + opposite.acc
                        oppositeAcc = budget.getAccount(accId)
                        oppositeIds.push(opposite.id)
                        delIds.push(opposite.id)
                    }
                }
            }
        }
        const exclusionIds = ids.concat(oppositeIds)
        budget.payees = Account.getUpdatedPayees(db, budget, null, exclusionIds)

        db.get(budget.id).then(function(result){
            budget.rev = result._rev
            const budgetJson = budget.asJson()
            return db.put(budgetJson)
        }).then(function(){
              return Promise.all(delIds.map(function (id) {
            return db.get(id)
          }))
        }).then(function(results){
              return Promise.all(results.map(function (doc) {
              doc._deleted = true;
              return db.put(doc);
          }))
        }).then(function(results){
            // delete txn from in memory list
            ACC.txns = ACC.txns.filter((txn, i) => {
                return !ids.includes(txn.id)
            })
            if (opposite !== null && oppositeAcc !== null)
                // delete opposite from in memory list
                oppositeAcc.txns = oppositeAcc.txns.filter((txn, i) => {
                return !oppositeIds.includes(txn.id)
                })
            // update totals
            budget.updateTotal()
            POST_FN()
        })
            .catch(function (err) {
            handle_db_error(err, 'Failed to delete the transactions.', true)
        });

        // // bulk delete selected txns
        // db.bulkDocs(json).then(function (results) {
        //     validateBulkDocs(results, true)
        //     return db.get(ACC.id)
        // }).then(function (doc) {
        //     // delete txn from in memory list
        //     ACC.txns = ACC.txns.filter((txn, i) => {
        //         return !ids.includes(txn.id)
        //     })
        //     if (opposite !== null && oppositeAcc !== null)
        //         // delete opposite from in memory list
        //         oppositeAcc.txns = oppositeAcc.txns.filter((txn, i) => {
        //         return !oppositeIds.includes(txn.id)
        //         })
        //     // update totals
        //     budget.updateTotal()
        //     POST_FN()
        // }).catch(function (err) {
        //     handle_db_error(err, 'Failed to delete the transactions.', true)
        // });
    }
}