// https://reactstrap.github.io/components/modals/
// https://www.robinwieruch.de/react-usestate-hook
// https://www.taniarascia.com/getting-started-with-react/#submitting-form-data
import {Button, Modal, ModalBody, ModalFooter, ModalHeader} from "reactstrap";
import React, {Component} from 'react'
import confirm from "reactstrap-confirm";
import {CCYDropDown} from "../../utils/ccy";

class BudgetForm extends Component {
    constructor(props) {
        super(props)

        this.initialState = {
            id: null,
            name: null,
            budget: null
        }

        this.state = this.initialState
    }

    componentWillReceiveProps(nextProps) {
        const {budget} = nextProps
        if (budget != null)
            // TODO: why am I using this?
            this.setState({name: budget.name, budget: budget})
    }

    handleChange = event => {
        const {name, value} = event.target
        this.setState({[name]: value,})
    }

    closeForm = (event, toggleAccForm) => {
        this.setState(this.initialState)
        toggleAccForm(event)
    }

    deleteBudget = (event, toggleAccForm, handleDeleteAccount) => {
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

    saveForm = (event, toggleAccForm, handleSaveAccount) => {
        handleSaveAccount(this.state, this.props.budget)
        this.closeForm(event, toggleAccForm)
    }

    render() {
        const {name, budget} = this.state
        const {open, toggleBudgetForm, openBudget, handleSaveBudget, handleDeleteBudget, ccyOnChange} = this.props
        const deleteBudgetClass = budget === null ? 'd-none' : ''
        const titlePrefix = budget === null ? 'New' : ''
        const hasBudget = budget !== null
        return (
            <div>
                <Modal isOpen={open}>
                    <ModalHeader>{titlePrefix} Account Details</ModalHeader>
                    <ModalBody>
                        <input type='text' name={'name'} value={name} className={'form-control'}
                               placeholder={'budget name'} onChange={this.handleChange}/>

                    <CCYDropDown onChange={ccyOnChange}/>
                    </ModalBody>
                    <ModalFooter>
                        {hasBudget && <Button color="danger" className={deleteBudgetClass} onClick={(e) => {
                            openBudget(budget)
                        }}>Open</Button>}
                        <Button color="btn prim_btn" onClick={(e) => {
                            this.saveForm(e, toggleBudgetForm, handleSaveBudget)
                        }}>Save</Button>
                        <Button color="secondary" onClick={(e) => {
                            this.closeForm(e, toggleBudgetForm)
                        }}>Close</Button>
                        {hasBudget && <Button color="danger" className={deleteBudgetClass} onClick={(e) => {
                            this.deleteBudget(e, toggleBudgetForm, handleDeleteBudget)
                        }}>Delete Budget</Button>}
                    </ModalFooter>
                </Modal>
            </div>
        );
    }
}

export default BudgetForm