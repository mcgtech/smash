import React, {Component} from 'react'
import Ccy from "../../utils/ccy";
import {
    CAT_TS,
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
                    <button className='btn sec_btn' onClick={schedTxn}><i className="fas pr-1 fa-plus"></i>Schedule Txn</button>
                    <button className='btn sec_btn' onClick={schedTransfer}><i className="fas pr-1 fa-exchange-alt"></i>Schedule Transfer
                    </button>
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
                <div id="sched" className={"scroll-section lite_back"}>
                    <div id="sched_list">
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
            </div>
        )
    }
}