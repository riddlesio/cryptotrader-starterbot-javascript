const ExchangeDataProxy = require('./ExchangeDataProxy');

test('update stacks', () => {
    const proxy = new ExchangeDataProxy();
});

test('update candles', () => {
    const proxy = new ExchangeDataProxy();
    proxy.setCandleFormat('pair,date,high,low,open,close,volume');
    proxy.addCandleByString(
        'BTC_ETH,1516753800,0.090995,0.09040017,0.09060023,0.09069601,39.15071531;USDT_ETH,1516753800,976.99644142,955.99999998,974.87665079,960.00160798,316622.92602686;USDT_BTC,1516753800,10806.92999962,10501,10748.4213653,10575.00000019,1618333.6451304'
    );
    expect(proxy.getCandles()).toEqual({
        BTC_ETH: [
            {
                date: 1516753800000,
                high: 0.090995,
                low: 0.09040017,
                open: 0.09060023,
                close: 0.09069601,
                volume: 39.15071531,
            },
        ],
        USDT_ETH: [
            {
                date: 1516753800000,
                high: 976.99644142,
                low: 955.99999998,
                open: 974.87665079,
                close: 960.00160798,
                volume: 316622.92602686,
            },
        ],
        USDT_BTC: [
            {
                date: 1516753800000,
                high: 10806.92999962,
                low: 10501,
                open: 10748.4213653,
                close: 10575.00000019,
                volume: 1618333.6451304,
            },
        ],
    });
});
