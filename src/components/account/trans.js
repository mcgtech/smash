import React, {Component} from 'react'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import * as PropTypes from "prop-types";
import MSelect from "../../utils/select";
import Ccy from "../../utils/ccy";


export default class Trans {
    // constructor(id, date, cleared, outAmt, inAmt, cat, payee, memo) {
    constructor(doc) {
        this.tid = doc._id
        this.tdate = new Date(doc.date)
        this.tflagged = doc.flagged
        this.tclear = doc.cleared
        this.tout = doc.out
        this.tin = doc.in
        this.tcat = doc.cat
        this.tpay = doc.payee
        this.tmemo = doc.memo
    }

    get amount() {
        return this.out > 0 ? -1 * this.out : this.in
    }

    get id() {
        return this.tid
    }

    get date() {
        return this.tdate
    }

    set date(date) {
        this.tdate = date
    }

    get clear() {
        return this.tclear
    }

    set clear(clear) {
        this.tclear = clear
    }

    get flagged() {
        return this.tflagged
    }

    set flagged(flagged) {
        this.tflagged = flagged
    }

    get out() {
        return this.tout
    }

    set out(outFlow) {
        this.tout = outFlow
    }

    get in() {
        return this.tin
    }

    set in(inFlow) {
        this.tin = inFlow
    }

    get cat() {
        return this.tcat
    }

    set cat(cat) {
        this.tcat = cat
    }

    get pay() {
        return this.tpay
    }

    set pay(pay) {
        this.tpay = pay
    }

    get memo() {
        return this.tmemo
    }

    set memo(memo) {
        this.tmemo = memo
    }
}

export class TxnForm extends Component {
    constructor(props) {
        super(props)

        this.initialState = {
            name: '',
            job: '',
        }

        this.state = this.initialState
    }

    handleChange = event => {
        const {name, value} = event.target

        this.setState({
            [name]: value,
        })
    }

    render() {
        const {name, job} = this.state;
        const {accounts, payees} = this.props;
        return <TxnTr name={name} job={job} handleChange={this.handleChange} accounts={accounts} payees={payees}/>;
    }
}

// TODO: make each field a component
// TODO: get payee field to work
// TODO: allow to search in payee field
// TODO: use correct fields
// TODO: use in loop that print out all txns
// TODO: suss how to handle many txns
// TODO: instead of using d-none to hide/show, use the shouldComponentUpdate() function
// TODO: maybe only pass budget down instead of individual parts
// https://www.npmjs.com/package/react-datepicker
//      https://github.com/Hacker0x01/react-datepicker/blob/master/docs/datepicker.md
//      https://reactdatepicker.com/
//      https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
class TxnDate extends Component {
    state = {
        startDate: new Date()
    };
    handleChange = date => {
        this.setState({
            startDate: date
        });
    };
    render() {
    const {hasFocus} = this.props
        return <DatePicker
                selected={this.state.startDate}
                onChange={this.handleChange}
                dateFormat='E MMM dd yyyy'
                startOpen={hasFocus}
                tabIndex={1}
                className='form-control'
                startDate={new Date()}
            />
    }
}
// https://react-select.com/styles#style-object
TxnDate.propTypes = {
    selected: PropTypes.any,
    onChange: PropTypes.func
};
const options = [
  { value: 'tesco', label: 'tesco' },
  { value: 'spotify', label: 'spotify' },
  { value: 'council', label: 'council' }
]

// searchable select: https://github.com/JedWatson/react-select
// https://react-select.com/advanced#controlled-props
class TxnPayee extends Component {
    render() {
        const {accounts, payees, hasFocus, changed, selectedPayee} = this.props
        let accOptions
        if (accounts != null)
            accOptions = accounts.map((data) =>
                <option
                    key={data.id}
                    value={data.id}
                >
                    {data.name}
                </option>
            )
        else
            accOptions = ''
        let payeeOptions = payees.map((data) =>
            <option
                key={data.id}
                value={data.id}
            >
                {data.name}
            </option>
        );
        // TODO: remove
        // return <select className='form-controlc txn_payee'>
        //     <optgroup label="Transfer to/from account">
        //         {accOptions}
        //     </optgroup>
        //     >
        //     <optgroup label="Previous payees">
        //         {payeeOptions}
        //     </optgroup>>
        // </select>;
// TODO: get this to work with payees and accounts
// TODO: if not found then add to payee list when txn added/modified

        return <MSelect options={options} hasFocus={hasFocus} changed={changed} value={selectedPayee}/>
    }
}

TxnPayee.propTypes = {
    accOptions: PropTypes.any,
    payeeOptions: PropTypes.any
};

// TODO: only show when they click add txn or click on existing row
// class TxnTr extends Component {
//
//     toggleCleared = () => {}
//     render() {
//         const {name, job, handleChange, accounts, payees} = this.props
//         return (<tr className='txn_row'>
//             <td className="txn_sel"><input type="checkbox"/></td>
//             <td><i className='far fa-flag flag'></i></td>
//             <td><TxnDate/></td>
//             <td><TxnPayee accounts={accounts} payees={payees}/></td>
//             <td>Cat</td>
//             <td>Memo</td>
//             <td>Out</td>
//             <td>In</td>
//             <td><TxnCleared cleared={false}/></td>
//         </tr>)
//     }
// }

// https://blog.logrocket.com/complete-guide-building-smart-data-table-react/
// https://github.com/adazzle/react-data-grid
export class TxnTr extends Component {
    // TODO: get selection and state to work - maybe just use a payee_value state?
    state = {editField: null, selectedPayee: {label: 'spotify', value: 'spotify'}}
    tdSelected = (event) => {
        this.setState({editField: event.target.getAttribute('fld_id')})
    }

    handlePayeeChange = selectedOption => {
        this.setState({selectedPayee: selectedOption});
    }

    render() {
        const {row, isChecked, txnSelected, toggleTxnCheck, toggleFlag, toggleCleared, editTxn,
        accounts, payees, saveTxn, cancelEditTxn} = this.props
        if (typeof row == 'undefined')
            return (<tr></tr>)
        else
        {
            const editRow = editTxn == row.id
            return (
                // TODO: dont use ID twice in each row below
                <tr className={isChecked ? 'table-warning' : ''}
                    onClick={(event) => txnSelected(event, row)}>
                    <td className="txn_sel" fld_id="selFld" onClick={(event => this.tdSelected(event))}>
                        <input onChange={(event) => toggleTxnCheck(event, row)}
                               type="checkbox" checked={isChecked}/>
                    </td>
                    <td fld_id="flagFld" onClick={(event => this.tdSelected(event))}>
                        <i onClick={() => toggleFlag(row, true)}
                           className={'far fa-flag flag' + (row.flagged ? ' flagged' : '')}></i>
                    </td>
                    <td fld_id="dateFld" onClick={(event => this.tdSelected(event))}>
                        {editRow ? <TxnDate hasFocus={editRow && this.state.editField == 'dateFld'}/> : row.date.toDateString()}</td>
                    <td fld_id="payFld" className="table_ddown" onClick={(event => this.tdSelected(event))}>
                        {editRow ? <TxnPayee accounts={accounts} payees={payees}
                                             hasFocus={editRow && this.state.editField == 'payFld'}
                                             changed={this.handlePayeeChange} selectedPayee={this.state.selectedPayee}/> : row.pay}</td>
                    <td fld_id="catFld" onClick={(event => this.tdSelected(event))}>
                        {editRow ? <input className={"form-control"} type='text' value={row.cat}/>: row.cat}</td>
                    <td fld_id="memoFld" onClick={(event => this.tdSelected(event))}>
                        {editRow ? <input autoFocus={this.state.editField == 'memoFld'} className={"form-control"} type='text' value={row.memo}/>: row.memo}</td>
                    <td fld_id="outFld" onClick={(event => this.tdSelected(event))}>
                        {editRow ? <input autoFocus={this.state.editField == 'outFld'} className={"form-control"} type='text' value={row.out}/> : <Ccy verbose={false} amt={row.out}/>}</td>
                    <td fld_id="inFld" onClick={(event => this.tdSelected(event))}>
                        {editRow ?
                            <div>
                                <input autoFocus={this.state.editField == 'inFld'} className={"form-control"} type='text' value={row.in}/>
                                <div id="txn_save">
                                    <button onClick={(event => saveTxn(event, row))} type="button "className='btn prim_btn'>Save</button>
                                    <button onClick={(event => cancelEditTxn(event))} type="button "className='btn btn-secondary'>Cancel</button>
                                </div>
                            </div>
                            : <Ccy amt={row.in} verbose={false}/>}</td>
                    <td fld_id="clearFld" onClick={(event => this.tdSelected(event))}>
                        <TxnCleared toggleCleared={toggleCleared} row={row} cleared={row.clear}/></td>
                </tr>
            )

        }
    }
}


export class TxnCleared extends Component {
    render() {
        return <div onClick={typeof this.props.row != 'undefined' ? () => this.props.toggleCleared(this.props.row) : false || null}
                    className={"cleared" + (this.props.cleared ? " has_cleared" : "")}>C</div>;
    }
}
