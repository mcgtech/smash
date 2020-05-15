import React, {Component} from 'react'
import './dropDown.css'


export default class DropDown extends Component {
    ddClassName = 'the_dd'
    state = {options: [], id: null, value: '', showDD: false}

    componentDidMount = () => {
        this.setState({options: this.props.options, id: this.props.id, value: this.props.value})
    }

    onFocus = (event) => {
            // TODO: get this to work
            // e.target.select()
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
        const {hasFocus, id} = this.props
        // TODO: sort payee id and catitem id as numerics and save as numerics as we need to treat as ints when add new ones
        // TODO: if add new payee then save if I click on the payee again the new one is not in list until I refresh page
        // TODO: removing it takes a couple of saves
        // TODO: if add new payee then update the txn with another payee and save, old is still in list, until I do
        //       another save and various other things and its also breaking txns, so hammer it
        // TODO: test pagination and searching still works
        // TODO: get cat dd to work
        // TODO: finish code in details.js::saveTxn
        // TODO: if not found then add to payee list when txn added/modified
        // TODO: when typing in one that doesnt exist say xxx will be created in dropdown
        // TODO: what happens if they type in appl for example but dont select it and then hit save - need to ensure it
        //          doesn't add another one
        // TODO: if only one txn uses a payee and its deleted then delete the payee (check all txns in all accs for the budget)
        // TODO: handle setting cat when using existing payee ie remember last cat used for this payee
        // TODO: do cats
        // TODO: handle adding news ones to db ie inside the budget list of payees
        // TODO: when payee is account create equal and opposite txn
        // TODO: when delete txn, if it has trasnfer then delete the opposite txn
        // TODO: update autosuggest
        // TODO: create equal and opposite if txn save is a transfer
        // TODO: in txn delete code deletd transfer if it exists
        // TODO: move save account code into the account class
        // TODO: use ... in all td fields if too long
        // TODO: when select then tab along
        // TODO: fix all js errors
        // TODO: set id for budget, acc, txns etc when adding to follow _id naming convention
        // TODO: do we need "acc": x in txn etc?
        // TODO: get insertDummyData() to load up lots of txns into budget 2 also
        // TODO: test stopping db and ensure still works
        // TODO: test adding budget, acc, txns etc from ui with nothing loaded
        // TODO: create a "create dummy txns button"
        // TODO: put selected budget name into meta_title
        return <div className={"ddown"}>
            <input type="text" autoFocus={hasFocus}
                   onChange={this.handleSearchChanged}
                   value={this.state.value}
                   onFocus={(event) => this.onFocus(event)}
                   onBlur={(event) => this.onBlur(event)}
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
            {this.state.showDD && this.state.id == null &&
                <div className={"payee_will_create"}>Payee "{this.state.value}" will be created when you save.</div>}
        </div>
    }
}

DropDown.defaultProps = {
    grouped: false
}