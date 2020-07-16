// https://reactstrap.github.io/components/modals/
// https://www.robinwieruch.de/react-usestate-hook
// https://www.taniarascia.com/getting-started-with-react/#submitting-form-data
import {Button, Modal, ModalBody, ModalFooter, ModalHeader, Label} from "reactstrap";
import React, {Component} from 'react'

// https://ilonacodes.com/blog/frontend-shorts-how-to-read-content-from-the-file-input-in-react/
const ImportBudgetComponent = (props) => {
    let fileReader;

    const handleFileRead = (e) => {
        const budget = fileReader.result
        props.readBudget(budget)
    };

    const handleFileChosen = (file) => {
        fileReader = new FileReader()
        fileReader.onloadend = handleFileRead
        fileReader.readAsText(file)
    };

    return <div className='upload_bud_json'>
        <input type='file'
               id='file'
               className='input-file'
               accept='.json'
               onChange={e => handleFileChosen(e.target.files[0])}
        />
    </div>;
};

// https://ilonacodes.com/blog/frontend-shorts-how-to-read-content-from-the-file-input-in-react/
class RestoreBudgetForm extends Component {
    state = {fileContents: null}
    closeForm = (event, toggleBudgetForm) => {
        toggleBudgetForm(event)
        this.setState({fileContents: null})
    }

    restoreBudget = (event, toggleBudgetForm) => {
        this.closeForm(event, toggleBudgetForm)
        this.props.applyBudget(this.state.fileContents)
        this.setState({fileContents: null})
    }

    readBudget = (budgetJson) => {
        this.setState({fileContents: budgetJson})
    }

    // to get focus to work: https://github.com/reactstrap/reactstrap/issues/1598
    render() {
        const {open, toggleBudgetForm} = this.props
        return (
            <div>
                <Modal isOpen={open} autoFocus={false}>
                    <ModalHeader>Restore a Budget</ModalHeader>
                    <ModalBody>
                        <Label for="exampleFile">Budget JSON File</Label>
                        <ImportBudgetComponent readBudget={this.readBudget}/>
                    </ModalBody>
                    <ModalFooter>
                        <Button disabled={this.state.fileContents === null ? true : false}color="btn prim_btn" onClick={(e) => {
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