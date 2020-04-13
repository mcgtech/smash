import Trans from '../account/trans'
import {OUT_EQUALS_TS, OUT_MORE_EQUALS_TS, OUT_LESS_EQUALS_TS, IN_EQUALS_TS, IN_MORE_EQUALS_TS, IN_LESS_EQUALS_TS,
    PAYEE_TS, CAT_TS, MEMO_TS, DATE_EQUALS_TS, DATE_MORE_EQUALS_TS, DATE_LESS_EQUALS_TS} from "../account/details";
export const FIRST_PAGE = 0;
export const PREV_PAGE = 1;
export const NEXT_PAGE = 2;
export const LAST_PAGE = 3;

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

    // see https://pouchdb.com/guides/mango-queries.html for pagination or with allDocs: https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
    // in subsequent queries, we tell it to start with the last doc from the previous page, and to skip that one doc
    // TODO: read https://pouchdb.com/guides/mango-queries.html and implement for pagin on all sorts/filters
    static handleTxnPagin(budgetCont, options, paginType) {
        if (paginType == NEXT_PAGE)
        {
            const txns = budgetCont.state.activeAccount.txns
            if (txns.length > 0) {
                const lastTxnDate = txns[txns.length - 1].date
                console.log(lastTxnDate)
                // TODO: use this: txnFind.pagin.prevStartkey = txnFind.pagin.startkey
                // options.startkey = txns[txns.length - 1].id
                // TODO: needs to take into acc the dir
                options.selector.date = {$lt: lastTxnDate}
                // options.skip = 1;
            }
        }
    }

    // https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
    // https://pouchdb.com/guides/async-code.html
    // list of pouchdb-find operators: https://openbase.io/js/pouchdb-find && http://docs.couchdb.org/en/stable/api/database/find.html#find-selectors
    // note: instead of createIndex I can directly: https://pouchdb.com/guides/queries.html
    // how to use find: https://pouchdb.com/guides/mango-queries.html, https://www.redcometlabs.com/blog/2015/12/1/a-look-under-the-covers-of-pouchdb-find
    static loadTxns(budgetCont, acc, resetOptions, paginType) {
        const db = budgetCont.props.db
        budgetCont.setState({loading: true})
        // TODO: code pagination - only enable links if applicable or maybe not show if not required
        // TODO: when click next page or first or last then keep search & sort paramaters
        // TODO: have a show 100, 200, .... dropdown
        // TODO: get totals at top and on lhs to work (need to store running totals anf update them when txn added, deleted, updated)
        // TODO: when filtering or sorting ensure each of the paginations also takes that into account
        // TODO: show no of recs
        // TODO: suss if I always call createIndex or only when each is reqd - but then how do I do initial one to create them?
        // TODO: delete old indexes and dbs in chrome?
        // TODO: what happens if I open in two or more tabs and do updates?
        // TODO: if change acc then reset to to txnFidnDefault
        let txns = []
        let txnFind = budgetCont.state.txnFind
        if (resetOptions)
        {
            txnFind = {...budgetCont.txnFindDefault}
        }
        db.find(Account.getFindOptions(budgetCont, txnFind, acc, paginType)
        ).then(function(results){
            results.docs.forEach(
                function (row) {
                    txns.push(new Trans(row))
                }
            );
            acc.txns = txns
            // set new active account
            budgetCont.setState({activeAccount: acc, loading: false, txnFind: txnFind})

        }).catch(function (err) {
            // TODO: decide best approach for this - set state in budget and in budget check for this state and show error markup?
            budgetCont.setState({loading: false})
            console.log(err);
        });
    }

    static getFindOptions(budgetCont, txnFind, acc, paginType) {
        const limit = 10
        const dir = txnFind.txnOrder.dir
        let sort = [{type: dir}, {acc: dir}]
        const sortRow = Account.getSortRow(txnFind)
        let selector = {...budgetCont.txnSelectDefault}
        selector['acc'] = acc.id
        let index
        switch (sortRow) {
            case 'date':
            case 'dateMore':
            case 'dateLess':
                index = Account.setFieldSelector('date', sortRow, txnFind, selector, sort, dir, false);
                break
            case 'payee':
                index = Account.setTextFieldSelector('payee', txnFind, selector, sort, dir);
                break
            case 'cat':
                index = Account.setTextFieldSelector('cat', txnFind, selector, sort, dir);
                break
            case 'memo':
                index = Account.setTextFieldSelector('memo', txnFind, selector, sort, dir);
                break
            case 'out':
            case 'outMore':
            case 'outLess':
                index = Account.setFieldSelector('out', sortRow, txnFind, selector, sort, dir, true);
                break
            case 'in':
            case 'inMore':
            case 'inLess':
                index = Account.setFieldSelector('in', sortRow, txnFind, selector, sort, dir, true);
                sort.push({in: dir})
                break
            case 'clear':
                index = Account.setFieldSelector('cleared', sortRow, txnFind, selector, sort, dir, true);
                break
            case 'flagged':
                index = Account.setFieldSelector('flagged', sortRow, txnFind, selector, sort, dir, true);
                break
        }
        let options = {
            use_index: index,
            limit: limit,
            selector: selector,
            sort: sort
        }
        Account.handleTxnPagin(budgetCont, options, paginType)
        // if (typeof txnFind.pagin.startkey != 'undefined')
        //     options['startkey'] = txnFind.pagin.startkey
        // if (typeof txnFind.pagin.skip != 'undefined')
        //     options['skip'] = txnFind.pagin.skip
        console.log(options)
        return options
    }

    static setTextFieldSelector(field, txnFind, selector, sort, dir) {
        if (txnFind.search.value != null)
            selector[field] = txnFind.search.exactMatch ? {$eq: txnFind.search.value} : {$regex: RegExp(txnFind.search.value, "i")}
        else
            selector[field] = {$gte: null}
        sort.push({[field]: dir})
        return field + 'Index'
    }

    static setFieldSelector(field, sortRow, txnFind, selector, sort, dir, isFloat) {
        let val = txnFind.search.value
        if (val != null)
        {
            val = isFloat ? parseFloat(val) : val
            if (sortRow == field)
                selector[field] = {$eq: val}
            else if (sortRow == field + 'More')
                selector[field] = {$gte: val}
            else
                selector[field] = {$lte: val}
        }
        else
                selector[field] = {$gte: null}
        sort.push({[field]: dir})
        return field + 'Index'

    }

    static getSortRow(txnFind) {
        let sortRow = txnFind.txnOrder.rowId
        if (txnFind.search.value != null && txnFind.search.value.length > 0) {
            let searchType = parseInt(txnFind.search.type)
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
                    sortRow = 'date'
                    break
                case DATE_MORE_EQUALS_TS:
                    sortRow = 'dateMore'
                    break
                case DATE_LESS_EQUALS_TS:
                    sortRow = 'dateLess'
                    break
                default:
                    sortRow = sortRow
            }
        }
        return sortRow;
    }
}