import React, {Component} from 'react'
import AccDetails from "./details";

export default class ScheduleContainer extends Component
{
    render() {
        const {budget, activeAccount, deleteTxns, toggleFlag, refreshBudgetState, currSel,
               handleBurgerClick, txns, addSchedToBudget} = this.props
        return (
            <div id="sched_block" className={"scroll-container panel_level1"}>
                <div id="sched" className={"scroll-section"}>
                    <div id="sched_list">
                        <AccDetails db={this.props.db}
                                    budget={budget}
                                    activeAccount={activeAccount}
                                    toggleFlag={toggleFlag}
                                    deleteTxns={deleteTxns}
                                    addSchedToBudget={addSchedToBudget}
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