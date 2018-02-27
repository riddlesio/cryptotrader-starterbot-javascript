/**
 * This file is part of the Crypto Trader JavaScript starter bot
 *
 * Last update: February 27, 2018
 *
 * @author Dino Hensen <dino@riddles.io>
 * @License MIT License (http://opensource.org/Licenses/MIT)
 */
const Order = require('./Order');

module.exports = class HODLStrategy {
    constructor() {}

    execute(gameSettings, state) {
        const dollars = state.stacks['USDT'];
        const lastClosePrice = state.charts['USDT_ETH'].getCandleAt(state.date).close;
        const amount = dollars / lastClosePrice;

        if (amount < 0.01) {
            return 'pass';
        }

        const order = new Order('buy', 'USDT_ETH', amount);

        return order.toString();
    }
};
