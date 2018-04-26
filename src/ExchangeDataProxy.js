module.exports = class ExchangeDataProxy {
    constructor() {
        this.orders = [];
        this.stacks = {};
        this.markets = [];
        this.candles = {};
    }

    updateStack(stacks) {
        this.stacks = stacks;
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

    addCandle(candle) {
        this.candles.push(candle);
    }

    addOrder(order) {
        this.orders.push(order);
    }
};
