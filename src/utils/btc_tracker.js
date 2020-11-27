import React from 'react';
import $ from 'jquery';
import './btc_tracker.css'
import Ccy from './ccy'

export default class BTCTracker extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      rate: 0.00,
      rate_float: 0.00,
      total: 2.4264,
      lastFetch: ""
    }
  }

  componentDidMount() {
    this.fetch();
  }

  fetch() {
    var context = this;

    window.setTimeout(function() {
      $.ajax({
        url: "https://api.coindesk.com/v1/bpi/currentprice.json",
        dataType: "json",
        method: "GET",
        success: function(response) {
          context.setState({
            rate: response.bpi.GBP.rate,
            rate_float: response.bpi.GBP.rate_float,
            lastFetch: response.time.updated
          });
        }
      });
    }, 3000);
  }

  render() {
    const {ccyDetails} = this.props
    return (
      <div>
          <div className="tracker_row tracker_head">
              <div className="tracker_td">COIN</div>
              <div className="tracker_td">PRICE</div>
              <div className="tracker_td">HOLDINGS</div>
          </div>
          <div className="tracker_row">
              <div className="tracker_td"><img src="./btc.png"className="mr-1" />BTC</div>
              <div className="tracker_td">
                   <Ccy amt={this.state.rate} ccyDetails={ccyDetails}/>
              </div>
              <div className="tracker_td">
                   <Ccy amt={this.state.rate_float * this.state.total} ccyDetails={ccyDetails}/>
              </div>
          </div>
          <div className="tracker_row">
              <div className="tracker_td">
                   <span className="total">{this.state.total}</span>
              </div>
          </div>
      </div>
    );
  }
}