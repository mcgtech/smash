import {v4 as uuidv4} from "uuid";
import {KEY_DIVIDER, SHORT_BUDGET_PREFIX, CAT_PREFIX, CAT_ITEM_PREFIX, MONTH_CAT_ITEM_PREFIX} from './keys'

// if I use getters and setters then I need to prefix with t otherwise get errors, so avoided here
// using classes as I need to add specific functionality
export default class CatGroup {
    constructor(doc) {
        this.id = doc.id
        this.name = doc.name
        this.weight = doc.weight
        this.items = doc.items
    }

    // https://github.com/uuidjs/uuid
    static getNewId(shortBudId) {
        return SHORT_BUDGET_PREFIX + shortBudId + KEY_DIVIDER + CAT_PREFIX + uuidv4()
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
        // array keyed by year and month 'YYYY-MM'
        // only four loaded initially - previous mont, this month, next month and following month
        this.monthItems = []
    }

    get balance() {
        return this.budgeted - 0
    }

    // https://github.com/uuidjs/uuid
    static getNewId(shortBudId) {
        return SHORT_BUDGET_PREFIX + shortBudId + KEY_DIVIDER + CAT_ITEM_PREFIX + uuidv4()
    }

    getMonthItems(key) {
        let items = this.monthItems[key]
        if (typeof items === "undefined")
        {
            // TODO: code this
            // get items, add to list and return
        }
        return items
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

export class MonthCatItem {
    constructor(doc) {
        const lastDividerPosn = doc._id.lastIndexOf(KEY_DIVIDER)
        const date = doc._id.substring(lastDividerPosn + 1)
        this.id = doc.id
        this.date = new Date(date)
        this.budget = doc.budget
        this.overspending = doc.overspending
        this.notes = doc.notes
    }

    // https://github.com/uuidjs/uuid
    // eg: "b:1:monCat:2020-06-01:1"
    static getNewId(shortBudId, date) {
        // TODO: move to utils as used elsewhere
        const monthDigit = ("0" + (date.getMonth() + 1)).slice(-2)
        const year = date.getFullYear()
        const dateStr = year + '-' + monthDigit + '-01'
        return SHORT_BUDGET_PREFIX + shortBudId + KEY_DIVIDER + MONTH_CAT_ITEM_PREFIX + dateStr + KEY_DIVIDER + uuidv4()
    }
}
