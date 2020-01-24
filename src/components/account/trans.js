import React, {Component} from 'react'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import * as PropTypes from "prop-types";
import Select from 'react-select'

export default class Trans {
    constructor(id, date, cleared, outAmt, inAmt, cat, payee, memo) {
        this.tid = id
        this.tdate = date
        this.tclear = cleared
        this.tout = outAmt
        this.tin = inAmt
        this.tcat = cat
        this.tpay = payee
        this.tmemo = memo
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
        return <DatePicker
                selected={this.state.startDate}
                onChange={this.handleChange}
                dateFormat='E MMM dd yyyy'
                startOpen={true}
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
const customStyles = {
  control: provided => ({
    ...provided,
    minHeight: "10px",
    height: "26px",
  }),
  indicatorsContainer: provided => ({
    ...provided,
    height: "10px",
    paddingTop: "12px"
  }),
  clearIndicator: provided => ({
    ...provided,
    padding: "5px"
  }),
  placeholder: provided => ({
    ...provided,
    padding: "5px"
  }),
  dropdownIndicator: provided => ({
    ...provided,
    padding: "10px"
  })
};
class TxnPayee extends Component {
    render() {
        const {accounts, payees} = this.props
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
// searchable select: https://github.com/JedWatson/react-select
const options = [
  { value: 'chocolate', label: 'Chocolate' },
  { value: 'strawberry', label: 'Strawberry' },
  { value: 'vanilla', label: 'Vanilla' }
]
        return <Select options={options}
      styles={customStyles}/>
    }
}

TxnPayee.propTypes = {
    accOptions: PropTypes.any,
    payeeOptions: PropTypes.any
};

// TODO: only show when they click add txn or click on existing row
class TxnTr extends Component {

    toggleCleared = () => {}
    render() {
        const {name, job, handleChange, accounts, payees} = this.props
        return (<tr className='txn_row'>
            <td><input type="checkbox"/></td>
            <td><i className='far fa-flag flag'></i></td>
            <td><TxnDate/></td>
            <td><TxnPayee accounts={accounts} payees={payees}/></td>
            <td>Cat</td>
            <td>Memo</td>
            <td>Out</td>
            <td>In</td>
            <td><TxnCleared cleared={false}/></td>
        </tr>)
    }
}


export class TxnCleared extends Component {
    render() {
        return <div onClick={typeof this.props.row != 'undefined' ? () => this.props.toggleCleared(this.props.row) : false || null}
                    className={"cleared" + (this.props.cleared ? " has_cleared" : "")}>C</div>;
    }
}
