import {v4 as uuidv4} from "uuid";
import {KEY_DIVIDER, SHORT_BUDGET_PREFIX, CAT_PREFIX, CAT_ITEM_PREFIX, MONTH_CAT_ITEM_PREFIX} from './keys'
import {getDateIso, getMonthDigit} from "../../utils/date";

// if I use getters and setters then I need to prefix with t otherwise get errors, so avoided here
// using classes as I need to add specific functionality
export default class CatGroup {
    constructor(doc) {
        this.setId(doc._id)
        this.rev = doc._rev
        this.name = doc.name
        this.weight = doc.weight
        this.collapsed = doc.collapsed
        this.items = []
    }

    // TODO: not working
    totalBudgeted(date) {
        // return sum of MonthCatItem.budget for a given month within this group
        let total = 0
        for (const item of this.items)
        {
            const monthItem = item.getMonthItem(date)
            total += parseFloat(monthItem.budget)
        }
        return total
    }

    get shortId() {
        return this.ashortId;
    }

    setId = (id) => {
        this.id = id
        const lastDividerPosn = id.lastIndexOf(KEY_DIVIDER)
        this.ashortId = id.substring(lastDividerPosn + 1)
    }

    // https://github.com/uuidjs/uuid
    static getNewId(shortBudId) {
        return SHORT_BUDGET_PREFIX + shortBudId + KEY_DIVIDER + CAT_PREFIX + uuidv4()
    }

    asJson(incRev) {
        let json = {
            "_id": this.id,
            "type": "cat",
            "name": this.name,
            "weight": this.weight,
            "collapsed": this.collapsed
        }
        if (incRev)
            json["_rev"] = this.rev
        return json
    }

    getCatItem(id)
    {
        let theItem = null
        for (const item of this.items)
        {
            if (item.shortId === id)
            {
                theItem = item
                break
            }
        }
        return theItem
    }
}

export class CatItem {
    constructor(doc) {
        this.setId(doc._id)
        this.rev = doc._rev
        this.name = doc.name
        this.weight = doc.weight
        this.cat = doc.cat
        // array keyed by year and month 'YYYY-MM'
        // only four loaded initially - previous month, this month, next month and following month
        this.monthItems = []
    }

    setId = (id) => {
        this.id = id
        const lastDividerPosn = id.lastIndexOf(KEY_DIVIDER)
        this.ashortId = id.substring(lastDividerPosn + 1)
    }

    asJson(incRev) {
        let json = {
            "_id": this.id,
            "type": "catItem",
            "name": this.name,
            "weight": this.weight,
            "cat": this.cat
        }
        if (incRev)
            json["_rev"] = this.rev
        return json
    }

    get shortId() {
        return this.ashortId;
    }

    get budgeted() {
        return 10
    }

    get balance() {
        return this.budgeted - 0
    }

    // https://github.com/uuidjs/uuid
    static getNewId(shortBudId) {
        return SHORT_BUDGET_PREFIX + shortBudId + KEY_DIVIDER + CAT_ITEM_PREFIX + uuidv4()
    }

    getMonthItem(date) {
        let item = this.monthItems[getDateIso(date)]
        return typeof item === "undefined" ? new MonthCatItem(null, date, this.shortId) : item;
    }
}

export class MonthCatItem {
    constructor(doc, date, catItem) {
        if (doc === null)
        {
            this.id = null
            this.rev = null
            this.catItem = catItem
            this.date = date
            this.abudget = 0.00
            this.overspending = 0.00
            this.notes = ""
        }
        else
        {
            const lastDividerPosn = doc._id.lastIndexOf(KEY_DIVIDER)
            const date = doc._id.substring(lastDividerPosn - 10, lastDividerPosn)
            this.id = doc._id
            this.rev = doc._rev
            this.catItem = doc.catItem
            this.date = new Date(date)
            this.abudget = doc.budget
            this.overspending = doc.overspending
            this.notes = doc.notes
        }
    }

    asJson(incRev) {
        let json = {
            "_id": this.id,
            "type": "monthCatItem",
            "catItem": this.catItem,
            "date": getDateIso(this.date),
            "budget": this.budget,
            "overspending": this.overspending,
            "notes": this.notes
        }
        if (incRev)
            json["_rev"] = this.rev
        return json
    }

    set budget(budget) {
        this.abudget = budget
    }

    get budget() {
        const bud = this.abudget === "" ? 0 : this.abudget
        return parseFloat(bud)
    }

    totalOutflows(budget, date, catItem) {
        return budget.totalOutflows(date, catItem)
    }

    balance(budget, date, catItem, catGroupItem) {
        return budget.monthBalance(date, catItem, catGroupItem)
    }

    get datePart() {
        const bits = this.id.split(KEY_DIVIDER)
        return bits[3]
    }

    // https://github.com/uuidjs/uuid
    // eg: "b:1:monCat:2020-06-01:1"
    static getNewId(shortBudId, date) {
        const monthDigit = getMonthDigit(date)
        const year = date.getFullYear()
        const dateStr = year + '-' + monthDigit + '-01'
        return SHORT_BUDGET_PREFIX + shortBudId + KEY_DIVIDER + MONTH_CAT_ITEM_PREFIX + dateStr + KEY_DIVIDER + uuidv4()
    }
}
