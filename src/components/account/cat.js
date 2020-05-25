export default class CatGroup {
    constructor(doc) {
        this.tid = doc.id
        this.tname = doc.name
        this.tweight = doc.weight
        this.titems = doc.items
    }

    get id() {
        return this.tid
    }

    get name() {
        return this.tname
    }

    get weight() {
        return this.tweight
    }

    get items() {
        return this.titems
    }

}

export class CatItem {
    constructor(doc) {
        this.tid = doc.id
        this.tname = doc.name
        this.tweight = doc.weight
        this.tbudgeted = doc.budgeted
        this.tstartdate = doc.startdate
        this.tnotes = doc.notes
    }

    get id() {
        return this.tid
    }

    get name() {
        return this.tname
    }

    get weight() {
        return this.tweight
    }

    get budgeted() {
        return this.tbudgeted
    }

    get notes() {
        return this.tnotes
    }
}
