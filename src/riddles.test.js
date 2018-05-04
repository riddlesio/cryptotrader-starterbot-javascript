/**
 * This file is part of the Crypto Trader JavaScript starter bot
 *
 * @author Dino Hensen <dino@riddles.io>
 * @License MIT License (http://opensource.org/Licenses/MIT)
 */
'use strict';

const { NotSupported, InsufficientFunds } = require('ccxt');

const ccxt = require('./ccxt');
const ExchangeDataProxy = require('./ExchangeDataProxy');
jest.mock('./ExchangeDataProxy');

function getExchange() {
    const exchange = new ccxt.riddles();
    exchange.setDataProxy(ExchangeDataProxy());
    return exchange;
}

const expectExchangeError = errorType => err => {
    expect(err).toBeInstanceOf(errorType);
};

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
        for (let key in Object.keys(map)) {
            expect(data[key]).toEqual(map[key]);
        }
    });
});

test('fetchTickers returns one or more tickers', async () => {
    const exchange = getExchange();

    const keyCountEquals = expectedKeyCount => object => {
        expect(Object.keys(object)).toHaveLength(expectedKeyCount);
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

test('fetchOHLCV throws error for wrong timeframe', async () => {
    const exchange = getExchange();
    expect.assertions(4);
    await exchange
        .fetchOHLCV('BTC/ETH', '1m', 1516753800000)
        .catch(expectExchangeError(NotSupported));
    await exchange
        .fetchOHLCV('BTC/ETH', '3m', 1516753800000)
        .catch(expectExchangeError(NotSupported));
    await exchange
        .fetchOHLCV('BTC/ETH', '5m', 1516753800000)
        .catch(expectExchangeError(NotSupported));
    await exchange
        .fetchOHLCV('BTC/ETH', '15m', 1516753800000)
        .catch(expectExchangeError(NotSupported));
});

describe('createOrder', () => {
    test('should return an order', async () => {
        const exchange = getExchange();
        const dataProxy = exchange.getDataProxy();
        const order = await exchange.createOrder('BTC/ETH', 'market', 'buy', 1);
        expect(dataProxy.addOrder).toBeCalledWith(exchange.market('BTC/ETH'), 1, 'buy');
        expect(order.amount).toEqual(1);
        expect(order.side).toEqual('BUY');
        expect(order.symbol).toEqual('BTC/ETH');
    });
});
