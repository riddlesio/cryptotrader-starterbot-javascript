/**
 * This file is part of the Crypto Trader JavaScript starter bot
 *
 * @author Dino Hensen <dino@riddles.io>
 * @License MIT License (http://opensource.org/Licenses/MIT)
 */
'use strict';

const mock = jest.fn().mockImplementation(() => {
    return {
        addOrder: jest.fn(() => ({
            time: 1525093039737,
            orderId: 1,
            type: 'market',
            side: 'BUY',
            price: undefined, // TODO: in implementation use current price
            amount: 1,
            cost: 1 * 10,
            filled: 1,
            remaining: 0, // amount - filled
            status: 'open',
            symbol: 'BTC/ETH',
            fee: undefined,
        })),
        getBalance: jest.fn(() => 12),
        getStacks: jest.fn(() => ({ BTC: 100, ETH: 10 })),
        getMarkets: jest.fn(() => [
            {
                symbol: 'BTC_ETH',
                baseAsset: 'BTC',
                quoteAsset: 'ETH',
                filters: {},
            },
            {
                symbol: 'USDT_ETH',
                baseAsset: 'USDT',
                quoteAsset: 'ETH',
                filters: {},
            },
            {
                symbol: 'USDT_BTC',
                baseAsset: 'USDT',
                quoteAsset: 'BTC',
                filters: {},
            },
        ]),
        getCandles: jest.fn(() => ({
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
        })),
    };
});

module.exports = mock;
