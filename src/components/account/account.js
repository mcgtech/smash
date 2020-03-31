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

    static handleTxnPagin(result, self) {
        if (result.docs.length > 0) {
            self.txnOptions.prevStartkey = self.txnOptions.startkey
            self.txnOptions.startkey = result.docs[result.docs.length - 1].id
            self.txnOptions.skip = 1;
        }
    }
    // https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
    // https://pouchdb.com/guides/async-code.html
    // how to use find: https://pouchdb.com/guides/mango-queries.html, https://www.redcometlabs.com/blog/2015/12/1/a-look-under-the-covers-of-pouchdb-find
    static loadTxns(budgetCont, acc, resetOptions) {
        const db = budgetCont.props.db
        db.createIndex({index: {fields: ["date", "type", "acc"]}, ddoc: 'dateIndex1'}).then(function(x){console.log(x)})
        db.createIndex({index: {fields: ["type", "acc"]}, ddoc: 'xxx'}).then(function(x){console.log(x)})


        budgetCont.setState({loading: true})
        // TODO: maybe have filter field first?
        db.createIndex({index: {fields: ["type", "acc", "out"]}, ddoc: 'outIndex'}).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "in"]}, ddoc: 'inIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "cleared"]}, ddoc: 'clearIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "cat"]}, ddoc: 'catIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "payee"]}, ddoc: 'payeeIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["date", "type", "acc"]}, ddoc: 'dateIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "memo"]}, ddoc: 'memoIndex'})
        })

        let txns = []
        const txnIndex = "txn_index2"; // TODO: make same as initial data load
        // TODO: suss, sorting, filtering & pagination
        // TODO: if filtering perf issue then consider using ids like: _id: 'album_bowie_1971_hunky_dory'
        if (resetOptions)
            budgetCont.txnOptions = { ...budgetCont.txnOptionsDefault }
        budgetCont.txnOptions['selector']['acc'] = acc.id
        // budgetCont.txnOptions['use_index'] = txnIndex

        // TODO: get sorting to work, see (he uses two indces to solve the problem):
        //  https://github.com/pouchdb/pouchdb/issues/6254 & https://cloud.ibm.com/docs/services/Cloudant?topic=cloudant-getting-started-with-cloudant#sort-syntax
        budgetCont.txnOptions['use_index'] = 'dateIndex1'
            // return db.find(budgetCont.txnOptions)
        console.log('a')
        db.find({selector: {type: 'txn', acc: "5", memo: "123"}, use_index: 'memoIndex'
    // ,"sort": ["type", "acc", "memo"]
    //         sort: [{date: 'desc'}, {type: 'desc'}, {acc: 'desc'}]
        }).then(function(results){

        console.log('b')
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
            console.log(err);
        });
    }
}