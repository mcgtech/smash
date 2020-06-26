import React, {Component} from 'react'
import {AccDashHead} from "./dash";

// TODO: need to rename budget.js and AccountsContainer to something else and then rename this lot as such
export default class BudgetContainer extends Component
{
    render() {
        return (
            <div id="bud_block" className={"scroll-container panel_level1"}>
                {/*<AccDashHead budget={this.props.budget} burger={true}/>*/}
                Budget
            </div>
        )
    }
}