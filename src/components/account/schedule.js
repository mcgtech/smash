import React, {Component} from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faExchangeAlt } from '@fortawesome/free-solid-svg-icons'
import AccDetails, {AccDetailsBody, OUT_EQUALS_TS, AccDetailsHeader} from "./details";
import SplitPane from "react-split-pane";

class ScheduleActions extends Component
{
    render() {
        const {schedTxn, schedTransfer} = this.props
        return (
            <div id="sched_head" className="actions">
                <div>
                    <button className='btn sec_btn' onClick={schedTxn}><FontAwesomeIcon icon={faPlus} className="pr-1"/>Schedule Txn</button>
                    <button className='btn sec_btn' onClick={schedTransfer}><FontAwesomeIcon icon={faExchangeAlt} className="pr-1"/>Schedule Transfer
                    </button>
                </div>
            </div>
        )
    }
}

export default class ScheduleContainer extends Component
{
    // TODO: add delete
    // TODO: make colors purple?
    render() {
        const {budget, activeAccount} = this.props
        return (
            <div id="sched_block" className={"scroll-container panel_level1"}>
                <ScheduleActions/>
                <div id="sched" className={"scroll-section lite_back"}>
                    <div id="sched_list">
                        <AccDetails db={this.props.db}
                                    budget={budget}
                                    activeAccount={activeAccount}
                                    toggleFlag={this.props.toggleFlag}
                                    deleteTxns={this.props.deleteTxns}
                                    refreshBudgetState={this.props.refreshBudgetState}
                                    currSel={this.props.currSel}
                                    handleClick={this.props.handleBurgerClick}
                                    txns={this.props.txns}
                                    isSched={true}
                        />
                    </div>
                </div>
            </div>
        )
    }
}