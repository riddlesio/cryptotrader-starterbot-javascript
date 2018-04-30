const { InsufficientFunds } = require('ccxt');

module.exports = class ExchangeDataProxy {
    constructor() {
        this.orderCount = 0;
        this.orders = [];
        this.stacks = {};
        this.markets = [];
        this.candles = {};
        this.lastDate = undefined;
        this.candleIndexToKey = [];
    }

    clearStacks() {
        this.stacks = {};
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
        const [base, quote] = marketId.split('_');
        const market = {
            symbol: marketId,
            baseAsset: base,
            quoteAsset: quote,
        };
        this.markets.push(market);
    }

    getMarkets() {
        return this.markets;
    }

    addCandleByString(multiCandleString) {
        for (let candleString of multiCandleString.split(';')) {
            let candleDataIndexed = candleString.split(',');
            const candleData = {};
            for (let index in candleDataIndexed) {
                let key = this.candleIndexToKey[index];
                candleData[key] = this.formatCandleValue(key, candleDataIndexed[index]);
            }
            // TODO: mult timestamp *1000, rest to float
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
    }

    getCandles() {
        return this.candles;
    }

    setCandleFormat(formatString) {
        this.candleIndexToKey = formatString.split(',');
    }

    addOrder(market, amount, side) {
        let requiredBalanceCurrency = side == 'buy' ? market.quote : market.base;
        let sourceBalanceCurrency = side == 'sell' ? market.quote : market.base;

        let tickerClosePrice = this.candles[this.candles[market.id].length - 1];

        let priceFactor = side == 'buy' ? tickerClosePrice : 1 / tickerClosePrice;
        let balance = this.dataProxy.getBalance(requiredBalanceCurrency);
        let requiredAmount = amount * priceFactor;
        if (balance < requiredAmount) {
            throw new InsufficientFunds(
                `not enough: you want to ${side} ${amount} ${sourceBalanceCurrency} requiring ${requiredAmount} ${requiredBalanceCurrency} on ${symbol} but you have only ${balance} ${requiredBalanceCurrency}`
            );
        }

        this.stacks[market.id] -= amount;
        this.orders.push({
            side: side,
            marketId: market.id,
            amount: amount,
        });
        let price = undefined;

        this.orderCount++;
        return {
            time: this.getLastDate(),
            orderId: this.orderCount,
            type: 'market',
            side: side,
            price: price,
            amount: amount,
            cost: undefined,
            filled: amount,
            remaining: 0, // amount - filled
            status: 'open',
            symbol: 'BTC/ETH',
            fee: undefined,
        };
    }

    getLastDate() {
        return this.lastDate;
    }
};
