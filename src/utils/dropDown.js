import React, {Component} from 'react'
import './dropDown.css'


export default class DropDown extends Component {
    ddClassName = 'the_dd'
    state = {options: [], selectedId: this.props.id, searchValue: '', showDD: true}

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
        const search = event.target.value
        let newOptions
        if (this.props.grouped)
        {
            newOptions = []
            for (const grpOpt of this.props.options)
            {
                let newItems = []
                for (const item of grpOpt.items)
                {
                    if (search === "" || item.name.includes(search))
                        newItems.push(item)
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
        this.setState({options: newOptions, searchValue: search})
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
        this.setState({searchValue: opt.name, showDD: false, selectedId: id})
    }

    render() {
        const {hasFocus, id} = this.props
        // TODO: when select then tab along
        // TODO: handle save
        // TODO: handle adding news ones to db ie inside the budget list of payees
        // TODO: get this to work with payees and accounts
        // TODO: if not found then add to payee list when txn added/modified
        // TODO: fix all js errors
        return <div className={"ddown"}>
            <input type="text" autoFocus={hasFocus}
                   onChange={this.handleSearchChanged}
                   value={this.state.searchValue}
                   onFocus={(event) => this.onFocus(event)}
                   onBlur={(event) => this.onBlur(event)}
            />
            {this.state.showDD &&
            <select value={[this.state.selectedId]} defaultValue={[this.state.selectedId]} multiple={true}
                    onChange={this.handleDDChanged} className={this.ddClassName}>
                {this.props.grouped ?
                    this.state.options.map((groupItem) => (
                        <optgroup label={groupItem.groupName}>
                            {groupItem.items.map((item) => (
                                <option value={item.id}>{item.name}</option>))}
                        </optgroup>
                    ))
                    :
                    this.state.options.map((item) => (
                        <option value={item.id} selected={item.id === id}>{item.name}</option>
                    ))
                }
            </select>}
        </div>
    }
}

DropDown.defaultProps = {
    grouped: false
}