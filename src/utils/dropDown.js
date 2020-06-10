import React, {Component} from 'react'
import './dropDown.css'
import {enterEvent, tabForwardEvent} from "./eventHandlers";

export default class DropDown extends Component {
    ddClassName = 'the_dd'
    state = {options: [], id: null, value: '', showDD: false}

    componentDidMount = () => {
        this.setState({options: this.props.options, id: this.props.id, value: this.props.value})
    }

    componentWillReceiveProps(nextProps)
    {
        let state = {}
        let updateState = false
        // TODO: change to !this.selectionSet()??
        if (nextProps.autoSuggest !== null && this.state.id === '')
        {
            state['id'] = nextProps.autoSuggest.id
            state['value'] = nextProps.autoSuggest.name
            state['showDD'] = true
            updateState = true
        }
        if (nextProps.refreshOptions)
        {
            state['options'] = nextProps.options
            updateState = true
        }
        if (updateState)
            this.setState(state)
    }

    onFocus = (event) => {
        this.displayDropDown(true, event.target)
    }

    displayDropDown = (display, target) => {
        this.setState({showDD: display}, function(){
            if (typeof target !== "undefined")
                target.select()
        })
    }

    getCollapsedItems()
    {
        let items = []
        for (const item of this.props.options)
        {
            if (this.props.grouped)
                items = items.concat(item.items);
            else
                items.push(item)
        }

        return items
    }

    // the user has type something into the search box
    // so we filter the list in the drop down
    // if there are no matches then when saved the entry in the search box
    // will be added to the db as a new entry
    // if user types into search box and not matches found then id will be null and value will be
    // whatever they have typed
    handleSearchChanged = (event) => {
        const search = event.target.value.toLowerCase()
        let itemsToDisplay
        let id = null
        if (this.props.grouped)
        {
            itemsToDisplay = []
            // iterate around the groups
            let matchFound = false
            for (const grpOpt of this.props.options)
            {
                // iterate around the items in each group
                // if an item's name contains the search string then we keep it in the drop down list
                // otherwise it is removed
                let newItems = []
                for (const item of grpOpt.items)
                {
                    if (search.trim() === "")
                    {
                        // clear id and add item to list so that we see full dropdown list
                        id = null
                        newItems.push(item)
                    }
                    else if (item.name.toLowerCase().includes(search))
                    {
                        // item matches so add to list that we will display
                        // set id to be the first match as this will be the one hilited
                        if (!matchFound)
                            id = item.id
                        newItems.push(item)
                        matchFound = true
                    }
                }
                // clone the group and add the filtered list of items to display and then add to itemsToDisplay
                // note: need to clone this as otherwise this.props.options item entries are changed
                let newGrpOpt = {...grpOpt}
                newGrpOpt.items = newItems
                itemsToDisplay.push(newGrpOpt)
            }
        }
        else
        {
            itemsToDisplay = this.props.options.filter((opt, i) => {
                    return opt.name.includes(search)
                })
        }
        // update state
        const state = {options: itemsToDisplay, value: search, id: id}
        this.setState(state, function(){
            // TODO: remove?
            // if user has typed into search box then we need to trigger changed as normally this would be triggered
            // by selection from the list
            // if (this.newPayeeEntered(true))
            //     self.props.changed({id: this.state.id, name: this.state.value})
        })
    }

    onBlur = (event) => {
        // only fire if blur is not result of selection within the drop down
        if (event.relatedTarget == null || event.relatedTarget.className !== this.ddClassName)
            this.displayDropDown(false)
    }

    // if allowAdd
    // hitting enter or tab:
    // if entry exists, eg steve's car and you type steve and hit enter then the matching list entry is selected and
    // focus goes to next
    onKeyDown = (e) => {
        if (enterEvent(e) || tabForwardEvent(e))
        {
            e.target.value = this.state.id
            this.handleDDChanged(e)
        }
    }

    handleDDChanged = (event) => {
        let id = event.target.value
        if (id !== null && id.length === 0)
            id = null
        const opts = this.getCollapsedItems()
        let opt = {id: id, name: this.state.value}
        for (const optItem of opts)
        {
            if (optItem.id === id)
            {
                opt = optItem
                break
            }
        }
        // see onKeyDown for notes on why enterEvent tested here
        if (this.props.allowAdd && !enterEvent(event) && this.searchMatchesNewEntry())
        {
            // we want to add a new entry
            opt.id = null
            opt.name = this.state.value
        }
        this.setState({value: opt.name, showDD: false, id: opt.id}, function(){
            this.props.changed(opt)
        })
    }

    // id is set but they have typed in chars with intent of adding new
    // entry but this new entry name is shorter than existing ones one in list hence id is not null
    // eg typed "steve" and there is an existing entry called "steves car"
    searchMatchesNewEntry = () => {
        const itemMatchingSearchBox = this.getItem(this.state.value)
        return this.selectionIdIsSet() && this.valueIsSet() && itemMatchingSearchBox === null
    }

    selectionIdIsSet() {
        return typeof this.state.id !== "undefined" && this.state.id !== null;
    }

    valueIsSet() {
        return typeof this.state.value !== "undefined" && this.state.value !== null && this.state.value.trim() !== "";
    }

    getItem(value) {
        let theItem = null
        if (typeof value !== "undefined" && value !== null)
        {
            value = value.toLowerCase()
            for (const item of this.getCollapsedItems())
            {
                if (item.name.toLowerCase() === value)
                {
                    theItem = item
                    break
                }
            }
        }

        return theItem
    }

    // have this to handle case when you click on item already hilited in list
    // and yo want the input box to be updated but the handleDDChanged wont fire
    // as nothing has changed
    handleDDClicked = (event) => {
        const val = event.target.value
        if (typeof val !== "undefined")
            this.handleDDChanged(event)
    }

    newEntryEntered = (blanksAllowed) => {
        blanksAllowed = typeof blanksAllowed === "undefined" ? false : blanksAllowed
        return !this.selectionIdIsSet() && (blanksAllowed || this.valueIsSet())
    }

    render() {
        const {hasFocus, tabindex} = this.props
        // TODO: use budget.ccy in Ccy component
        // TODO: do TODOs in other files
        // TODO: only import fontawesome icons required
        // TODO: before doing scheduler work do budget crud
        // TODO: action all todos before starting schedule
        // TODO: re read inotes on react
        // TODO: show db sync status in UI
        // TODO: after add new budget, the first add acc does not appear until I refresh
        // TODO: after add new budget, test adding new acc and then txns without a refresh
        // TODO: test adding budget, acc, txns etc from ui with nothing loaded
        // TODO: test pagination and searching still works
        // TODO: make boxes bigger to see text
        // TODO: use ... in all td fields if too long
        // TODO: when go to edit mode stop row bouncing around
        // TODO: responsive is wonky
        // TODO: show syncing status
        // TODO: test stopping db and ensure still works
        // TODO: add checkbox to cats to allow me to suss what I can spend if reqd - eq weddings I could spend, hol cash I can't
        // TODO: privacy mode that hides sensitive accounts - and updates totals accordingly - so I can demo to people
        // TODO: if right click in acc - show check no - code this like financier?
        // TODO: add help for acc type in add acc?
        // TODO: i18n
        // TODO: go live ensure cors is set on db server
        // TODO: cc - min payment field?
        // TODO: mortgage - mortgage calculator?
        // TODO: do backup/recovery - does it come from local db - only after sync?
        // TODO: in sched what happens if acc closed etc?
        // TODO: do split txns in later release?
        // TODO: npm audit fix
        // TODO: fix all js errors
        return <div className={"ddown"}>
            <input type="text" autoFocus={hasFocus}
                   onChange={this.handleSearchChanged}
                   value={this.props.clear ? '' : this.state.value}
                   onFocus={(event) => this.onFocus(event)}
                   onBlur={(event) => this.onBlur(event)}
                   tabindex={tabindex}
                   className={this.props.classes + (this.props.disabled ? ' disabled' : '')}
                   ref={this.props.fld}
                   disabled={this.props.disabled}
                   onKeyDown={this.onKeyDown}
            />

            {this.state.showDD && !this.newEntryEntered() &&
                <select value={[this.state.id]} defaultValue={[this.state.id]} multiple={true}
                        onChange={this.handleDDChanged} onClick={this.handleDDClicked} className={this.ddClassName}>
                    {this.props.grouped ?
                        this.state.options.map((groupItem) => (
                            <optgroup label={groupItem.groupName}>
                                {groupItem.items.map((item) => (
                                    <option value={item.id}>{item.name}</option>))}
                            </optgroup>
                        ))
                        :
                        this.state.options.map((item) => (
                            <option value={item.id}>{item.name}</option>
                        ))
                    }
                </select>}
            {this.state.showDD && this.newEntryEntered() && this.props.allowAdd &&
                <div className={"dd_will_create"}>{this.props.newEntryName} "{this.state.value}" will be created when you save.</div>}
            {this.state.showDD && this.newEntryEntered() && !this.props.allowAdd &&
                <div className={"dd_will_create"}>No categories matching "{this.state.value}".</div>}
        </div>
    }
}

DropDown.defaultProps = {
    clear: false,
    grouped: false,
    autoSuggest: null,
    allowAdd: false,
    refreshOptions: false,
    newEntryName: ''
}