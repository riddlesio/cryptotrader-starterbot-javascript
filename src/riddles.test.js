const ccxt = require('./ccxt');

function getDataProxyMock() {
    const mock = jest.fn();
    mock.stacks = { BTC: 100, ETH: 10 };
    mock.markets = [
        {
            symbol: 'BTC_ETH',
            baseAsset: 'BTC',
            quoteAsset: 'ETH',
        },
        { symbol: 'USDT_ETH', baseAsset: 'USDT', quoteAsset: 'ETH', filters: {} },
        { symbol: 'USDT_BTC', baseAsset: 'USDT', quoteAsset: 'BTC', filters: {} },
    ];
    return mock;
}

function getExchange(proxy) {
    const exchange = new ccxt.riddles();
    exchange.setDataProxy(proxy || getDataProxyMock());
    return exchange;
}

test('fetchBalances', async () => {
    const exchange = getExchange();
    return expect(exchange.fetchBalance()).resolves.toEqual({
        BTC: {
            free: 100,
            total: 100,
            used: 0,
        },
        ETH: {
            free: 10,
            total: 10,
            used: 0,
        },
        free: { BTC: 100, ETH: 10 },
        total: { BTC: 100, ETH: 10 },
        used: { BTC: 0, ETH: 0 },
    });
});

test('calculateFee', async () => {
    const exchange = getExchange();
    let markets = await exchange.loadMarkets();
    // console.log(markets);
    let result = exchange.calculateFee('BTC/ETH', null, 'buy', 1, 10);
    expect(result.currency).toEqual('BTC');
    expect(result.rate).toEqual(0.002);
    expect(result.cost).toEqual(0.002);

    let result2 = exchange.calculateFee('BTC/ETH', null, 'buy', 2, 10);
    expect(result2.currency).toEqual('BTC');
    expect(result2.rate).toEqual(0.002);
    expect(result2.cost).toEqual(0.004);

    let result3 = exchange.calculateFee('BTC/ETH', null, 'sell', 2, 10);
    expect(result3.currency).toEqual('ETH');
    expect(result3.rate).toEqual(0.002);
    expect(result3.cost).toEqual(0.04);
});
