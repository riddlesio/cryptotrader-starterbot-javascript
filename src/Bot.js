/**
 * This file is part of the Crypto Trader JavaScript starter bot
 *
 * Last update: February 27, 2018
 *
 * @author Niko van Meurs <niko@riddles.io>
 * @author Dino Hensen <dino@riddles.io>
 * @License MIT License (http://opensource.org/Licenses/MIT)
 */
const readline = require('readline');
const utils = require('./utils');

module.exports = class Bot {
    constructor(exchange) {
        this.exchange = exchange;
        this.gameSettings = {
            timebank: null,
            time_per_move: null,
            player_names: null,
            your_bot: null,
            candle_interval: null,
            candle_format: null,
            candles_total: null,
            candles_given: null,
            initial_stack: null,
            transaction_fee_percent: 0.0,
        };
    }

    step(timebank) {
        console.log('pass');
    }
};
