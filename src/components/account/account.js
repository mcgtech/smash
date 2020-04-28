import Trans from '../account/trans'
import {
    OUT_EQUALS_TS, OUT_MORE_EQUALS_TS, OUT_LESS_EQUALS_TS, IN_EQUALS_TS, IN_MORE_EQUALS_TS, IN_LESS_EQUALS_TS,
    PAYEE_TS, CAT_TS, MEMO_TS, DATE_EQUALS_TS, DATE_MORE_EQUALS_TS, DATE_LESS_EQUALS_TS
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
        this.aclearbal = doc.clearbal
        this.aunclearbal = doc.unclearbal
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
        return this.aclearbal
        // return this.getClearBalance(true);
    }

    set clearedBalance(bal) {
        this.aclearbal = bal
        // return this.getClearBalance(true);
    }

    get unclearedBalance() {
        return this.aunclearbal
        // return this.getClearBalance(true);
    }

    set unclearedBalance(bal) {
        this.aunclearbal = bal
        // return this.getClearBalance(true);
    }

    // TODO: remove?
    // getClearBalance(cleared) {
    //     let total = 0
    //     let i
    //     let txn
    //     for (i = 0; i < this.txns.length; i++) {
    //         txn = this.txns[i]
    //         if ((cleared && txn.clear) || (!cleared && !txn.clear))
    //             total += txn.amount
    //     }
    //     return total;
    // }

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

    // TODO: remove?
    // see https://pouchdb.com/guides/mango-queries.html for pagination or with allDocs: https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
    // in subsequent queries, we tell it to start with the last doc from the previous page, and to skip that one doc
    // note: I did consider windowing instead of pagination but decided pagin was less complex approach and one less set of libraries - https://github.com/bvaughn/react-virtualized
    // TODO: read https://pouchdb.com/guides/mango-queries.html and implement for pagin on all sorts/filters
    // I would like to implement https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
    // but as startkey does not exist in .find() I will need to use skip
    static handleTxnPagin(budgetCont, options, paginType, dir) {
        let reverseResults = false
        const filtering = budgetCont.state.txnFind.search.value
        const rowData = Account.getSortRow(budgetCont.state.txnFind)
        const rowId = rowData[0]

        if ([FIRST_PAGE, PREV_PAGE, NEXT_PAGE, LAST_PAGE].includes(paginType))
        {
            const txns = budgetCont.state.activeAccount.txns
            if (txns.length > 0) {
                // TODO: pagination will not work if for example its sorting or searchin on date and we have say 100 with same date
                //      so use Smart method (please use!) in https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html

                // TODO: if sort for example on payee (or date or amt) and limit is 10 and there are 50 results with
                //      same value then next etc will not work as it matches on for example $lt: 'xxx'
                // TODO: add date to all the other non date indices and ensure sort still works
                // TODO: payee needs to be saved in lowercase as pouch find sort is based on ascii
                // TODO: if sort on payee for example and then click next it doesnt work
                // TODO: when using filter and try to sort on payee for example it doesnt work
                // TODO: if sort payee why are airbnb not at top?
                // TODO: can I speed up indices? - https://github.com/pouchdb/pouchdb/issues/6275

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
                        // TODO: use index key for pagination!!!!
                        const lastResult = this.getTxnFieldForPagin(filtering, txns[txns.length - 1], rowId);
                        this.handleNextPage(budgetCont, rowId, dir, options, lastResult, filtering);
                        break
                    case PREV_PAGE:
                        // TODO: use index key for pagination!!!!
                        const firstResult = this.getTxnFieldForPagin(filtering, txns[0], rowId);
                        Account.handlePrevPage(budgetCont, rowId, dir, options, firstResult, filtering);
                        // reverseResults = true
                        break
                    case LAST_PAGE:
                        Account.switchSortFieldDir(rowId, dir, options);
                        reverseResults = true
                        break
                    default:
                        break
                }
            }
        }
        return reverseResults
    }

    static getTxnFieldForPagin(filtering, txn, rowId) {
        let val = txn[rowId]
        // TODO: use a constant
        if (rowId === 'date')
            return val.toISOString().substr(0, 10)
        else
            return val
    }

    // https://docs.couchdb.org/en/2.2.0/api/database/find.html#find-selectors
    static handleNextPage(budgetCont, field, dir, options, lastResult, filtering) {
        // TODO: remove?
        // I could just use limit, but as this ges thru all item I use paginSelItem to reduce results
        // let paginSelItem
        // // set the pagination boundary selector
        // if (dir == 'asc')
        //     paginSelItem = {$gt: lastResult}
        // else
        //     paginSelItem = {$lt: lastResult}
        // Account.setPaginSelector(filtering, options, field, paginSelItem)
        // doing it this way as startkey does not exist in .find() so I will need to
        //  use skip) - see https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html - dumb method
        budgetCont.skip += budgetCont.limit
        options.skip = budgetCont.skip
    }

    static handlePrevPage(budgetCont, field, dir, options, firstResult, filtering) {
        // TODO: remove?
        // I could just use limit, but as this ges thru all item I use paginSelItem to reduce results
        // let paginSelItem
        // Account.switchSortFieldDir(field, dir, options);
        // if (dir == 'desc') {
        //     paginSelItem = {$gt: firstResult}
        // } else {
        //     paginSelItem = {$lt: firstResult}
        // }
        // Account.setPaginSelector(filtering, options, field, paginSelItem)
        // doing it this way as startkey does not exist in .find() so I will need to
        //  use skip) - see https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html - dumb method
        budgetCont.skip -= budgetCont.limit
        options.skip = budgetCont.skip
    }

    // TODO: remove?
    // static setPaginSelector(filtering, options, field, paginSelItem) {
    //     // if we are filtering then include the filter
    //     if (filtering != null) {
    //         // we filter based on entry in search box and pagination
    //         const searchBoxSel = {...options.selector}
    //         let paginSel = {...options.selector}
    //         delete (paginSel[field])
    //         options.selector = {$and: [searchBoxSel, {...paginSel, [field]: paginSelItem}]}
    //     } else
    //         // we filter based on pagination only
    //         options.selector[field] = paginSelItem
    //     options.limit = options.limit + 1 // TODO: suss why I have to add to limit (otherwise it return 1 less) - https://github.com/pouchdb/pouchdb/issues/7909
    // }

    static switchSortFieldDir(field, dir, options) {
        let newDir
        // TODO: use constant
        if (dir === 'desc')
            newDir = 'asc'
        else
            newDir = 'desc'
        options.sort = [{type: newDir}, {acc: newDir}, {[field]: newDir}]
    }

    // I struggled to get searching & sorting to work across one to many relationships eg category items
    // so I check how much memory would be taken up by loading all the txn objects into an account
    // and 8K took up 7MB of ram which is acceptable so I decided to stop using mango-queries and to
    // use this approach instead - ie load all txns and store in account, only show x items in v dom at any one time
    // and when sorting I update the full list of txns in account
    static sortTxns(budgetCont, acc) {
        budgetCont.setState({loading: true})
        const db = budgetCont.props.db
        let txnFind = budgetCont.state.txnFind
        // sort the account's txns
        let rowdId = txnFind.txnOrder.rowId
        acc.txns = acc.txns.sort(Account.compareTxnsForSort(rowdId, txnFind.txnOrder.dir));
        // set new active account
        budgetCont.setState({activeAccount: acc, loading: false})
    }

    // for efficiency I will do the filter in the code to update the v dom so that I only go through the list of txns once
    // let rowdId = txnFind.txnOrder.rowId
    static allowDisplay(row, txnFind) {
        // budgetCont.setState({loading: true})
        // const db = budgetCont.props.db
        // const rowData = Account.getSortRow(txnFind)
        // const sortRow = rowData[1]
        // if (resetOptions)
        // {
        //     txnFind = {...budgetCont.txnFindDefault}
        // }
        // TODO: either add a field to each row: valid and then filter on this in details.js or do the filtering in details.js
        let allow = true
        if (txnFind.search.value != null && txnFind.search.value.length > 0) {
            let val = txnFind.search.value
            let searchType = parseInt(txnFind.search.type)
            switch (searchType) {
                // TODO: code all of these (take into acc exact and use floats for amounts)
                // TODO: pagination
                // TODO: test all of the sorts
                // TODO: use constants in sortRow assignments or use the ids eg OUT_EQUALS_TS
                case OUT_EQUALS_TS:
                    break
                case OUT_MORE_EQUALS_TS:
                    break
                case OUT_LESS_EQUALS_TS:
                    break
                case IN_EQUALS_TS:
                    break
                case IN_MORE_EQUALS_TS:
                    break
                case IN_LESS_EQUALS_TS:
                    break
                case PAYEE_TS:
                    break
                case CAT_TS:
                    break
                case MEMO_TS:
                    allow = row.memo.toLowerCase() == val.toLowerCase()
                    break
                case DATE_EQUALS_TS:
                    break
                case DATE_MORE_EQUALS_TS:
                    break
                case DATE_LESS_EQUALS_TS:
                    break
                default:
                    break
            }
        }
        // TODO: code pagination, sorting & searching
        // TODO: remove all old way of doing things createIndex etc, state object in Budget etc
        // set new active account
        // budgetCont.setState({activeAccount: acc, loading: false, txnFind: txnFind})

        return allow
    }

    static compareTxnsForSort(key, order = 'asc') {
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
                (order === 'desc') ? (comparison * -1) : comparison
            );
        };
    }


    static loadTxns(budgetCont, acc, resetOptions) {
        const db = budgetCont.props.db
        budgetCont.setState({loading: true})
        // TODO: switch to allDocs where id contains type, acc id and date (what happens if date is changed?)
        //       initial sort is by date
        let txns = []
        // let reverseResults = false
        let txnFind = budgetCont.state.txnFind
        if (resetOptions)
        {
            txnFind = {...budgetCont.txnFindDefault}
        }

        // TODO: remove all the createIndex calls (and clear out in browser and db)
        // TODO: remove as we only need inital sort by date - this could be done using allDocs
        //       where id contains type, acc id and date (what happens if date is changed)
        let options = {use_index: "dateIndex", selector: {type: "txn", acc: acc.id, date: {$gte: null}}, sort: [{type: "desc"}, {acc: "desc"}, {date: "desc"}]}
        // let findOptions = Account.getFindOptions(budgetCont, txnFind, acc, paginType)
        // let options = findOptions[0]
        // reverseResults = false

        // TODO: if I end up using map reduce for index then look at pagination approach in
        //       http://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
        db.find(options).then(function(results){
            results.docs.forEach(
                function (row) {
                    txns.push(new Trans(row))
                }
            );
            // if (reverseResults)
            // {
            //     txns = txns.reverse()
            // }
            acc.txns = txns
            // set new active account
            budgetCont.setState({activeAccount: acc, loading: false, txnFind: txnFind})

        }).catch(function (err) {
            // TODO: decide best approach for this - set state in budget and in budget check for this state and show error markup?
            budgetCont.setState({loading: false})
            console.log(err);
        });
    }

    // TODO: remove?
    // Note: mango doesn't support mixed sorting
    static getFindOptions(budgetCont, txnFind, acc, paginType) {
        // const limit = budgetCont.limit
        const dir = txnFind.txnOrder.dir
        let sort = [{type: dir}, {acc: dir}] // these dont matter but if they don't match dir then the sorting column does not work!
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
                break
            case 'clear':
                index = Account.setFieldSelector('cleared', sortRow, txnFind, selector, sort, dir, true);
                break
            case 'flagged':
                index = Account.setFieldSelector('flagged', sortRow, txnFind, selector, sort, dir, true);
                break
            default:
                break
        }

        let options = {
            use_index: index,
            // limit: limit,
            selector: selector,
            sort: sort
        }
        const reverseResults = Account.handleTxnPagin(budgetCont, options, paginType, dir)
        console.log(options)
        return [options, reverseResults]
    }
    // TODO: remove?
    // Note: mango doesn't support mixed sorting
    // static getFindOptions(budgetCont, txnFind, acc, paginType) {
    //     // const limit = budgetCont.limit
    //     const limit = 10000
    //     const dir = txnFind.txnOrder.dir
    //     let sort = [{type: dir}, {acc: dir}] // these dont matter but if they don't match dir then the sorting column does not work!
    //     const rowData = Account.getSortRow(txnFind)
    //     const sortRow = rowData[1]
    //     let selector = {...budgetCont.txnSelectDefault}
    //     selector['acc'] = acc.id
    //     let index
    //     switch (sortRow) {
    //         case 'date':
    //         case 'dateMore':
    //         case 'dateLess':
    //             index = Account.setFieldSelector('date', sortRow, txnFind, selector, sort, dir, false);
    //             break
    //         case 'payee':
    //             index = Account.setTextFieldSelector('payee', txnFind, selector, sort, dir);
    //             break
    //         case 'cat':
    //             index = Account.setTextFieldSelector('cat', txnFind, selector, sort, dir);
    //             break
    //         case 'memo':
    //             index = Account.setTextFieldSelector('memo', txnFind, selector, sort, dir);
    //             break
    //         case 'out':
    //         case 'outMore':
    //         case 'outLess':
    //             index = Account.setFieldSelector('out', sortRow, txnFind, selector, sort, dir, true);
    //             break
    //         case 'in':
    //         case 'inMore':
    //         case 'inLess':
    //             index = Account.setFieldSelector('in', sortRow, txnFind, selector, sort, dir, true);
    //             break
    //         case 'clear':
    //             index = Account.setFieldSelector('cleared', sortRow, txnFind, selector, sort, dir, true);
    //             break
    //         case 'flagged':
    //             index = Account.setFieldSelector('flagged', sortRow, txnFind, selector, sort, dir, true);
    //             break
    //         default:
    //             break
    //     }
    //
    //     let options = {
    //         use_index: index,
    //         // limit: limit,
    //         selector: selector,
    //         sort: sort
    //     }
    //     const reverseResults = Account.handleTxnPagin(budgetCont, options, paginType, dir)
    //     console.log(options)
    //     return [options, reverseResults]
    // }


        // TODO: remove this?
    static createDummyMapReduce(db) {
        var idx = 'idx1'
//     var ddoc = {
//   _id: '_design/' + idx,
//   views: {
//     index: {
//       map: function mapFun(doc) {
//         if (doc.type) {
//           emit(doc.type);
//         }
//       }.toString()
//     }
//   }
// }
        var ddoc = {
            _id: '_design/index_1',
            views: {
                index: {
                    map: "function (doc) { if (doc.type) { emit(doc.type); } }"
                }
            }
        }

        db.put(ddoc).catch(function (err) {
            console.log('a')
            if (err.name !== 'conflict') {
                console.log('not an error!!!!')
                throw err;
            }
            // ignore if doc already exists
        }).then(function () {
            // find docs where title === 'Lisa Says'
            return db.query('index', {
                key: 'txn',
                include_docs: true
            });
        }).then(function (result) {
            console.log(result.rows)
            // handle result
        }).catch(function (err) {
            console.log(err);
        });
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
            if (sortRow === field)
                selector[field] = {$eq: val}
            else if (sortRow === field + 'More')
                selector[field] = {$gte: val}
            else
                selector[field] = {$lte: val}
        }
        else
                selector[field] = {$gte: null}
        sort.push({[field]: dir})
        return field + 'Index'

    }

    // TODO: do this better
    static getSortRow(txnFind) {
        let sortRow = txnFind.txnOrder.rowId
        let rowdId = txnFind.txnOrder.rowId
        if (txnFind.search.value != null && txnFind.search.value.length > 0) {
            let searchType = parseInt(txnFind.search.type)
            switch (searchType) {
                // TODO: use constants in sortRow assignments or use the ids eg OUT_EQUALS_TS
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
                    break
            }
        }
        return [rowdId, sortRow];
    }
}