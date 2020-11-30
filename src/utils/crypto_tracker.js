import React from 'react';
import $ from 'jquery';
import './crypto_tracker.css'
import Ccy from './ccy'
// https://github.com/FortAwesome/react-fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRedo, faCaretDown, faCaretUp } from '@fortawesome/free-solid-svg-icons'

const CRYPTO_ID = 'crypto_id'
const CHANGE_TIME_FRAME_IN_SECS = 86400
// https://www.pluralsight.com/guides/create-a-real-time-bitcoin-price-tracker-in-reactjs
class CryptoRow extends React.Component {

  render() {
    const {ccyDetails, time_change, coin, price, holdings, total_coins} = this.props

    return (
      <div>
          <div className="tracker_row">
              <div className="tracker_td"><img src={coin.img} className="mr-1" />{coin.code}</div>
              <div className="tracker_td">
                   <Ccy amt={price} ccyDetails={ccyDetails}/>
              </div>
              <div className="tracker_td">
                   <Ccy amt={holdings} ccyDetails={ccyDetails}/>
              </div>
          </div>
          <div className="tracker_row">
              <div className="tracker_td">
                   <span className="total_coins">{total_coins}</span>
              </div>
              <div className="tracker_td">
                   <span className="total">
                        {CHANGE_TIME_FRAME_IN_SECS / 3600}HR <span className={time_change >= 0 ? 'pos' : 'neg'}>{time_change}%
                        <FontAwesomeIcon icon={time_change >= 0 ? faCaretUp : faCaretDown} className="total_icon"/></span>
                   </span>
              </div>
              <div className="tracker_td"></div>
          </div>
      </div>
    );
  }
}
export default class CryptoTracker extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      price: 0.00,
      prev_price: 0.00,
      total: (2.4264 + 0.0107201)
    }
  }

  componentDidMount() {
    const coins = [{code: "BTC", img: "./btc.png"}, {code: "BTC", img: "./btc.png"}]
    this.queryPrice();
    this.fetch();
  }


  fetch() {
    var context = this;
    window.setInterval(function() {
      context.queryPrice();
    }, 100000);
  }

  getTimeChange() {
    const diff = this.state.price - this.state.prev_price
    const per = ((diff / this.state.prev_price) * 100).toFixed(2)
    return per > 0 ? '+' + per : per
  }

  getHoldings() {return this.state.price * this.state.total}

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
                  // TODO: why is %diff Nan after refresh (for a sec)
                  // TODO: toggle diff - % <-> amt
                  // TODO: get from ui
                  // TODO: if diff is 0 then dont show arrow
                  // TODO: have single record for each coin type
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

  render() {
    const {ccyDetails, coins} = this.props
    const time_change = this.getTimeChange()
    const coin = {code: "BTC", img: "./btc.png"}
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
          <CryptoRow ccyDetails={ccyDetails}
                     time_change={time_change}
                     holdings={this.getHoldings()}
                     coin={coin}
                     price={this.state.price}
                     total_coins={this.state.total}/>
      </div>
    );
  }
}

CryptoTracker.defaultProps = {
    onPriceRefresh: function(new_price){}
}