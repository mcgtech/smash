// if I use getters and setters then I need to prefix with t otherwise get errors, so avoided here
// using classes as I need to add specific functionality
export default class CatGroup {
    constructor(doc) {
        this.id = doc.id
        this.name = doc.name
        this.weight = doc.weight
        this.items = doc.items
    }
    // TODO: remove
    //
    // get id() {
    //     return this.tid
    // }
    //
    // get name() {
    //     return this.tname
    // }
    //
    // get weight() {
    //     return this.tweight
    // }
    //
    // get items() {
    //     return this.titems
    // }
    //
    // set items(items) {
    //     this.titems = items
    // }

}

export class CatItem {
    constructor(doc) {
        this.id = doc.id
        this.name = doc.name
        this.weight = doc.weight
        this.budgeted = doc.budgeted
        this.startdate = doc.startdate
        this.notes = doc.notes
    }

    get balance() {
        return this.budgeted - 0
    }

    // TODO: remove
    //
    // get id() {
    //     return this.tid
    // }
    //
    // get name() {
    //     return this.tname
    // }
    //
    // get weight() {
    //     return this.tweight
    // }
    //
    // get budgeted() {
    //     return this.tbudgeted
    // }
    //
    // get notes() {
    //     return this.tnotes
    // }
}
