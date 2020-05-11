import React from 'react'
// https://github.com/JedWatson/react-select
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
  })
};

// TODO: fix z-index issue - I dont think this select will give me grouping options - so try and find another?
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
