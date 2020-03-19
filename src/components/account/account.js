// https://www.w3schools.com/js/js_classes.asp
export default class Account
{
    constructor(doc)
    {
        this.aid = doc._id
        this.aname = doc.name
        this.abal = 0
        this.aopen = doc.open
        this.aonBudget = doc.onBudget
        this.aweight = doc.weight
        this.anotes = doc.notes
        this.aflagged = doc.flagged
        this.atxns = []
        // this.atxns = txns
    }


      get bal() {
        return this.abal;
      }
      get id() {
        return this.aid;
      }
      get balance() {
        return this.bal;
      }
      get name() {
        return this.aname;
      }
      set name(name) {
        this.aname = name;
      }
      get flagged() {
        return this.aflagged;
      }
      set flagged(flagged) {
        this.aflagged = flagged;
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
        this.atxns  = txns;
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
            txn =  this.txns[i]
            if ((cleared && txn.clear) || (!cleared && !txn.clear))
                total +=txn.amount
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
        for (const txn of this.txns)
        {
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
}