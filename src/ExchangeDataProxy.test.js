const ExchangeDataProxy = require('./ExchangeDataProxy');

test('update stacks', () => {
    const proxy = new ExchangeDataProxy();
});

test('update stacks', () => {
    const proxy = new ExchangeDataProxy();

    // pair,date,high,low,open,close,volume
    // USDT_ETH,1516147200,1090.1676815,1022.16791604,1023.1,1029.99999994,1389783.7868468

    proxy.updateData({
        markets: [{ symbol: 'USDT_BTC' }, { symbol: 'USDT_ETH' }, { symbol: 'BTC_ETH' }],
        tickers: [
            {
                pair: 'USDT_BTC',
                date: 1516147200,
                open: 1023.1,
                high: 1090.1676815,
                low: 1022.16791604,
                close: 1029.99999994,
                volume: 1389783.7868468,
            },
        ],
    });
});
