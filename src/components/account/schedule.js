import React, {Component} from 'react'
import AccDetails from "./details";

export default class ScheduleContainer extends Component
{
    // TODO: add delete
    // TODO: make colors purple?
    render() {
        const {budget, activeAccount, deleteTxns, toggleFlag, refreshBudgetState, currSel,
               handleBurgerClick, txns} = this.props
        return (
            <div id="sched_block" className={"scroll-container panel_level1"}>
                {/*<ScheduleActions schedTxn={schedTxn} txnsChecked={txnsChecked}/>*/}
                <div id="sched" className={"scroll-section lite_back"}>
                    <div id="sched_list">
                        <AccDetails db={this.props.db}
                                    budget={budget}
                                    activeAccount={activeAccount}
                                    toggleFlag={toggleFlag}
                                    deleteTxns={deleteTxns}
                                    refreshBudgetState={refreshBudgetState}
                                    currSel={currSel}
                                    handleClick={handleBurgerClick}
                                    txns={txns}
                                    isSched={true}
                        />
                    </div>
                </div>
            </div>
        )
    }
}