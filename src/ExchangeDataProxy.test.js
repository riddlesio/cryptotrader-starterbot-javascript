/**
 * This file is part of the Crypto Trader JavaScript starter bot
 *
 * @author Dino Hensen <dino@riddles.io>
 * @License MIT License (http://opensource.org/Licenses/MIT)
 */
'use strict';

const ExchangeDataProxy = require('./ExchangeDataProxy');
const { NotSupported, InsufficientFunds } = require('ccxt');
const { Writable } = require('stream');

describe('updateStacks', () => {
    test('update stacks', () => {
        const proxy = new ExchangeDataProxy();
        proxy.updateStack = jest.spyOn(proxy, 'updateStack');
        proxy.updateStacks('BTC:0.00000000,ETH:0.00000000,USDT:1000.00');
        expect(proxy.updateStack).toHaveBeenCalledTimes(3);
        expect(proxy.updateStack).toHaveBeenCalledWith('BTC', expect.anything());
        expect(proxy.updateStack).toHaveBeenCalledWith('ETH', expect.anything());
        expect(proxy.updateStack).toHaveBeenCalledWith('USDT', expect.anything());

        expect(proxy.getBalance('USDT')).toEqual(1000);
        expect(proxy.getBalance('BTC')).toEqual(0);
        expect(proxy.getBalance('ETH')).toEqual(0);
    });
});

describe('addCandleByString', () => {
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
});

describe('should properly initialize market quote and base', () => {
    test('BTC_ETH market should have ETH as base', () => {
        const proxy = new ExchangeDataProxy();
        proxy.addMarket('BTC_ETH');
        expect(proxy.markets[0].baseAsset).toEqual('ETH');
        expect(proxy.markets[0].quoteAsset).toEqual('BTC');
    });

    test('USDT_BTC market should have BTC as base', () => {
        const proxy = new ExchangeDataProxy();
        proxy.addMarket('USDT_BTC');
        expect(proxy.markets[0].baseAsset).toEqual('BTC');
        expect(proxy.markets[0].quoteAsset).toEqual('USDT');
    });

    test('USDT_ETH market should have ETH as base', () => {
        const proxy = new ExchangeDataProxy();
        proxy.addMarket('USDT_ETH');
        expect(proxy.markets[0].baseAsset).toEqual('ETH');
        expect(proxy.markets[0].quoteAsset).toEqual('USDT');
    });
});

function getDataProxy() {
    const proxy = new ExchangeDataProxy();
    proxy.addCandleByString(
        'BTC_ETH,1516753800,0.090995,0.09040017,0.09060023,0.09069601,39.15071531;USDT_ETH,1516753800,976.99644142,955.99999998,974.87665079,960.00160798,316622.92602686;USDT_BTC,1516753800,10806.92999962,10501,10748.4213653,10575.00000019,1618333.6451304'
    );
    proxy.updateStacks('BTC:0.00000000,ETH:0.00000000,USDT:1000.00');
    proxy.addMarket('BTC_ETH');
    proxy.addMarket('USDT_ETH');
    proxy.addMarket('USDT_BTC');
    return proxy;
}

describe('addOrder', () => {
    test('should throw exception if now enough available to buy', async () => {
        const proxy = getDataProxy();
        proxy.getBalance = jest.fn();
        proxy.getBalance.mockReturnValue('0');
        // we can only buy 1 BTC
        let market = {
            id: 'BTC_ETH',
            base: 'ETH',
            quote: 'BTC',
            symbol: 'ETH/BTC',
        };
        expect(() => {
            proxy.addOrder(market, 2, 'buy');
        }).toThrow(InsufficientFunds);
    });

    test('should call getBalance for BTC when buying ETH', async () => {
        const proxy = getDataProxy();
        proxy.getBalance = jest.fn();
        let market = {
            id: 'BTC_ETH',
            base: 'ETH',
            quote: 'BTC',
            symbol: 'ETH/BTC',
        };
        // when buying ETH/BTC you need enough ETH, check that getBalance is called for ETH
        proxy.addOrder(market, 1, 'buy');
        expect(proxy.getBalance).toBeCalledWith('BTC');
    });

    test('should call getBalance for BTC when selling ETH', async () => {
        const proxy = getDataProxy();
        proxy.getBalance = jest.fn();
        let market = {
            id: 'BTC_ETH',
            base: 'ETH',
            quote: 'BTC',
            symbol: 'ETH/BTC',
        };
        proxy.addOrder(market, 1, 'sell');
        expect(proxy.getBalance).toBeCalledWith('ETH');
    });

    test('should not be able to buy again after you ran out of currency', async () => {
        const proxy = getDataProxy();
        let market = {
            id: 'USDT_BTC',
            base: 'BTC',
            quote: 'USDT',
            symbol: 'BTC/USDT',
        };
        expect(proxy.getBalance('USDT')).toEqual(1000);
        proxy.addOrder(market, 0.09, 'buy');
        expect(proxy.getBalance('USDT')).toBeCloseTo(48.25, 2);
        expect(() => {
            proxy.addOrder(market, 1000, 'sell');
        }).toThrow(InsufficientFunds);
    });

    test('should not be able to sell this much BTC if you dont have it', () => {
        const proxy = getDataProxy();
        let market = {
            id: 'USDT_BTC',
            base: 'BTC',
            quote: 'USDT',
            symbol: 'BTC/USDT',
        };
        expect(proxy.getBalance('BTC')).toEqual(0);
        expect(() => {
            proxy.addOrder(market, 1, 'sell');
        }).toThrow(InsufficientFunds);
    });
});

describe('flush orders', () => {
    test('should print orders to a stream', () => {
        const proxy = getDataProxy();
        let orders = [
            { side: 'sell', marketId: 'USDT_BTC', amount: 333 },
            { side: 'buy', marketId: 'BTC_ETH', amount: 333 },
            { side: 'sell', marketId: 'USDT_ETH', amount: 333 },
        ];
        proxy.getOrders = jest.fn();
        proxy.getOrders.mockReturnValue(orders);
        var output = '';
        let someStream = new Writable({
            write(chunk, encoding, callback) {
                output += chunk.toString();
                callback();
            },
        });
        proxy.setOutputStream(someStream);
        proxy.flushOrders(() => {
            expect(output).toEqual('sell USDT_BTC 333;buy BTC_ETH 333;sell USDT_ETH 333\n');
        });
    });

    test('can not have more than one order per pair', () => {
        const proxy = getDataProxy();
        let orders = [
            { side: 'buy', marketId: 'USDT_BTC', amount: 10 },
            { side: 'buy', marketId: 'USDT_BTC', amount: 10 },
        ];
        proxy.getOrders = jest.fn(() => orders);

        var output = '';
        let someStream = new Writable({
            write(chunk, encoding, callback) {
                output += chunk.toString();
                callback();
            },
        });
        proxy.setOutputStream(someStream);
        proxy.flushOrders(() => {
            expect(output).toEqual('buy USDT_BTC 20\n');
        });
    });
});
