import React, {Component} from 'react'
import Select from 'react-select'

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

// TODO: fix z-index issue
// TODO: suss how to handle lots of txns
export default class MSelect extends React.Component {
  state = {
    selectedOption: null,
  };

  handleChange = (selectedOption, changedFn) => {
    this.setState(
      { selectedOption }
    );
    changedFn(selectedOption)
  };
  render() {
    const { selectedOption } = this.state;
    const { options, hasFocus, changed, value } = this.props;

    return (
      <Select
        value={selectedOption}
        onChange={(value)=>{this.handleChange(value, changed)}}
        options={options}
        styles={customStyles} autoFocus={hasFocus} defaultMenuIsOpen={hasFocus} defaultValue={value}
      />
    );
  }
}
