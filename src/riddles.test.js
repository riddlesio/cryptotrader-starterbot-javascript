const ccxt = require('./ccxt');

function getDataProxyMock() {
    const mock = jest.fn();
    mock.stacks = { BTC: 100, ETH: 10 };
    mock.markets = [
        { symbol: 'BTC_ETH', filters: {} },
        { symbol: 'USDT_ETH', filters: {} },
        { symbol: 'USDT_BTC', filters: {} },
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
