import NumberFormat from "react-number-format";
import React from "react";

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
                          onChange={(event) => props.onChange(event)}/>
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
    allowNegative: true
}
export default Ccy