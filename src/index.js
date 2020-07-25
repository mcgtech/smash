import React from 'react'
import ReactDOM from 'react-dom'
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './components/app/App'
import './index.css'
import './theme1.css'

// take a JSX expression, creates a corresponding tree of virtual DOM nodes, and adds that tree to the DOM
// one special thing about ReactDOM.render() is that it only updates DOM elements that have changed.
// That means that if you render the exact same thing twice in a row, the second render will do nothing.
// This is significant! Only updating the necessary DOM elements is a large part of what makes React so successful.
// React accomplishes this thanks to something called the virtual DOM.
// Update: I have been exploring via none gitified projects, windowing to handle large datasets and best way to persist
ReactDOM.render(<App />, document.getElementById('root'))