import Trans from '../account/trans'
import {
    OUT_EQUALS_TS, OUT_MORE_EQUALS_TS, OUT_LESS_EQUALS_TS, IN_EQUALS_TS, IN_MORE_EQUALS_TS, IN_LESS_EQUALS_TS,
    PAYEE_TS, CAT_TS, MEMO_TS, DATE_EQUALS_TS, DATE_MORE_EQUALS_TS, DATE_LESS_EQUALS_TS
} from "../account/details";
import {KEY_DIVIDER, ACC_PREFIX, TXN_PREFIX} from './keys'
import {ASC, DESC} from './sort'

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
        this.atotal = doc.total
        this.aactive = doc.active
        this.abud = doc.bud
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
                "active": this.active,
                "total": this.total
        }
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

    get total() {
        return this.atotal;
    }

    set total(total) {
        this.atotal = total;
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

    // TODO: round to two dec places
    // TODO: get rid of bal in Account class as we calc it?
    // TODO: rhs will result in clearedBalance and unclearedBalance being called twice - fix it
    // TODO: rhs title does not wok great when screen resized
    get workingBalance() {
        return this.clearedBalance + this.unclearedBalance
    }

    getAccountTotal = () => {
        let total = 0;
        for (const txn of this.txns) {
            total += txn.in;
            total -= txn.out;
        }
        return total;
    }

    // TODO: tidy up
    // TODO: check that save acc doesn not overwrite things like active
    static updateActiveAccount = (db, from, to, postFn) => {
        db.get(from.id).then(function (doc) {
            let json = from.asJson()
            json._rev = doc._rev
            json.active = false
            return db.put(json);
        }).then(function (response) {
            db.get(to.id).then(function (doc) {
            let json = to.asJson()
            json._rev = doc._rev
            json.active = true
            return db.put(json);
        })
        }).catch(function (err) {
            console.log(err);
        });
    }

    // TODO: prevent txn having in and out
    deleteTxns = (db, ids, postFn) => {
        // get a list of json txn objects for deletion
        ACC = this
        POST_FN = postFn
        let jsonTxnsForDelete = []
        let total = ACC.total
        for (const id of ids)
        {
            const txn = this.getTxn(id)
            if (txn != null)
            {
                console.log(txn)
                if (txn.out > 0)
                    total += txn.out
                else
                    total -= txn.in
                jsonTxnsForDelete.push({_id: txn.id, _rev: txn.rev, _deleted: true})
            }
        }

        // bulk delete selected txns
        // TODO: whenever I am accessing the db, showing loading
        db.bulkDocs(jsonTxnsForDelete).then(function (result) {
            return db.get(ACC.id)
        }).then(function (doc) {
            // update account total
            let json = ACC.asJson()
            json._id = doc._id
            json._rev = doc._rev
            json.total = total
            ACC.total = total
            return db.put(json);
        }).then(function () {
            // delete from in memory list
            ACC.txns = ACC.txns.filter((txn, i) => {
                return !ids.includes(txn.id)
            })
            POST_FN()
        }).catch(function (err) {
            console.log(err);
        });
    }

    // I struggled to get searching & sorting to work across one to many relationships eg category items
    // so I check how much memory would be taken up by loading all the txn objects into an account
    // and 8K took up 7MB of ram which is acceptable so I decided to stop using mango-queries and to
    // use this approach instead - ie load all txns and store in account, only show x items in v dom at any one time
    // and when sorting I update the full list of txns in account
    static sortTxns(budgetCont, acc) {
        let txnFind = budgetCont.state.txnFind
        let rowdId = txnFind.txnOrder.rowId
        acc.txns = acc.txns.sort(Account.compareTxnsForSort(rowdId, txnFind.txnOrder.dir));
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
                    // shown in search box
                // TODO: code all of these (take into acc exact and use floats for amounts)
                // TODO: pagination
                // TODO: test all of the sorts
                // TODO: use constants in sortRow assignments or use the ids eg OUT_EQUALS_TS
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
    static loadTxns(budgetCont, budget, acc, defRowId, defDir) {
        const db = budgetCont.props.db
        budgetCont.setState({loading: true})
        let txns = []
        // maybe put into a helper fn for generating keys?
        const key = ACC_PREFIX + acc.shortId + KEY_DIVIDER + TXN_PREFIX
        let state = {activeAccount: acc, loading: false}
        db.allDocs({startkey: key, endkey: key + '\uffff', include_docs: true}).then(function(results){
            results.rows.forEach(
                function (row) {
                    const doc = row.doc
                    // TODO: do I need to store type inside cat and catitems?
                    var catItem = budget.getCatItem(doc.catItem)
                    var payeeItem = budget.getPayee(doc.payee)
                    let txn = new Trans(doc)
                    // store actual name to ease sorting and searching and make code easier to understand
                    // however this duplicates the name across all in memory txns, increasing mem size
                    txn.catItemName = typeof catItem != 'undefined' ? catItem.name : ''
                    txn.payeeName = typeof payeeItem != 'undefined' ? payeeItem.name : ''
                    txns.push(txn)
                }
            );
            // set default order
            txns = txns.sort(Account.compareTxnsForSort(defRowId, defDir));
            acc.txns = txns
            budgetCont.setState(state)

        }).catch(function (err) {
            // TODO: decide best approach for this - set state in budget and in budget check for this state and show error markup?
            budgetCont.setState({loading: false})
            console.log(err);
        });
    }
}