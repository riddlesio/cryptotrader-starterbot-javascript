/**
 * This file is part of the Crypto Trader JavaScript starter bot
 *
 * @author Dino Hensen <dino@riddles.io>
 * @License MIT License (http://opensource.org/Licenses/MIT)
 */
'use strict';

const { InsufficientFunds } = require('ccxt');

module.exports = class ExchangeDataProxy {
    constructor() {
        this.orderCount = 0;
        this.orders = [];
        this.stacks = {};
        this.markets = [];
        this.candles = {};
        this.lastDate = undefined;
        this.candleIndexToKey = ['pair', 'date', 'high', 'low', 'open', 'close', 'volume'];
        this.outputStream = process.stdout;
    }

    setOutputStream(stream) {
        this.outputStream = stream;
        this.outputStream.on('error', err => {
            console.error(err.toString('utf8'));
        });
    }

    clearStacks() {
        this.stacks = {};
    }

    updateStacks(stacksString) {
        const stackStrings = stacksString.split(',');
        this.clearStacks();
        for (const stackString of stackStrings) {
            const parts = stackString.split(':');
            this.updateStack(parts[0], Number.parseFloat(parts[1]));
        }
    }

    updateStack(marketId, stack) {
        this.stacks[marketId] = stack;
    }

    getStacks() {
        return this.stacks;
    }

    getBalance(symbol) {
        return this.stacks[symbol];
    }

    addMarket(marketId) {
        const [quote, base] = marketId.split('_');
        const market = {
            id: marketId,
            symbol: `${base}/${quote}`,
            baseAsset: base,
            quoteAsset: quote,
        };
        this.markets.push(market);
    }

    getMarkets() {
        return this.markets;
    }

    addCandleByString(multiCandleString, initializeMarkets) {
        for (let candleString of multiCandleString.split(';')) {
            let candleDataIndexed = candleString.split(',');
            const candleData = {};
            for (let index in candleDataIndexed) {
                let key = this.candleIndexToKey[index];
                candleData[key] = this.formatCandleValue(key, candleDataIndexed[index]);
            }
            if (initializeMarkets === true) {
                this.addMarket(candleData.pair);
            }
            this.addCandle(candleData);
        }
    }

    formatCandleValue(key, value) {
        switch (key) {
            case 'date':
                return value * 1000;
            case 'high':
            case 'low':
            case 'open':
            case 'close':
            case 'volume':
                return Number.parseFloat(value);
            default:
                return value;
        }
    }

    addCandle(candleData) {
        const marketId = candleData.pair;
        delete candleData.pair;
        if (!(marketId in this.candles)) {
            this.candles[marketId] = [];
        }
        this.candles[marketId].push(candleData);
        this.setLastDate(candleData.date);
    }

    getCandles() {
        return this.candles;
    }

    setCandleFormat(formatString) {
        this.candleIndexToKey = formatString.split(',');
    }

    addOrder(market, amount, side) {
        let requiredBalanceCurrency = side == 'buy' ? market.quote : market.base;
        if (typeof market.id === 'undefined') {
            throw new Error('market.id is undefined');
        }
        let candlesForMarket = this.candles[market.id];
        let tickerClosePrice = candlesForMarket[candlesForMarket.length - 1].close;
        let priceFactor = side == 'buy' ? tickerClosePrice : 1 / tickerClosePrice;
        let balance = this.getBalance(requiredBalanceCurrency);
        // sell is easy: just check if you have the amount
        let requiredAmount = amount;
        // buy needs to convert the other currency with current price
        if (side == 'buy') {
            requiredAmount *= priceFactor;
        }
        if (balance < requiredAmount) {
            throw new InsufficientFunds(
                `not enough: you want to ${side} ${amount} ${
                market.base
                } requiring ${requiredAmount} ${requiredBalanceCurrency} on ${
                market.id
                } but you have only ${balance} ${requiredBalanceCurrency}`
            );
        }
        this.stacks[requiredBalanceCurrency] -= requiredAmount;
        // the currency that is gained from a buy or a sell is added to stack in the next round of the game
        this.orders.push({
            side: side,
            marketId: market.id,
            amount: amount,
        });
        this.orderCount++;
        return {
            time: this.getLastDate(),
            orderId: this.orderCount,
            type: 'market',
            side: side,
            price: tickerClosePrice,
            amount: amount,
            cost: undefined,
            filled: amount,
            remaining: 0, // amount - filled
            status: 'open',
            symbol: market.symbol,
            fee: undefined,
        };
    }

    getOrders() {
        return this.orders;
    }

    flushOrders(cb) {
        let command = 'pass';

        if (this.getOrders().length > 0) {
            command = this.getOrders()
                .map(order => `${order.side} ${order.marketId} ${order.amount}`)
                .join(';');
        }

        this.outputStream.write(command, null, cb);
    }

    getLastDate() {
        return this.lastDate;
    }

    setLastDate(date) {
        this.lastDate = date;
    }
};
