import React, {Component} from 'react'

export default class BudgetContainer extends Component
{
    render() {
    // TODO: order by weight
    // TODO: handle collapsed
    const catGroups = this.props.budget.cats
          const catGroupElems = catGroups.map((catGroup, index) => {
                const catGroupItems = catGroup.items.map((catGroupItem, index) => {
                    return <div class="catGroupItem">{catGroupItem.name}</div>
                })
                return <div class="catGroup">
                    {catGroup.name}
                    {catGroupItems}
                    </div>
            })
        return (
            <div id="bud_block" className={"scroll-container panel_level1"}>
                <div id="catGroups">
                    {catGroupElems}
                </div>
                <div id="months">
                Months
                </div>
            </div>
        )
    }
}