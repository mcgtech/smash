import Trans from '../account/trans'
import {OUT_EQUALS_TS, OUT_MORE_EQUALS_TS, OUT_LESS_EQUALS_TS, IN_EQUALS_TS, IN_MORE_EQUALS_TS, IN_LESS_EQUALS_TS,
    ANY_TS, PAYEE_TS, CAT_TS, MEMO_TS, DATE_EQUALS_TS, DATE_MORE_EQUALS_TS, DATE_LESS_EQUALS_TS} from "../account/details";

export default class Account {
    constructor(doc) {
        this.aid = doc._id
        this.aname = doc.name
        this.abal = doc.bal
        this.aopen = doc.open
        this.aonBudget = doc.onBudget
        this.aweight = doc.weight
        this.anotes = doc.notes
        this.atxns = []
    }


    get bal() {
        return this.abal;
    }

    get id() {
        return this.aid;
    }

    get balance() {
        return this.abal;
    }

    get name() {
        return this.aname;
    }

    set name(name) {
        this.aname = name;
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

    getTxnSumm() {
        let ids = []
        let i
        let tot = 0
        for (i = 0; i < this.txns.length; i++) {
            let txn = this.txns[i]
            tot += txn.amount
            ids.push(this.txns[i].id)
        }
        return [ids, tot];
    }

    // TODO: round to two dec places
    // TODO: get rid of bal in Account class as we calc it?
    // TODO: rhs will result in clearedBalance and unclearedBalance being called twice - fix it
    // TODO: rhs title does not wok great when screen resized
    get workingBalance() {
        return this.clearedBalance + this.unclearedBalance
    }

    getAccountTotal = acc => {
        let total = 0;
        for (const txn of this.txns) {
            total += txn.in;
            total -= txn.out;
        }
        return total;
    }

    // TODO: update db
    deleteTxns = ids => {
        this.txns = this.txns.filter((txn, i) => {
            return !ids.includes(txn.id)
        })

    }

    static handleTxnPagin(result, self) {
        if (result.docs.length > 0) {
            self.txnOptions.prevStartkey = self.txnOptions.startkey
            self.txnOptions.startkey = result.docs[result.docs.length - 1].id
            self.txnOptions.skip = 1;
        }
    }
    // https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
    // https://pouchdb.com/guides/async-code.html
    // list of pouchdb-find operators: https://openbase.io/js/pouchdb-find && http://docs.couchdb.org/en/stable/api/database/find.html#find-selectors
    // note: instead of createIndex I can directly: https://pouchdb.com/guides/queries.html
    // how to use find: https://pouchdb.com/guides/mango-queries.html, https://www.redcometlabs.com/blog/2015/12/1/a-look-under-the-covers-of-pouchdb-find
    static loadTxns(budgetCont, acc, resetOptions) {
        const db = budgetCont.props.db
        budgetCont.setState({loading: true})
        // TODO: tidy this fn
        // TODO: enter text in search, filter, delete text - I need to then load txns again! - have reset button?
        // TODO: make index used on initial load use same code/constant as date index same as initial data load
        // TODO: when filtering or sorting ensure each of the paginations alos takes that into account
        // TODO: do filter - search for isRowValid() && filterTxns() to see how it currently works
        // TODO: on first load use same code as for default date order
        // TODO: suss, sorting, filtering & pagination
        // TODO: get select all flags and select all rows to work
        // TODO: get totals at top of txns to work
        // TODO: show no of recs
        // TODO: suss if I always call createIndex or only when each is reqd - but then how do I do initial one to create them?
        // TODO: delete old indexes and dbs in chrome?

        // TODO: need to sort on date
        db.createIndex({index: {fields: ["type", "acc", "out"]}, ddoc: 'outIndex'}).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "in"]}, ddoc: 'inIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "cat"]}, ddoc: 'catIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "payee"]}, ddoc: 'payeeIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "date"]}, ddoc: 'dateIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "memo"]}, ddoc: 'memoIndex'})
        }).then(function(){
            let txns = []
            if (resetOptions)
                budgetCont.txnOptions = { ...budgetCont.txnOptionsDefault }
            budgetCont.txnOptions['selector']['acc'] = acc.id
            // budgetCont.txnOptions['use_index'] = txnIndex
            budgetCont.txnOptions['use_index'] = 'dateIndex'
            db.find(Account.getFindOptions(budgetCont, acc)
            ).then(function(results){
                Account.handleTxnPagin(results, budgetCont)
                results.docs.forEach(
                    function (row) {
                        txns.push(new Trans(row))
                    }
                );
                acc.txns = txns
                // set new active account
                budgetCont.setState({activeAccount: acc, loading: false})

            }).catch(function (err) {
                // TODO: decide best approach for this
                budgetCont.setState({loading: false})
                console.log(err);
            });
            })
    }

    static getFindOptions(budgetCont, acc) {
        const dir = budgetCont.state.txnFind.txnOrder.dir
        const exactMatch = budgetCont.state.txnFind.search.exactMatch
        let searchTarget = budgetCont.state.txnFind.search.value
        // TODO: use txnOptions? - for pagin
        // TODO: reset after clear input or change acc
        let sortRow = Account.getSortRow(budgetCont, searchTarget);
        const limit = 10
        let select = {type: {$eq: "txn"}, acc: {$eq: acc.id}}
        let sort = [{type: dir}, {acc: dir}]
        let index
        // TODO: when change dir then reset the budgetCont.state.txnOrder (use default and remember object cloning)
        switch (sortRow) {
            // TODO: use default value for txnFind
            // TODO: if change acc then reset to to txnFidnDefault

            // TODO: code the date one
            // TODO: hide exact match checkbox
            case 'date':
                index = 'dateIndex'
                select['date'] = {$gte: null}
                sort.push({date: dir})
                break

            // TODO: do 'any'

            case 'payee':
                Account.setFieldSelector('payee', searchTarget, select, exactMatch, index);
                sort.push({payee: dir})
                break
            case 'cat':
                Account.setFieldSelector('cat', searchTarget, select, exactMatch, index);
                sort.push({cat: dir})
                break
            case 'memo':
                Account.setFieldSelector('memo', searchTarget, select, exactMatch, index);
                sort.push({memo: dir})
                break
            // TODO: hide exact match checkbox
            // TODO: only allow floats
            case 'out':
            case 'outMore':
            case 'outLess':
                this.setAmtFieldSelector('out', searchTarget, sortRow, select, index);
                sort.push({out: dir})
                break
            // TODO: hide exact match checkbox
            // TODO: only allow floats
            case 'in':
            case 'inMore':
            case 'inLess':
                index = 'inIndex'
                this.setAmtFieldSelector('in', searchTarget, sortRow, select, index);
                sort.push({in: dir})
                break
        }
        const tempOptions = {
            use_index: index,
            limit: limit,
            selector: select,
            sort: sort
        }
        return tempOptions;
    }

    static setAmtFieldSelector(field, searchTarget, sortRow, select, index) {
        index = field + 'Index'
        searchTarget = parseFloat(searchTarget)
        if (sortRow == field)
            select[field] = {$eq: searchTarget}
        else if (sortRow == field + 'More')
            select[field] = {$gte: searchTarget}
        else
            select[field] = {$lte: searchTarget}
    }

    static getSortRow(budgetCont, searchTarget) {
        let searchType
        let sortRow = budgetCont.state.txnFind.txnOrder.rowId
        if (searchTarget != null && searchTarget.length > 0) {
            searchType = parseInt(budgetCont.state.txnFind.search.type)
            switch (searchType) {
                // TODO: use constants in sortRow assignments
                case OUT_EQUALS_TS:
                    sortRow = 'out'
                    break
                case OUT_MORE_EQUALS_TS:
                    sortRow = 'outMore'
                    break
                case OUT_LESS_EQUALS_TS:
                    sortRow = 'outLess'
                    break
                case IN_EQUALS_TS:
                    sortRow = 'in'
                    break
                case IN_MORE_EQUALS_TS:
                    sortRow = 'inMore'
                    break
                case IN_LESS_EQUALS_TS:
                    sortRow = 'inLess'
                    break
                case ANY_TS:
                    sortRow = 'payee'
                    break
                case PAYEE_TS:
                    sortRow = 'payee'
                    break
                case CAT_TS:
                    sortRow = 'cat'
                    break
                case MEMO_TS:
                    sortRow = 'memo'
                    break
                case DATE_EQUALS_TS:
                case DATE_MORE_EQUALS_TS:
                case DATE_LESS_EQUALS_TS:
                    sortRow = 'date'
                    break
            }
        }
        return sortRow;
    }

    static setFieldSelector(field, searchTarget, select, exactMatch, index) {
        index = field + 'Index'
        if (searchTarget != null)
            select[field] = exactMatch ? {$eq: searchTarget} : {$regex: RegExp(searchTarget, "i")}
        else
            select[field] = {$gte: null}
    }
}