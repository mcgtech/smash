import React, {Component} from 'react'
import {AccDashHead} from "./dash";

// TODO: need to rename budget.js and AccountsContainer to something else and then rename this lot as such
export default class RepContainer extends Component
{
    render() {
        return (
            <div id="rep_block" className={"scroll-container panel_level1"}>
                {/* TODO: move this higher up ie inside budget */}
                {/*<AccDashHead budget={this.props.budget} burger={true} handleClick={this.props.handleClick}/>*/}
                Report
            </div>
        )
    }
}