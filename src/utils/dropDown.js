import React, {Component} from 'react'
import './dropDown.css'


export default class DropDown extends Component {
    ddClassName = 'the_dd'
    state = {options: [], id: '', value: '', showDD: false}

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

    handleSearchChanged = (event) => {
        const self = this
        const search = event.target.value.toLowerCase()
        let newOptions
        let id = null
        if (this.props.grouped)
        {
            newOptions = []
            for (const grpOpt of this.props.options)
            {
                let newItems = []
                for (const item of grpOpt.items)
                {
                    if (search === "" || item.name.toLowerCase().includes(search))
                    {
                        if (id === null)
                            id = item.id
                        newItems.push(item)
                    }
                }
                // need to do this as otherwise this.props.options item entries are changed
                let newGrpOpt = {...grpOpt}
                newGrpOpt.items = newItems
                newOptions.push(newGrpOpt)
            }
        }
        else
        {
            newOptions = this.props.options.filter((opt, i) => {
                    return opt.name.includes(search)
                })
        }
        this.setState({options: newOptions, value: search, id: id}, function(){
            // if user has typed into search box then we need to trigger changed
            if (id == null)
                self.props.changed({id: this.state.id, name: this.state.value})
        })
    }

    onBlur = (event) => {
        // only fire if blur is not result of selection within the drop down
        if (event.relatedTarget == null || event.relatedTarget.className !== this.ddClassName)
            this.displayDropDown(false)
    }

    handleDDChanged = (event) => {
        const id = event.target.value
        const opts = this.getCollapsedItems()
        const opt = opts.filter((opt, i) => {
                return opt.id.includes(id)
            })[0]
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

    render() {
        const {hasFocus, tabindex} = this.props
        // TODO: in txn add don't enable save until all appropriate fields are filled in
        // TODO: in off budget accs - txns should not have cat
        // TODO: prevent drag and drop as detailed in docs.txt
        // TODO: in txn use logic detailed on docs.txt
        // TODO: only update budget with new payeeids on txn save if it has changed
        // TODO: when add new or edit don't rebuild each other row?
        // TODO: update docs.txt with logic required for payees and cats
        // TODO: read and code docs.txt
        // TODO: if transfer (ie select account from payee) and its to same group: budget or off budget
        //       then no cat otherwise need cat
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
        // TODO: action all todos before starting schedule
        // TODO: i18n
        return <div className={"ddown"}>
            <input type="text" autoFocus={hasFocus}
                   onChange={this.handleSearchChanged}
                   value={this.state.value}
                   onFocus={(event) => this.onFocus(event)}
                   onBlur={(event) => this.onBlur(event)}
                   tabindex={tabindex}
                   className={this.props.classes}
                   ref={this.props.fld}
            />
            {this.state.showDD && this.state.id !== null &&
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
            {this.state.showDD && this.state.id == null && this.state.value.trim() !== '' &&
                <div className={"payee_will_create"}>Payee "{this.state.value}" will be created when you save.</div>}
        </div>
    }
}

DropDown.defaultProps = {
    grouped: false,
    autoSuggest: null
}