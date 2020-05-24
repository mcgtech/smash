import React, {Component} from 'react'
import './dropDown.css'

export default class DropDown extends Component {
    ddClassName = 'the_dd'
    state = {options: [], id: null, value: '', showDD: false}

    componentDidMount = () => {
        this.setState({options: this.props.options, id: this.props.id, value: this.props.value})
    }

    componentWillReceiveProps(nextProps)
    {
        if (nextProps.autoSuggest !== null && this.state.id === '')
            this.setState({id: nextProps.autoSuggest.id, value: nextProps.autoSuggest.name, showDD: true})
    }

    onFocus = (event) => {
        this.displayDropDown(true)
    }

    displayDropDown = (display) => {
        this.setState({showDD: display})
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
    // will be added to the db as a new payee
    // if user types into search box and not matches found then id will be null and value will be
    // whatever they have typed
    handleSearchChanged = (event) => {
        const self = this
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
            // if user has typed into search box then we need to trigger changed as normally this would be triggered
            // by selection from the list
            if (this.newPayeeEntered(true))
                self.props.changed({id: this.state.id, name: this.state.value})
        })
    }

    onBlur = (event) => {
        // only fire if blur is not result of selection within the drop down
        if (event.relatedTarget == null || event.relatedTarget.className !== this.ddClassName)
            this.displayDropDown(false)
    }

    handleDDChanged = (event, id) => {
        id = event === null ? id : event.target.value
        const opts = this.getCollapsedItems()
        let opt
        for (const optItem of opts)
        {
            if (optItem.id === id)
            {
                opt = optItem
                break
            }
        }
        this.setState({value: opt.name, showDD: false, id: id}, function(){
            this.props.changed(opt)
        })
    }

    // have this to handle case when you click on item already hilited in list
    // and yo want the input box to be updated but the handleDDChanged wont fire
    // as nothing has changed
    handleDDClicked = (event) => {
        const val = event.target.value
        if (typeof val !== "undefined")
            this.handleDDChanged(event)
    }

    newPayeeEntered = (blanksAllowed) => {
        blanksAllowed = typeof blanksAllowed === "undefined" ? false : blanksAllowed
        return this.state.id === null && (blanksAllowed || this.state.value.trim() !== '')
    }

    // if they hit enter and its a valid entry in dropdown list then select it
    onKeyDown = (e) => {
        var ENTER_KEY = 13
        if ((e.keyCode === ENTER_KEY || e.which === ENTER_KEY) && !this.newPayeeEntered() && this.state.id !== null)
            this.handleDDChanged(null, this.state.id)
    }

    render() {
        const {hasFocus, tabindex} = this.props
                // TODO:need to handle scenario where id is set but they have typed in chars with intent of adding new
        //      payee but this new payee name is shorter than existing ones one in list hence id is not null
        // eg typed "steve" and there is an existing payee called "steves car"
        // TODO: if I try and add claire as new payee it won't let me - see newPayeeEntered
        // TODO: tons of blank lines in cat drop down
        // TODO: add txn select payee with autocat - its not setting the cat id so validate fails
        // TODO: add txn select payee with autocat - if you tab it doesnt auto fill cat
        // TODO: for add acc need current balance and date of current balance - then create txn
        // TODO: test to see wheta slecting other account types does when adding a new acc
        // TODO: in budget 3 if try and add new txn I get error
        // TODO: in budget 3 add new txn then delete txn (so payees deleted) then add new one then change payee...
        // TODO: have enter handler on memo etc that tabs along - final tab is save - click it - see financier
        // TODO: show cat amt - green or red in cat drop down
        // TODO: if transfer (ie select account from payee) and its to same group: budget or off budget
        //       then no cat otherwise need cat
        // TODO: make boxes bigger to see text
        // TODO: if have empty acc and add txn then date popup does not appear
        // TODO: in off budget accs - txns should not have cat
        // TODO: in generetate dummy data create an account with lots of txns
        // TODO: prevent drag and drop as detailed in docs.txt
        // TODO: in txn use logic detailed on docs.txt
        // TODO: only update budget with new payeeids on txn save if it has changed
        // TODO: when add new or edit don't rebuild each other row?
        // TODO: update docs.txt with logic required for payees and cats
        // TODO: read and code docs.txt
        // TODO: if click on accounts at top of lhs then show all txns for all accounts in budget
        // TODO: second txn on first acc is deleted but still appears in fauxton
        // TODO: do we need a transfer button
        // TODO: what happens if they type in apple for example but dont select it and then hit save - need to ensure it
        //          doesn't add another one
        // TODO: handle setting cat when using existing payee ie remember last cat used for this payee
        // TODO: when payee is account create equal and opposite txn ie a transfer
        // TODO: when delete txn, if it has transfer then delete the opposite txn
        // TODO: update autosuggest
        // TODO: move save account code into the account class
        // TODO: use ... in all td fields if too long
        // TODO: what happens is reopen closed acc with txns?
        // TODO: fix all js errors
        // TODO: set id for budget, acc, txns etc when adding to follow _id naming convention
        // TODO: do we need "acc": x in txn etc?
        // TODO: get insertDummyData() to load up lots of txns into budget 2 also
        // TODO: test stopping db and ensure still works
        // TODO: test adding budget, acc, txns etc from ui with nothing loaded
        // TODO: create a "create dummy txns button"
        // TODO: put selected budget name into meta_title
        // TODO: test pagination and searching still works
        // TODO: how does financier account type logic work?
        // TODO: when click on accounts then show all txns - with additional account column
        // TODO: decide if I am going to do multi categories in categories drop down
        // TODO: when go to edit mode stop row bouncing around
        // TODO: responsive is wonky
        // TODO: fix build errors
        // TODO: on responsive - get burger menu to work
        // TODO: get reposive to work inc burger click
        // TODO: signup to git pages for plugins
        // TODO: only import fontawesome icons required
        // TODO: get icon between txns and schedule to work with new font awesome plug in or use something else - ascii maybe?
        // TODO: before doing scheduler work do budget crud
        // TODO: action all todos before starting schedule
        // TODO: re read inotes on react
        // TODO: on open acc allow entering initial bal which creates a txn
        // TODO: show db sync status in UI
        // TODO: after add new budget, the first add acc does not appear until I refresh
        // TODO: after add new budget, test adding new acc and then txns without a refresh
        // TODO: add checkbox to cats to allow me to suss what I can spend if reqd - eq weddings I could spend, hol cash I can't
        // TODO: privacy mode that hides sensitive accounts - and updates totals accordingly - so I can demo to people
        // TODO: if right click in acc - show check no - code this like financier?
        // TODO: add help for acc type in add acc?
        // TODO: instaed of cats items having usual amt in notes have field for it?
        // TODO: i18n
        // TODO: go live ensure cors is set on db server
        // TODO: cc - min payment field?
        // TODO: mortgage - mortgage calculator?
        // TODO: have deleted section in cats on budget screen
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

            {this.state.showDD && !this.newPayeeEntered() &&
             // {this.state.showDD &&
                <select value={[this.state.id]} defaultValue={[this.state.id]} multiple={true}
                        onChange={this.handleDDChanged} onClick={this.handleDDClicked} className={this.ddClassName}>
                    {/*{this.props.grouped && this.state.id == null ?*/}
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
            {this.state.showDD && this.newPayeeEntered() &&
                <div className={"payee_will_create"}>Payee "{this.state.value}" will be created when you save.</div>}
        </div>
    }
}

DropDown.defaultProps = {
    clear: false,
    grouped: false,
    autoSuggest: null
}