// https://reactstrap.github.io/components/modals/
// https://www.robinwieruch.de/react-usestate-hook
// https://www.taniarascia.com/getting-started-with-react/#submitting-form-data
import {Button, Modal, ModalBody, ModalFooter, ModalHeader, Input, Label} from "reactstrap";
import React, {Component} from 'react'

class RestoreBudgetForm extends Component {

    // TODO: still to suss how to read file in!!!!!

    // TODO: only allow json files
    // TODO: only enable restore button if valid file selected
    closeForm = (event, toggleAccForm) => {
        toggleAccForm(event)
    }

    restoreBudget = (event, toggleAccForm, handleSaveAccount) => {
        this.closeForm(event, toggleAccForm)
    }

      handleChange = (event) => {
        // this.setState({value: event.target.value});
        // TODO: use a constant
          console.log(this.refs["theFile"])
      }

    // to get focus to work: https://github.com/reactstrap/reactstrap/issues/1598
    render() {
        const {open, toggleBudgetForm} = this.props
        return (
            <div>
                <Modal isOpen={open} autoFocus={false}>
                    <ModalHeader>Restore</ModalHeader>
                    <ModalBody>
                        <Label for="exampleFile">JSON File</Label>
                        <Input type="file" name="file" id="jsonFile" ref="theFile" onChange={this.handleChange}/>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="btn prim_btn" onClick={(e) => {
                            this.restoreBudget(e, toggleBudgetForm)
                        }}>Restore Budget</Button>
                        <Button color="secondary" onClick={(e) => {
                            this.closeForm(e, toggleBudgetForm)
                        }}>Close</Button>
                    </ModalFooter>
                </Modal>
            </div>
        )
    }
}

export default RestoreBudgetForm