import React, {Component} from 'react'
import Ccy from '../../utils/ccy'
import AccForm from './acc_form'
import {Collapse} from 'reactstrap'
import '../../utils/scrollable.css'
// https://github.com/FortAwesome/react-fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTags, faChartPie, faCreditCard, faPlus, faCloudDownloadAlt, faArrowsAltH, faBars, faChevronCircleUp, faChevronCircleDown } from '@fortawesome/free-solid-svg-icons'
import {ALL_ACC_SEL, IND_ACC_SEL, REP_SEL, BUD_SEL} from "./budget"
import {DBState} from "../../utils/db";

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

    render() {
        const {budget, setAccDragDetails, handleSaveAccount, handleDeleteAccount, handleAccClick, activeAccount,
            allAccClick, repClick, budClick, currSel, budListClick} = this.props
        const dndFns= {onDrag: this.onDrag, onDragOver: this.onDragOver, onDrop: this.onDrop, saveWeight: this.saveWeight}
        return (
            <div id="dash_cont" className="scroll-container">
                <AccDashHead budget={budget} handleClick={budListClick}/>
                <div className="scroll-section">
                    <AccDashTop budget={budget} allAccClick={allAccClick} repClick={repClick} budClick={budClick} currSel={currSel}/>
                    <div className="clearfix"></div>
                    <AccountList type={AccountListTypes.BUDGET} budget={budget}
                                 toggleAccForm={this.toggleAccForm}
                                 dndFns={dndFns}
                                 currSel={currSel}
                                 handleAccClick={handleAccClick}
                                 activeAccount={activeAccount}/>
                    <AccountList type={AccountListTypes.OFF_BUDGET} budget={budget}
                                 toggleAccForm={this.toggleAccForm}
                                 dndFns={dndFns}
                                 currSel={currSel}
                                 handleAccClick={handleAccClick}
                                 activeAccount={activeAccount}/>
                    <AccountList type={AccountListTypes.CLOSED} budget={budget}
                                 toggleAccForm={this.toggleAccForm}
                                 dndFns={dndFns}
                                 currSel={currSel}
                                 handleAccClick={handleAccClick}
                                 activeAccount={activeAccount}/>
                </div>
                <div id="dash_footer">
                    <button type="button" className="btn prim_btn float-left"
                            onClick={(event) => this.toggleAccForm(event)}>
                        <FontAwesomeIcon icon={faPlus} className="mr-1"/>Add Account
                    </button>
                    <FontAwesomeIcon icon={faCloudDownloadAlt} className="float-left ml-4 mt-2 action"
                        onClick={this.props.backupBudget}/>
                    <div id={"dash_state"}>
                        <div className="float-left mt-2 action"><DBState dbState={this.props.dbState}/></div>
                        <FontAwesomeIcon icon={faArrowsAltH} className="horiz_arr ml-4 mt-2 panel_level2_text"/>
                    </div>
                </div>
                {/* gets open/closed by trigger on each account row - see onContextMenu in Account fn */}
                <AccForm toggleAccForm={this.toggleAccForm} open={this.state.acc_form_open} acc={this.state.context_acc}
                         budget={budget}
                         setAccDragDetails={setAccDragDetails}
                         handleSaveAccount={handleSaveAccount}
                         handleDeleteAccount={handleDeleteAccount}/>
            </div>
        )
    }
}

export const AccDashHead = props => {
    const {budget, handleClick} = props
    return (
        <div className={"ellipsis dash_head not_burger"} onClick={handleClick}>
            <div className="bud_name">{budget == null ? '' : budget.name}</div>
        </div>
    )
}

export const AccDashSmall = props => {
    const {budget, handleClick, handleBurgerClick} = props
    return (
        <div className={"ellipsis dash_head burger acc_dash_small dark_back"}>
            <div className="bud_name" onClick={handleClick}>{budget == null ? '' : budget.name}</div>
            <div className="burger_menu" onClick={handleBurgerClick}><FontAwesomeIcon icon={faBars}/></div>
        </div>
    )
}

export const AccountListTypes = {BUDGET: 0, OFF_BUDGET: 1, CLOSED: 3}
class AccountList extends Component {
    state = {isOpen: true}

    toggle = () => this.setState({isOpen: !this.state.isOpen})
    render() {
        const {type, budget, toggleAccForm, dndFns, handleAccClick, activeAccount, currSel} = this.props
        // if (budget != null && budget.accounts != null && activeAccount != null) {
        if (budget != null && budget.accounts != null) {
            const {onDrag, onDragOver, onDrop, saveWeight} = dndFns
            const onBudget = type === AccountListTypes.BUDGET
            const closed = type === AccountListTypes.CLOSED
            let total = 0
            let rows = budget.accounts.filter((row) => {
                let include = (!closed && row.open && ((onBudget && row.onBudget) || (!row.onBudget && !onBudget))) || (!row.open && closed)
                if (include)
                    total = total + row.total
                return include
            })
            const title = closed ? 'Closed' : onBudget ? 'On Budget' : 'Off Budget'
            const id = closed ? 'closed' : onBudget ? 'on_bud' : 'off_bud'
            let theClass = this.state.isOpen ? "is_open bud_sec" : "bud_sec"
            theClass += ' ellipsis'

            const rowElems = rows.map((row, index) => {
                let accClass = row.id === activeAccount.id && currSel === IND_ACC_SEL ? 'acc_sel hilite' : ''
                return <AccountComp key={index} index={index} acc={row} toggleAccForm={toggleAccForm} onDrag={onDrag}
                                saveWeight={saveWeight}
                                accClass={accClass}
                                budget={budget}
                                onClick={handleAccClick}/>
            })
            return (
                <div onDrop={event => onDrop(event, type)} onDragOver={(event => onDragOver(event))} className="panel_level2">
                    <div className="dash_item acc_head">
                        <div key={id} className={theClass} onClick={this.toggle}>
                            <FontAwesomeIcon icon={this.state.isOpen ? faChevronCircleUp: faChevronCircleDown} className="mr-1" aria-hidden="true"/>{title}
                        </div>
                        <div className="summ_amt">
                            <Ccy amt={total} ccyDetails={budget.ccyDetails}/>
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
        const {index, acc, toggleAccForm, onDrag, saveWeight, onClick, accClass, budget} = this.props
        return (
            <li draggable="true" onClick={(event) => onClick(event, acc)} onDragOver={(event) => saveWeight(event, acc)} onDrag={(event) => onDrag(event, acc)}
                key={index}
                onContextMenu={(event) => toggleAccForm(event, acc)}
                className={accClass}>
                <div className={"dash_item"} title={acc.name}>
                    <div className="ellipsis">{acc.name}</div>
                    <div className="summ_amt">
                        <Ccy amt={acc.total} ccyDetails={budget.ccyDetails}/>
                    </div>
                </div>
            </li>
        )
    }
}

const AccDashTop = props => {
    const {budget, allAccClick, repClick, budClick, currSel} = props
    const bud_total = budget == null ? 0 : budget.total
    return (
        <div className="panel_level2" id="dash_top">
            <ul>
                <li className={currSel === BUD_SEL ? ' hilite' : ''} onClick={budClick}><FontAwesomeIcon icon={faTags} className="mr-1" id="budIcon"/>Budget</li>
                <li className={currSel === REP_SEL ? ' hilite' : ''} onClick={repClick}><FontAwesomeIcon icon={faChartPie} className="mr-1" id="repIcon"/>Reports</li>
                <li id="allAccs" className={currSel === ALL_ACC_SEL ? ' hilite' : ''} onClick={allAccClick}>
                    <div className="dash_item">
                        <div className="amt_name ellipsis"><FontAwesomeIcon icon={faCreditCard} className="mr-1" id="accIcon"/>Accounts</div>
                        <div className="summ_amt">
                            <Ccy amt={bud_total} ccyDetails={budget.ccyDetails}/>
                        </div>
                    </div>
                </li>
            </ul>
        </div>
    )
}