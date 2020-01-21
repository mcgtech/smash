import React, {Component} from 'react'
import Ccy from "../../utils/ccy";
import {
    ANY_TS, CAT_TS,
    IN_EQUALS_TS,
    IN_LESS_EQUALS_TS,
    IN_MORE_EQUALS_TS, MEMO_TS,
    OUT_EQUALS_TS,
    OUT_LESS_EQUALS_TS,
    OUT_MORE_EQUALS_TS, PAYEE_TS
} from "./details";


class ScheduleActions extends Component
{
    render() {
        const {schedTxn, schedTransfer} = this.props
        return (
            <div id="sched_head" className="actions">
                <div>
                    <div className='acc_det_act' onClick={schedTxn}><i className="fas pr-1 fa-plus"></i>Schedule Txn</div>
                    <div className='acc_det_act' onClick={schedTransfer}><i className="fas pr-1 fa-exchange-alt"></i>Schedule Transfer
                    </div>
                </div>
            </div>
        )
    }
}

export default class ScheduleContainer extends Component
{
    render() {
        return (
            <div id="sched_block" className={"scroll-container panel_level1"}>
                <ScheduleActions/>
                <div className={"scroll-section"}>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
                    <div>Schedule</div>
            </div>
            </div>
        )
    }
}