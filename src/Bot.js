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
const Candle = require('./Candle');
const Chart = require('./Chart');
const HODLStrategy = require('./HODLStrategy');

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

        this.state = {
            date: null,
            charts: {},
            stacks: {},
        };

        this.strategy = new HODLStrategy();
    }

    /**
     * Writes a setting to the Bot.gameSettings object
     * @param {Array} data
     */
    settings(data) {
        const key = data[0];
        const value = data[1];

        // set key to value
        switch (key) {
            case 'candle_format':
                this.gameSettings.candle_format = value.split(',');
                break;
            case 'timebank':
            case 'time_per_move':
            case 'candle_interval':
            case 'candles_total':
            case 'candles_given':
            case 'initial_stack':
                this.gameSettings[key] = Number.parseInt(value);
                break;
            default:
                this.gameSettings[key] = value;
        }
    }

    /**
     * This function is executed every time the game engine requests the bot
     * to make a move. It executes the strategy defined in the constructor and
     * returns the resulting move, which is sent to the engine by the Bot.run method.
     *
     * @param {Array} data
     * @returns {String | null}
     */
    action(data) {
        if (data[0] === 'order') {
            this.state.timebank = parseInt(data[1], 10);
            return this.strategy.execute(this.gameSettings, this.state);
        }
    }
};
