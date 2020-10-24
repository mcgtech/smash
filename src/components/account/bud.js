import React, {Component} from 'react'
import BudBlockCol from './bud_block_col'
import BudgetCalendar from './bud_cal'

export default class BudgetContainer extends Component
{
    render() {
        // TODO: order by weight
        // TODO: drag and drop
        // TODO: handle collapsed
        // TODO: why does this get called multiple times?
        // TODO: check group name back colors in each theme
        const catGroups = this.props.budget.cats
        console.log(catGroups)
        // first block - group names and items
        const catGroupElems = catGroups.map((catGroup, index) => {
            const catGroupItems = catGroup.items.map((catGroupItem, index) => {
                return <div className="catName">{catGroupItem.name}</div>
            })
            return <div class="catGroup">
                <div className="catGroupHead lightest">{catGroup.name}</div>
                {catGroupItems}
                </div>
        })
        // month blocks
        // TODO: code this
        // TODO: continue coding the ui - see financier
        // TODO: make it responsive
        // TODO: take into account the active month
        // TODO: only show three months at one time
        return (
            <div className={"scroll-container panel_level1"} id="budget">
                <div className="flex-container">
                    <div className="lite_back bud_block_section" id="catNames">
                          {catGroupElems}
                    </div>

                    <div className="flex-container" id="bud_block">
                        <BudgetCalendar/>
                        <div className="flex-container" id="bud_block_months">
                            <BudBlockCol/>
                            <BudBlockCol/>
                            <BudBlockCol/>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}