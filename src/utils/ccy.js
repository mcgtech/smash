import NumberFormat from "react-number-format";
import React, {Component} from 'react'

// https://github.com/s-yadav/react-number-format
const Ccy = props => {
    if (props.verbose)
    {
        let theClass = 'ccy '
        theClass += props.amt < 0 ? 'neg_no' : 'pos_no'
        return <div className={theClass}>
            <NumberFormat allowNegative={props.allowNegative} decimalScale={2} fixedDecimalScale={true} value={props.amt}
                          displayType={props.displayType} thousandSeparator={true} prefix={props.prefix}
                          name={props.name}
                          onFocus={(event) => props.onFocus(event)}
                          onChange={(event) => props.onChange(event)}
                          placeholder={props.placeholder}
                          onValueChange={props.onValueChange}
            />
        </div>
    }
    else
        return <NumberFormat allowNegative={props.allowNegative} decimalScale={2} fixedDecimalScale={true} value={props.amt}
                          displayType={props.displayType} thousandSeparator={true} prefix={props.prefix}
                          renderText={value => value}/>
}
Ccy.defaultProps = {
    verbose: true,
    displayType: 'text',
    prefix: '£',
    name: 'ccy_field',
    allowNegative: true,
    placeholder: '',
    onValueChange: function(values){},
    onFocus: function(event){},
    onChange: function(event){}
}
export default Ccy

export const ccyPosnLeft = 0
export const ccyPosnRight = 2
export const defaultCcyIso = 'GBP'
export const ccyList = [{iso: 'GBP', name: 'Great British Pound', symbol: '£', posn: ccyPosnLeft},
                        {iso: 'USD', name: 'US Dollar', symbol: '$', posn: ccyPosnLeft},
                        {iso: 'CAD', name: 'Canadian Dollar', symbol: '$', posn: ccyPosnLeft},
                        ]

export function getCcyDetails(isoCode)
{
    let details = null
    for (const item of ccyList)
    {
        if (isoCode === item.iso)
        {
            details = item
            break
        }
    }
}

export class CCYDropDown extends Component
{
    state = {selection: defaultCcyIso}

    componentDidMount() {
        this.setState({selection: {iso: this.props.ccyIso}})
    }

    onChange = (e) => {
        const value = e.target.value
        for (const item of ccyList)
        {
            if (value === item.iso)
            {
                this.setState({selection: item}, function(){this.props.onChange(this.state.selection)})
            }
        }
    }
    render() {
        return (
            <select value={this.state.selection.iso}
                    defaultValue={this.state.selection.iso}
                    className={("ccyDD " + this.props.classes)}
                    onChange={(event) => this.onChange(event)}>
                {ccyList.map((item) => (
                            <option value={item.iso}>{item.name}</option>
                        ))}
            </select>
        )
    }
}
CCYDropDown.defaultProps = {
    classes: '',
    onChange: function(event){}
}