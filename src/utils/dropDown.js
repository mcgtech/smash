import React, {Component} from 'react'
import './dropDown.css'

export default class DropDown extends Component {
    state = {options: [], searchId: null, searchValue: null}

    componentDidMount = () => {
        this.setState({options: this.props.options, id: this.props.id, value: this.props.value})
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

    handleDDChanged = (event) => {
        const id = event.target.value
        const opts = this.getCollapsedItems()
        const opt = opts.filter((opt, i) => {
                return opt.id.includes(id)
            })[0]
        this.setState({searchValue: opt.name})
    }

    render() {
        console.log(this.state.options)
        const {hasFocus, id} = this.props
        // TODO: hide ddown if lose focus & show when focussed
        // TODO: handle save
        // TODO: handle adding news ones to db ie inside the budget list of payees
        // TODO: get this to work with payees and accounts
        // TODO: if not found then add to payee list when txn added/modified
        return <div class={"ddown"}>
            <input type="text" autoFocus={hasFocus}
                   onChange={this.handleSearchChanged}
                   value={this.state.searchValue}
                   // TODO: get this to work
                   // onBlur={}
                   onFocus={e => e.target.select()}/>
            <select multiple={true} onChange={this.handleDDChanged}>
                {this.props.grouped ?
                    this.state.options.map((groupItem) => (
                        <optgroup label={groupItem.groupName}>
                            {groupItem.items.map((item) => (
                                <option value={item.id} selected={item.id === id}>{item.name}</option>))}
                        </optgroup>
                    ))
                    :
                       this.state.options.map((item) => (
                        <option value={item.id} selected={item.id === id}>{item.name}</option>
                    ))
                }
        </select></div>
    }
}

DropDown.defaultProps = {
    grouped: false
}