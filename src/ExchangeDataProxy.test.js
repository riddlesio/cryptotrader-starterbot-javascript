const ExchangeDataProxy = require('./ExchangeDataProxy');
const { NotSupported, InsufficientFunds } = require('ccxt');

test('update stacks', () => {
    const proxy = new ExchangeDataProxy();
    proxy.updateStack('BTC:0.00000000,ETH:0.00000000,USDT:1000.00');
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

function getDataProxy() {
    const proxy = new ExchangeDataProxy();
    proxy.addCandleByString(
        'BTC_ETH,1516753800,0.090995,0.09040017,0.09060023,0.09069601,39.15071531;USDT_ETH,1516753800,976.99644142,955.99999998,974.87665079,960.00160798,316622.92602686;USDT_BTC,1516753800,10806.92999962,10501,10748.4213653,10575.00000019,1618333.6451304'
    );
    proxy.addMarket('BTC_ETH');
    return proxy;
}

test('should throw exception if now enough available to buy', async () => {
    const proxy = getDataProxy();
    proxy.getBalance = jest.fn();
    proxy.getBalance.mockReturnValue('0');
    // we can only buy 1 BTC
    let market = {
        id: 'BTC_ETH',
        base: 'BTC',
        quote: 'ETH',
    };
    expect(() => {
        proxy.addOrder(market, 2, 'buy');
    }).toThrow(InsufficientFunds);
});

test('should call getBalance for ETH when buying BTC', async () => {
    const proxy = getDataProxy();
    proxy.getBalance = jest.fn();
    let market = {
        id: 'BTC_ETH',
        base: 'BTC',
        quote: 'ETH',
    };
    // when buying BTC/ETH you need enough ETH, check that getBalance is called for ETH
    proxy.addOrder(market, 'market', 'buy', 1);
    expect(proxy.getBalance).toBeCalledWith('ETH');
});

test('should call getBalance for BTC when selling ETH', async () => {
    const proxy = getDataProxy();
    proxy.getBalance = jest.fn();
    let market = {
        id: 'BTC_ETH',
        base: 'BTC',
        quote: 'ETH',
    };
    proxy.addOrder(market, 'market', 'sell', 1);
    expect(proxy.getBalance).toBeCalledWith('BTC');
});
