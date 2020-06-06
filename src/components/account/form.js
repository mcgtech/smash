// https://reactstrap.github.io/components/modals/
// https://www.robinwieruch.de/react-usestate-hook
// https://www.taniarascia.com/getting-started-with-react/#submitting-form-data
import {Button, Modal, ModalBody, ModalFooter, ModalHeader} from "reactstrap";
import React, {Component} from 'react'
import confirm from "reactstrap-confirm";

class AccForm extends Component {
    constructor(props) {
        super(props)

        this.initialState = {
            id: null,
            budgetState: 'on',
            name: null,
            notes: null,
            open: true,
            acc: null
        }

        this.state = this.initialState
    }

    componentWillReceiveProps(nextProps) {
        const {acc} = nextProps
        if (acc != null)
            // TODO: why am I using this?
            this.setState({name: acc.name, notes: acc.notes, acc: acc, budgetState: acc.onBudget ? 'on' : 'off', open: acc.open})
    }

    handleChange = event => {
        const {name, value} = event.target
        this.setState({[name]: value,})
    }

    closeForm = (event, toggleAccForm) => {
        this.setState(this.initialState)
        toggleAccForm(event)
    }

    closeAccount = (event, toggleAccForm, setAccDragDetails) => {
        setAccDragDetails(this.state.acc, false, null, null)
        this.closeForm(event, toggleAccForm)
    }

    deleteAccount = (event, toggleAccForm, handleDeleteAccount) => {
        const acc = this.state.acc
        const closeForm = this.closeForm
        setTimeout(async function () {
            let result = await confirm()
            if (result)
            {
                handleDeleteAccount(acc);
                closeForm(event, toggleAccForm)
            }
        }, 10);
    }

    reopenAccount = (event, toggleAccForm, setAccDragDetails) => {
        setAccDragDetails(this.state.acc, true, null, null)
        this.closeForm(event, toggleAccForm)
    }

    saveForm = (event, toggleAccForm, handleSaveAccount) => {
        handleSaveAccount(this.state, this.props.budget)
        this.closeForm(event, toggleAccForm)
    }

    render() {
        const {name, notes, acc, budgetState} = this.state
        const {open, toggleAccForm, setAccDragDetails, handleSaveAccount, handleDeleteAccount} = this.props
        const closeAccClass = acc == null ? 'd-none' : ''
        const deleteAccClass = acc == null ? 'd-none' : ''
        const titlePrefix = acc == null ? 'New' : ''
        return (
            <div>
                <Modal isOpen={open}>
                    <ModalHeader>{titlePrefix} Account Details</ModalHeader>
                    <ModalBody>
                        <input type='text' name={'name'} value={name} className={'form-control'}
                               placeholder={'account name'} onChange={this.handleChange} onChange={this.handleChange}/>
                        {/* adding a new account */}
                        {acc === null &&
                            <select name={'budgetState'} className={"form-control"} value={budgetState} onChange={this.handleChange}>
                                <option value="on">On Budget</option>
                                <option value="off">Off Budget</option>
                                <option></option>
                            </select>
                        }
                        <textarea rows='10' name={'notes'} value={notes} className={'form-control'} placeholder={'notes'}
                                  onChange={this.handleChange}/>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="btn prim_btn" onClick={(e) => {
                            this.saveForm(e, toggleAccForm, handleSaveAccount)
                        }}>Save</Button>
                        <Button color="secondary" onClick={(e) => {
                            this.closeForm(e, toggleAccForm)
                        }}>Close</Button>
                        {this.state.open && <Button color="danger" className={closeAccClass} onClick={(e) => {
                            this.closeAccount(e, toggleAccForm, setAccDragDetails)
                        }}>Close Account</Button>}
                        {!this.state.open && <Button color="success" className={closeAccClass} onClick={(e) => {
                            this.reopenAccount(e, toggleAccForm, setAccDragDetails)
                        }}>Re-open Account</Button>}
                        {!this.state.open && <Button color="danger" className={deleteAccClass} onClick={(e) => {
                            this.deleteAccount(e, toggleAccForm, handleDeleteAccount)
                        }}>Delete Account</Button>}
                    </ModalFooter>
                </Modal>
            </div>
        );
    }
}

export default AccForm