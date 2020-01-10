import NumberFormat from "react-number-format";
import React from "react";

// https://github.com/s-yadav/react-number-format
const Ccy = props => {
    let theClass = 'ccy '
    theClass += props.amt < 0 ? 'neg_no' : 'pos_no'
    return <div className={theClass}>
        <NumberFormat allowNegative={true} decimalScale={2} fixedDecimalScale={true} value={props.amt} displayType={'text'} thousandSeparator={true} prefix={'£'}/>
    </div>
}
export default Ccy