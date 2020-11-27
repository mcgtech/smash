import React from 'react';
import $ from 'jquery';
import './btc_tracker.css'
import Ccy from './ccy'

export default class BTCTracker extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      price: 0.00,
      total: 2.4264
    }
  }

  componentDidMount() {
    this.fetch();
  }

  fetch() {
    var context = this;

    // TODO: is this being called after first call?
    window.setTimeout(function() {
      $.ajax({
        url: "https://api.coinbase.com/v2/prices/spot?currency=GBP",
        dataType: "json",
        method: "GET",
        success: function(response) {
          context.setState({
            price: response.data.amount,
          }, function(){
            this.props.onPriceRefresh(this.state.price)
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
                   <Ccy amt={this.state.price} ccyDetails={ccyDetails}/>
              </div>
              <div className="tracker_td">
                   <Ccy amt={this.state.price * this.state.total} ccyDetails={ccyDetails}/>
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

BTCTracker.defaultProps = {
    onPriceRefresh: function(new_price){}
}