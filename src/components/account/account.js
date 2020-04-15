import Trans from '../account/trans'
import {
    OUT_EQUALS_TS, OUT_MORE_EQUALS_TS, OUT_LESS_EQUALS_TS, IN_EQUALS_TS, IN_MORE_EQUALS_TS, IN_LESS_EQUALS_TS,
    PAYEE_TS, CAT_TS, MEMO_TS, DATE_EQUALS_TS, DATE_MORE_EQUALS_TS, DATE_LESS_EQUALS_TS, DEF_TXN_FIND_TYPE
} from "../account/details";
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
    // note: I did consider windowing instead of pagination but decided pagin was less complex approach and one less set of libraries - https://github.com/bvaughn/react-virtualized
    // TODO: read https://pouchdb.com/guides/mango-queries.html and implement for pagin on all sorts/filters
    static handleTxnPagin(budgetCont, options, paginType, dir) {
        let reverseResults = false

        // TODO: I got pagin to wotk for default date ordering
        //      now I need to get it working with filters and other fields ordering
        //      use following 3 rows?
        const filtering = budgetCont.state.txnFind.search.value
        const rowData = Account.getSortRow(budgetCont.state.txnFind)
        const rowId = rowData[0]
        const searchType = budgetCont.state.txnFind.search.type


        if ([FIRST_PAGE, PREV_PAGE, NEXT_PAGE, LAST_PAGE].includes(paginType))
        {
            const txns = budgetCont.state.activeAccount.txns
            if (txns.length > 0) {
                // TODO: only show first, next, prev, last that make sense
                // TODO: tidy this fn up
                switch (paginType)
                {
                    // TODO: take into account search & sort
                    // TODO: test having clicked next for example multi times and then sorting or filtering
                    // TODO: test each (and also test with exact off)
                    case FIRST_PAGE:
                        break
                    case NEXT_PAGE:
                        const lastTxn = txns[txns.length - 1]
                        const lastResult = filtering ? lastTxn[rowId] : lastTxn.date.toISOString().substr(0, 10)
                        // this.handleNextPage('date', dir, options, lastResult);
                        this.handleNextPage(rowId, dir, options, lastResult, filtering);
                        break
                    case PREV_PAGE:
                        const firstResult = txns[0].date.toISOString().substr(0, 10)
                        reverseResults = Account.handlePrevPage('date', dir, options, firstResult, reverseResults);
                        break
                    case LAST_PAGE:
                        Account.switchSortFieldDir('date', dir, options);
                        reverseResults = true
                        break
                }
            }
        }
        return reverseResults
    }

    static handleNextPage(field, dir, options, lastResult, filtering) {
        let selector

        // set the pagination boundary selector
        if (dir == 'asc')
            selector = {$gt: lastResult}
        else
            selector = {$lt: lastResult}

        // if we are filtering then include the filter
        // TODO: test with > out where filter is 600 - it doesnt work as the {$gt: 1000, $gte: 600} results in OR
        if (filtering != null)
        {
            // selector = {...selector, ...options.selector[field]}
            // options.selector[field] = {$and: [selector, options.selector[field]]}
            // TODO: fix TypeError: Cannot convert undefined or null to object
            //      if can't fix than look at better way to hand pagination during filtering
            options.selector = {...options.selector, $and: [{[field]: selector}, {[field]: options.selector[field]}]}
            delete(options.selector[field])
        }
        else
            options.selector[field] = selector

        options.limit = options.limit + 2 // TODO: suss why I have to add 2 to limit (otherwise it return 2 less) - https://github.com/pouchdb/pouchdb/issues/7909
    }

    static handlePrevPage(field, dir, options, firstResult, reverseResults) {
        Account.switchSortFieldDir(field, dir, options);
        if (dir == 'desc') {
            options.selector[field] = {$gt: firstResult}
        } else {
            options.selector[field] = {$lt: firstResult}
        }
        options.limit = options.limit + 2 // TODO: suss why I have to add 2 to limit (otherwise it return 2 less) - https://github.com/pouchdb/pouchdb/issues/7909
        reverseResults = true
        return reverseResults;
    }

    static switchSortFieldDir(field, dir, options) {
        let newDir
        if (dir == 'desc')
            newDir = 'asc'
        else
            newDir = 'desc'
        options.sort = [{type: newDir}, {acc: newDir}, {[field]: newDir}]
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
        let reverseResults = false
        let txnFind = budgetCont.state.txnFind
        if (resetOptions)
        {
            txnFind = {...budgetCont.txnFindDefault}
        }
        const findOptions = Account.getFindOptions(budgetCont, txnFind, acc, paginType)
        reverseResults = findOptions[1]
        db.find(findOptions[0]).then(function(results){
            results.docs.forEach(
                function (row) {
                    txns.push(new Trans(row))
                }
            );
            if (reverseResults)
            {
                txns = txns.reverse()
            }
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
        const rowData = Account.getSortRow(txnFind)
        const sortRow = rowData[1]
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
        const reverseResults = Account.handleTxnPagin(budgetCont, options, paginType, dir)
        console.log(options)
        return [options, reverseResults]
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
        let rowdId
        if (txnFind.search.value != null && txnFind.search.value.length > 0) {
            let searchType = parseInt(txnFind.search.type)
            switch (searchType) {
                // TODO: use constants in sortRow assignments
                case OUT_EQUALS_TS:
                    sortRow = 'out'
                    rowdId = sortRow
                    break
                case OUT_MORE_EQUALS_TS:
                    sortRow = 'outMore'
                    rowdId = 'out'
                    break
                case OUT_LESS_EQUALS_TS:
                    sortRow = 'outLess'
                    rowdId = 'out'
                    break
                case IN_EQUALS_TS:
                    sortRow = 'in'
                    rowdId = 'in'
                    break
                case IN_MORE_EQUALS_TS:
                    sortRow = 'inMore'
                    rowdId = 'in'
                    break
                case IN_LESS_EQUALS_TS:
                    sortRow = 'inLess'
                    rowdId = 'in'
                    break
                case PAYEE_TS:
                    sortRow = 'payee'
                    rowdId = 'payee'
                    break
                case CAT_TS:
                    sortRow = 'cat'
                    rowdId = 'cat'
                    break
                case MEMO_TS:
                    sortRow = 'memo'
                    rowdId = 'memo'
                    break
                case DATE_EQUALS_TS:
                    sortRow = 'date'
                    rowdId = 'date'
                    break
                case DATE_MORE_EQUALS_TS:
                    sortRow = 'dateMore'
                    rowdId = 'date'
                    break
                case DATE_LESS_EQUALS_TS:
                    sortRow = 'dateLess'
                    rowdId = 'date'
                    break
                default:
                    sortRow = sortRow
            }
        }
        return [rowdId, sortRow];
    }
}