import React, {Component} from 'react'
import ReactDOM from 'react-dom'
import './resizable.css'

// React resizable panels: https://codepen.io/lopis/pen/XYgRKz

export default class ResizablePanels extends Component {
  // TODO: pass in []
  constructor () {
    super()

    this.state = {
      isDragging: false,
      defaultPanels: [300, 300],
      panels: []
    }
  }

  componentDidMount () {
      this.setState({
        panels: this.state.defaultPanels
      })
    ReactDOM.findDOMNode(this).addEventListener('mousemove', this.resizePanel)
    ReactDOM.findDOMNode(this).addEventListener('mouseup', this.stopResize)
    ReactDOM.findDOMNode(this).addEventListener('mouseleave', this.stopResize)
  }

  startResize = (event, index) => {
      this.setState({
        isDragging: true,
        currentPanel: index,
        initialPos: event.clientX
      })
  }

  // TODO: this sets a min width on first panel, but code is only going to work when there are two panels
  //       make it more flexible
  // TODO: make fonts sizes etc same as financier
  // TODO: handle mobile size same as financier
  stopResize = () => {
    if (this.state.isDragging) {
      const currPaneWidth = (this.state.panels[this.state.currentPanel] || 0) - this.state.delta
      const prevPaneWidth = (this.state.panels[this.state.currentPanel-1] || 0) + this.state.delta
      if (this.state.currentPanel-1 == 0 && prevPaneWidth >= this.state.defaultPanels[this.state.currentPanel-1])
        this.setState(({panels, currentPanel}) => ({
          isDragging: false,
          panels: {
            [currentPanel]: currPaneWidth,
            [currentPanel - 1]: prevPaneWidth
          },
          delta: 0,
          currentPanel: null
        }))
      else
        this.setState(({}) => ({
          isDragging: false,
          delta: 0,
          panels: this.state.defaultPanels,
          currentPanel: null
        }))
    }
  }

  resizePanel = (event) => {
    if (this.state.isDragging) {
      const delta = event.clientX - this.state.initialPos
      this.setState({
        delta: delta
      })
    }
  }

  render() {
    const rest = this.props.children.slice(1)
    return (
      <div className="panel-container" onMouseUp={() => this.stopResize()}>
        <div className="panel"
            style={{width: this.state.panels[0]}}
        >
          {this.props.children[0]}
        </div>
        {[].concat(...rest.map((child, i) => {
          return [
            <div onMouseDown={(e) => this.startResize(e, i + 1)}
              key={"resizer_" + i}
              style={this.state.currentPanel === i+1 ? {left: this.state.delta} : {}}
              className="resizer"></div>,
            <div key={"panel_" + i} className="panel"
                style={{width: `calc(100% - ${this.state.panels[0]}px)`}}>
              {child}
            </div>
          ]
        }))}
      </div>
    )
  }
}