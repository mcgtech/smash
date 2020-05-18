import React, {Component} from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faExchangeAlt } from '@fortawesome/free-solid-svg-icons'

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