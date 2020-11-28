import React from 'react';
import $ from 'jquery';
import './btc_tracker.css'
import Ccy from './ccy'
// https://github.com/FortAwesome/react-fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRedo, faCaretDown, faCaretUp } from '@fortawesome/free-solid-svg-icons'

const CRYPTO_ID = 'crypto_id'
const CHANGE_TIME_FRAME_IN_SECS = 86400
// https://www.pluralsight.com/guides/create-a-real-time-bitcoin-price-tracker-in-reactjs
export default class BTCTracker extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      price: 0.00,
      prev_price: 0.00,
      total: 2.4264
    }
  }

  componentDidMount() {
    this.queryPrice();
    this.fetch();
  }

  queryPrice() {
    var context = this;

    $.ajax({
        url: "https://api.coinbase.com/v2/prices/spot?currency=GBP",
        dataType: "json",
        method: "GET",
        success: function(response) {
            let crypto_details
            context.props.db.upsert(CRYPTO_ID, function (doc) {
                  const now_in_secs = Math.round(new Date().getTime()/1000)
                  // TODO: why is %deff Nan after refresh (for a sec)
                  // TODO: get from ui
                  // TODO: if diff is 0 then dont show arrow
                  doc.total = 2.4264
                  if (!doc.time_marker || now_in_secs - doc.time_marker >= CHANGE_TIME_FRAME_IN_SECS)
                  {
                    doc.time_marker = now_in_secs
                    doc.prev_price = context.state.price
                  }
                  crypto_details = doc
                  return doc;
            }).then(function (res) {
                  context.setState({
                    price: response.data.amount,
                    prev_price: crypto_details.prev_price
                  }, function(){
                        context.props.onPriceRefresh(context.state.price, context.getHoldings())
                  });
            }).catch(function (err) {
              // TODO: handle error
            });
    }
  });
  }

  fetch() {
    var context = this;
    window.setInterval(function() {
      context.queryPrice();
    }, 100000);
  }

  getHoldings() {
    return this.state.price * this.state.total
  }

  getTimeChange() {
    const diff = this.state.price - this.state.prev_price
    const per = ((diff / this.state.prev_price) * 100).toFixed(2)
    return per > 0 ? '+' + per : per
  }

  render() {
    const {ccyDetails} = this.props
    const time_change = this.getTimeChange()
    return (
      <div>
          <div className="tracker_row tracker_head">
              <div className="tracker_td">COIN</div>
              <div className="tracker_td">PRICE</div>
              <div className="tracker_td">
              HOLDINGS
              <FontAwesomeIcon icon={faRedo} className="refresh ml-2" onClick={() => this.queryPrice()}/>
              </div>
          </div>
          <div className="tracker_row">
              <div className="tracker_td"><img src="./btc.png"className="mr-1" />BTC</div>
              <div className="tracker_td">
                   <Ccy amt={this.state.price} ccyDetails={ccyDetails}/>
              </div>
              <div className="tracker_td">
                   <Ccy amt={this.getHoldings()} ccyDetails={ccyDetails}/>
              </div>
          </div>
          <div className="tracker_row">
              <div className="tracker_td">
                   <span className="total_coins">{this.state.total}</span>
              </div>
              <div className="tracker_td">
                   <span className="total">
                        {CHANGE_TIME_FRAME_IN_SECS / 3600}HR <span className={time_change >= 0 ? 'pos' : 'neg'}>{time_change}%
                        <FontAwesomeIcon icon={time_change >= 0 ? faCaretUp : faCaretDown}/></span>
                   </span>
              </div>
              <div className="tracker_td"></div>
          </div>
      </div>
    );
  }
}

BTCTracker.defaultProps = {
    onPriceRefresh: function(new_price){}
}