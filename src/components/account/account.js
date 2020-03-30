import Trans from '../account/trans'

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

    // https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
    // https://pouchdb.com/guides/async-code.html
    static loadTxns(budgetCont, acc, resetOptions) {
        budgetCont.setState({loading: true})
        let txns = []
        const db = budgetCont.props.db
        budgetCont.txnOptions['selector']['acc'] = acc.id
        db.createIndex({index: {fields: ["type", "acc"]}}).then(function(){
            return db.find(budgetCont.txnOptions)
        }).then(function(results){
            budgetCont.handleTxnPagin(results, budgetCont)
            if (resetOptions)
                budgetCont.txnOptions = budgetCont.txnOptionsDefault
            results.docs.forEach(
                function (row) {
                    txns.push(new Trans(row))
                }
            );
            acc.txns = txns
            // set new active account
            budgetCont.setState({activeAccount: acc, loading: false})

        }).catch(console.log.bind(console));
    }

    // https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
    // static loadTxns(budgetCont, acc, resetOptions, updateActiveAccount) {
    //     updateActiveAccount = typeof updateActiveAccount == "undefined" ? false: updateActiveAccount
    //     let txns = []
    //     budgetCont.txnOptions['selector']['acc'] = acc.id
    //     budgetCont.props.db.allDocs(budgetCont.txnOptions, function (err, response) {
    //         if (resetOptions)
    //             budgetCont.txnOptions = budgetCont.txnOptionsDefault
    //         else if (response.rows.length > 0)
    //         {
    //             budgetCont.txnOptions.prevStartkey = budgetCont.txnOptions.startkey;
    //             budgetCont.txnOptions.startkey = response.rows[response.rows.length - 1].id;
    //             budgetCont.txnOptions.skip = 1;
    //         }
    //         // TODO: use total_rows & offset to suss when to show or have active next & prev
    //         // offset simply tells us how many documents were skipped, but total_rows tells us the total
    //         // number of docs in our database
    //         // console.log('total_rows:' + response.total_rows)
    //         // console.log('offset:' + response.offset)
    //         response.rows.forEach(
    //             function (row) {
    //                 txns.push(new Trans(row.doc))
    //             }
    //
    //         );
    //         if (updateActiveAccount)
    //         {
    //             acc.txns = txns
    //             // set new active account
    //             budgetCont.setState({activeAccount: acc})
    //         }
    //     });
    // }

}