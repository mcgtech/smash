import React, {Component, useState} from 'react'
import Ccy from '../../utils/ccy'
import AccForm from './form'
import {Collapse} from 'reactstrap';
import '../../utils/scrollable.css'

export default class AccDash extends Component {
    state = {acc_form_open: false, context_acc: null, draggedAcc: null, overWeight: null}

    // https://medium.com/the-andela-way/react-drag-and-drop-7411d14894b9
    onDrag = (event, acc) => {
        event.preventDefault();
        this.setState({
            draggedAcc: acc
        });
    }

    onDragOver = event => {
        event.preventDefault();
    }

    saveWeight = (event, overAcc) => {
        this.setState({overWeight: overAcc.weight});
        event.preventDefault();
    }

    onDrop = (event, toType) => {
        const {draggedAcc} = this.state;
        this.props.handleMoveAccount(draggedAcc, toType, this.state.overWeight)
        this.setState({draggedAcc: null});
    }

    toggleAccForm = (event, acc) => {
        event.preventDefault()
        if (!this.state.acc_form_open) {

        }
        this.setState({acc_form_open: !this.state.acc_form_open, context_acc: acc})
    }

    componentDidMount()
    {
    }
    componentWillUpdate(nextProps, nextState)
    {
    }

    // TODO: on responsive - get burger menu to work
    render() {
        const {budget, getBudgetTotal, setAccountState, handleSaveAccount, handleDeleteAccount, handleAccClick, activeAccount} = this.props
        const dndFns= {onDrag: this.onDrag, onDragOver: this.onDragOver, onDrop: this.onDrop, saveWeight: this.saveWeight}
        return (
            // TODO: get reposive to work inc burger click
            <div id="dash_cont" className="scroll-container">
                <AccDashHead budget={budget} burger={false}/>
                <div className="scroll-section">
                    <AccDashTop budget={budget}/>
                    <div className="clearfix"></div>
                    <AccountList type={AccountListTypes.BUDGET} budget={budget}
                                 toggleAccForm={this.toggleAccForm}
                                 dndFns={dndFns}
                                 handleAccClick={handleAccClick}
                                 activeAccount={activeAccount}/>
                    <AccountList type={AccountListTypes.OFF_BUDGET} budget={budget}
                                 toggleAccForm={this.toggleAccForm}
                                 dndFns={dndFns}
                                 handleAccClick={handleAccClick}
                                 activeAccount={activeAccount}/>
                    <AccountList type={AccountListTypes.CLOSED} budget={budget}
                                 toggleAccForm={this.toggleAccForm}
                                 dndFns={dndFns}
                                 handleAccClick={handleAccClick}
                                 activeAccount={activeAccount}/>
                </div>
                <div id="dash_footer">
                    <button type="button" className="btn prim_btn float-left"
                            onClick={(event) => this.toggleAccForm(event)}>
                        <i className="fas fa-plus mr-1"></i>Add Account
                    </button>
                    <i className="fas fa-cog float-left ml-4 mt-2 action"></i>
                    <i className="fas fa-arrows-alt-h float-right ml-4 mt-2 panel_level2_text"></i>
                </div>
                {/*get open/closed by trigger on each account row - see onContextMenu in Account fn*/}
                <AccForm toggleAccForm={this.toggleAccForm} open={this.state.acc_form_open} acc={this.state.context_acc}
                         setAccountState={setAccountState} handleSaveAccount={handleSaveAccount}
                         handleDeleteAccount={handleDeleteAccount}/>
            </div>
        )
    }
}

// TODO: onclick of burger, show lhs again
export const AccDashHead = props => {
    const {budget, burger} = props
    return (
        <div className="ellipsis dash_head">
            <div id="bud_name">{budget == null ? '' : budget.name}</div>
            {burger && <div className="burger_menu hilite"><i className="fa fa-bars"></i></div>}
        </div>
    )
}

export const AccountListTypes = {BUDGET: 0, OFF_BUDGET: 1, CLOSED: 3}
class AccountList extends Component {
    state = {isOpen: true}

    toggle = () => this.setState({isOpen: !this.state.isOpen})
    render() {
        const {type, budget, toggleAccForm, dndFns, handleAccClick, activeAccount} = this.props
        if (budget != null && budget.accounts != null && activeAccount != null) {
            const {onDrag, onDragOver, onDrop, saveWeight} = dndFns
            const onBudget = type == AccountListTypes.BUDGET
            const closed = type == AccountListTypes.CLOSED
            let total = 0
            let rows = budget.accounts.filter((row) => {
                let include = (!closed && row.open && ((onBudget && row.onBudget) || (!row.onBudget && !onBudget))) || (!row.open && closed)
                if (include)
                    total = total + row.workingBalance
                return include
            })
            const title = closed ? 'Closed' : onBudget ? 'On Budget' : 'Off Budget'
            const id = closed ? 'closed' : onBudget ? 'on_bud' : 'off_bud'
            let theClass = this.state.isOpen ? "is_open bud_sec" : "bud_sec"
            theClass += ' ellipsis'
            // TODO: do this via sql?
            rows.sort((a, b) => (a.weight > b.weight) ? 1 : -1)
            const rowElems = rows.map((row, index) => {
                let accClass = row.id == activeAccount.id ? 'acc_sel hilite' : ''
                return <AccountComp key={index} index={index} acc={row} toggleAccForm={toggleAccForm} onDrag={onDrag}
                                saveWeight={saveWeight}
                                accClass={accClass}
                                onClick={handleAccClick}/>
            })
            return (
                <div onDrop={event => onDrop(event, type)} onDragOver={(event => onDragOver(event))} className="panel_level2">
                    <div className="dash_item acc_head">
                        <div key={id} className={theClass} onClick={this.toggle}>
                            <i className="fa mr-1" aria-hidden="true"></i>{title}
                        </div>
                        <div className="summ_amt">
                            <Ccy amt={total}/>
                        </div>
                    </div>
                    <Collapse id={id} isOpen={this.state.isOpen}>
                        <ul className="accs">{rowElems}</ul>
                    </Collapse>
                </div>
            )
        } else
            return ''
    }
}

// https://medium.com/the-andela-way/react-drag-and-drop-7411d14894b9
class AccountComp extends Component {
    render() {
        const {index, acc, toggleAccForm, onDrag, saveWeight, onClick, accClass} = this.props
        return (
            <li draggable="true" onClick={(event) => onClick(event, acc)} onDragOver={(event) => saveWeight(event, acc)} onDrag={(event) => onDrag(event, acc)}
                key={index}
                onContextMenu={(event) => toggleAccForm(event, acc)}
                className={accClass}>
                <div className={"dash_item"} title={acc.name}>
                    <div className="ellipsis">{acc.name}</div>
                    <div className="summ_amt">
                        <Ccy amt={acc.workingBalance}/>
                    </div>
                </div>
            </li>
        )
    }
}

const AccDashTop = props => {
    const {budget} = props
    const bud_total = budget == null ? 0 : budget.getTotal()
    return (
        <div className="panel_level2" id="dash_top">
            <ul>
                <li><i className="fa fa-tags mr-1" id="budIcon"></i>Budget</li>
                <li><i className="fas fa-chart-pie mr-1" id="repIcon"></i>Reports</li>
                <li>
                    <div className="dash_item">
                        <div className="amt_name ellipsis"><i className="fa fa-credit-card mr-1" id="accIcon"></i>Accounts</div>
                        <div className="summ_amt">
                            <Ccy amt={bud_total}/>
                        </div>
                    </div>
                </li>
            </ul>
        </div>
    )
}