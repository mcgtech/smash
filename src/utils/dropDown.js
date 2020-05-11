import React, {Component} from 'react'
import * as PropTypes from "prop-types";
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
                items = items.concat(item.payees);
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
                let newPayees = []
                for (const payee of grpOpt.payees)
                {
                    if (search === "" || payee.name.includes(search))
                        newPayees.push(payee)
                }
                // need to do this as otherwise this.props.options payee entries are changed
                let newGrpOpt = {...grpOpt}
                newGrpOpt.payees = newPayees
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
                return opt._id.includes(id)
            })[0]
        this.setState({searchValue: opt.name})
    }

    render() {
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
                            {groupItem.payees.map((payee) => (
                                <option value={payee._id} selected={payee._id === id}>{payee.name}</option>))}
                        </optgroup>
                    ))
                    :
                       this.state.options.map((item) => (
                        <option value={item._id} selected={item._id === id}>{item.name}</option>
                    ))
                }
        </select></div>
    }
}

DropDown.defaultProps = {
    grouped: false
}

DropDown.propTypes = {
    accOptions: PropTypes.any,
    payeeOptions: PropTypes.any
};