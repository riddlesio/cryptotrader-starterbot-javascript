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
    mock.candles = {
        BTC_ETH: [
            {
                date: 1516752000000,
                high: 0.09106666,
                low: 0.0903014,
                open: 0.09099898,
                close: 0.09060045,
                volume: 41.29626163,
            },
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
    };
    return mock;
}

function getExchange(proxy) {
    const exchange = new ccxt.riddles();
    exchange.setDataProxy(proxy || getDataProxyMock());
    return exchange;
}

test('fetchBalances returns the correct balance', async () => {
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

test('calculateFee calculates the correct fee rate and cost', async () => {
    const exchange = getExchange();
    await exchange.loadMarkets();
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

test('fetchTicker returns single ticker', () => {
    const exchange = getExchange();
    return exchange.fetchTicker('BTC/ETH').then(data => {
        const map = {
            high: 0.090995,
            low: 0.09040017,
            open: 0.09060023,
            close: 0.09069601,
            last: 0.09069601,
            baseVolume: 39.15071531,
        };
        for (key in map) {
            expect(data.key).toEqual(map.key);
        }
    });
});

test('fetchTickers returns one or more tickers', async () => {
    const exchange = getExchange();

    const keyCountEquals = expectedKeyCount => object => {
        expect(Object.keys(object).length).toEqual(expectedKeyCount);
        return object;
    };

    // use case 1: get all tickers
    await exchange.fetchTickers().then(keyCountEquals(3));

    // use case 2: get tickers based on  list of symbols
    await exchange.fetchTickers(['BTC/ETH']).then(keyCountEquals(1));
    await exchange.fetchTickers(['BTC/ETH', 'USDT/ETH']).then(keyCountEquals(2));

    // use case 2.1: you are asking the same thing twice, you get it once
    await exchange.fetchTickers(['BTC/ETH', 'BTC/ETH']).then(keyCountEquals(1));

    // use case 3: get tickers whose symbols are substrings of the input string
    await exchange.fetchTickers('foo BTC/ETH bar USDT/ETH').then(keyCountEquals(2));
});

test('fetchOHLCV returns candles', async () => {
    const exchange = getExchange();

    await exchange.fetchOHLCV('BTC/ETH').then(data => {
        expect(data).toEqual([
            [1516752000000, 0.09099898, 0.09106666, 0.0903014, 0.09060045, 41.29626163],
            [1516753800000, 0.09060023, 0.090995, 0.09040017, 0.09069601, 39.15071531],
        ]);
    });
});

test('fetchOHLCV can be limited', async () => {
    const exchange = getExchange();

    await exchange.fetchOHLCV('BTC/ETH').then(data => {
        expect(data).toHaveLength(2);
    });

    await exchange.fetchOHLCV('BTC/ETH', '30m', undefined, 1).then(data => {
        expect(data).toHaveLength(1);
    });
});

test('fetchOHLCV since date', async () => {
    const exchange = getExchange();

    await exchange.fetchOHLCV('BTC/ETH', '30m', 1516753800000).then(data => {
        expect(data).toHaveLength(1);
    });
});
