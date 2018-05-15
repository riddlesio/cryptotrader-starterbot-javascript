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
    let result = exchange.calculateFee('ETH/BTC', null, 'buy', 1, 10);
    expect(result.currency).toEqual('ETH');
    expect(result.rate).toEqual(0.002);
    expect(result.cost).toEqual(0.002);

    let result2 = exchange.calculateFee('ETH/BTC', null, 'buy', 2, 10);
    expect(result2.currency).toEqual('ETH');
    expect(result2.rate).toEqual(0.002);
    expect(result2.cost).toEqual(0.004);

    let result3 = exchange.calculateFee('ETH/BTC', null, 'sell', 2, 10);
    expect(result3.currency).toEqual('BTC');
    expect(result3.rate).toEqual(0.002);
    expect(result3.cost).toEqual(0.04);
});

test('fetchTicker returns single ticker', () => {
    const exchange = getExchange();
    return exchange.fetchTicker('ETH/BTC').then(data => {
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
    await exchange.fetchTickers(['ETH/BTC']).then(keyCountEquals(1));
    await exchange.fetchTickers(['ETH/BTC', 'ETH/USDT']).then(keyCountEquals(2));

    // use case 2.1: you are asking the same thing twice, you get it once
    await exchange.fetchTickers(['ETH/BTC', 'ETH/BTC']).then(keyCountEquals(1));

    // use case 3: get tickers whose symbols are substrings of the input string
    await exchange.fetchTickers('foo ETH/BTC bar ETH/USDT').then(keyCountEquals(2));
});

test('fetchOHLCV returns candles', async () => {
    const exchange = getExchange();

    await exchange.fetchOHLCV('ETH/BTC').then(data => {
        expect(data).toEqual([
            [1516752000000, 0.09099898, 0.09106666, 0.0903014, 0.09060045, 41.29626163],
            [1516753800000, 0.09060023, 0.090995, 0.09040017, 0.09069601, 39.15071531],
        ]);
    });
});

test('fetchOHLCV can be limited', async () => {
    const exchange = getExchange();

    await exchange.fetchOHLCV('ETH/BTC').then(data => {
        expect(data).toHaveLength(2);
    });

    await exchange.fetchOHLCV('ETH/BTC', '30m', undefined, 1).then(data => {
        expect(data).toHaveLength(1);
    });
});

test('fetchOHLCV since date', async () => {
    const exchange = getExchange();

    await exchange.fetchOHLCV('ETH/BTC', '30m', 1516753800000).then(data => {
        expect(data).toHaveLength(1);
    });
});

test('fetchOHLCV throws error for wrong timeframe', async () => {
    const exchange = getExchange();
    expect.assertions(4);
    await exchange
        .fetchOHLCV('ETH/BTC', '1m', 1516753800000)
        .catch(expectExchangeError(NotSupported));
    await exchange
        .fetchOHLCV('ETH/BTC', '3m', 1516753800000)
        .catch(expectExchangeError(NotSupported));
    await exchange
        .fetchOHLCV('ETH/BTC', '5m', 1516753800000)
        .catch(expectExchangeError(NotSupported));
    await exchange
        .fetchOHLCV('ETH/BTC', '15m', 1516753800000)
        .catch(expectExchangeError(NotSupported));
});

describe('createOrder', () => {
    test('should return an order', async () => {
        const exchange = getExchange();
        const dataProxy = exchange.getDataProxy();
        const order = await exchange.createOrder('ETH/BTC', 'market', 'buy', 1);
        expect(dataProxy.addOrder).toBeCalledWith(exchange.market('ETH/BTC'), 1, 'buy');
        expect(order.amount).toEqual(1);
        expect(order.side).toEqual('BUY');
        expect(order.symbol).toEqual('ETH/BTC');
    });
});
