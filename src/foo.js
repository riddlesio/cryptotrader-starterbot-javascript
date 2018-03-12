const ccxt = require('ccxt');

const exchange = new ccxt.binance();

const ohlcv = exchange => {
    let date = new Date();
    date.setHours(date.getHours() - 1); // last hour
    console.log(new Date());
    console.log(date);
    let since = date.getTime();
    console.log(since);
    exchange.fetchOHLCV('ETH/BTC', '5m', since).then(res => {
        for (let ohlcv of res) {
            let date = new Date(ohlcv.shift());
            const [open, high, low, close, volume] = ohlcv;
            console.log({ date, open, high, low, close, volume });
        }
        console.log(res.length);
    });
};

const ticker = exchange => {
    exchange.fetchTicker('ETH/BTC').then(res => {
        console.log(res);
    });
};

(async () => {
    await exchange.loadMarkets();

    // ohlcv(exchange);
    ticker(exchange);
})();
