import NumberFormat from "react-number-format";
import React, {Component} from 'react'
// TODO: work on the TBC TBC TBC
export const ccyPosnLeft = 0
export const ccyPosnRight = 1
export const defaultCcy = 'GBP'
export const defaultCcyDetails = {iso: defaultCcy, name: 'Great British Pound', symbol: '£', posn: ccyPosnLeft}
export const ccyList = [
                        {iso: 'CAD', name: 'Canadian Dollar', symbol: '$', posn: ccyPosnLeft},
                        {iso: 'CNY', name: 'Chinese Yuan', symbol: '¥', posn: ccyPosnRight},
                        {iso: 'EUR', name: 'Euro', symbol: '€', posn: ccyPosnLeft},
                        defaultCcyDetails,
                        {iso: 'USD', name: 'US Dollar', symbol: '$', posn: ccyPosnLeft},
                        ]

// https://github.com/s-yadav/react-number-format
const Ccy = props => {
    const ccyDetails = props.ccyDetails
    let prefix = ""
    let suffix = ""
    if (props.incSymbol && ccyDetails.posn === ccyPosnLeft)
        prefix = ccyDetails.symbol
    if (props.incSymbol && ccyDetails.posn === ccyPosnRight)
        suffix = ccyDetails.symbol
    if (props.incPositivePrefix && props.amt > 0)
        prefix += "+"
    if (props.verbose)
    {
        let theClass = 'ccy '
        theClass += props.amt < 0 ? 'neg_no' : 'pos_no'
        return <div className={theClass}>
            <NumberFormat allowNegative={props.allowNegative}
                          decimalScale={2} fixedDecimalScale={true}
                          value={props.amt}
                          displayType={props.displayType}
                          thousandSeparator={true}
                          prefix={prefix}
                          suffix={suffix}
                          name={props.name}
                          className={props.className}
                          onFocus={(event) => props.onFocus(event)}
                          onChange={(event) => props.onChange(event)}
                          placeholder={props.placeholder}
                          onValueChange={props.onValueChange}
            />
        </div>
    }
    else
        return <NumberFormat allowNegative={props.allowNegative}
                             decimalScale={2}
                             fixedDecimalScale={true}
                             value={props.amt}
                             displayType={props.displayType}
                             thousandSeparator={true}
                             prefix={prefix}
                             className={props.className}
                             suffix={suffix}
                             renderText={value => value}/>
}
Ccy.defaultProps = {
    ccyDetails: defaultCcyDetails,
    verbose: true,
    incSymbol: true,
    incPositivePrefix: false,
    displayType: 'text',
    prefix: defaultCcyDetails.symbol,
    name: 'ccy_field',
    className: '',
    allowNegative: true,
    placeholder: '',
    onValueChange: function(values){},
    onFocus: function(event){},
    onChange: function(event){}
}
export default Ccy

export function getCcyDetails(isoCode)
{
    return ccyList.filter(ccyItem => ccyItem.iso === isoCode)[0]
}

export class CCYDropDown extends Component
{
    state = {selection: defaultCcyDetails}

    componentDidMount() {
        const match = getCcyDetails(this.props.ccyIso)
        if (typeof match !== "undefined")
            this.setState({selection: match})
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
                    className={("ccyDD " + this.props.classes)}
                    onChange={(event) => this.onChange(event)}>
                {ccyList.map((item) => (
                            <option value={item.iso} key={item.iso}>{item.name}</option>
                        ))}
            </select>
        )
    }
}
CCYDropDown.defaultProps = {
    classes: '',
    onChange: function(event){}
}