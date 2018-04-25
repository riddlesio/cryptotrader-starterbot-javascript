const utils = require('./utils');


module.exports = class CommandDelegator {
    constructor(bot, dataProxy) {
        this.bot = bot;
        this.dataProxy = dataProxy;
    }

    handleLine(data) {
        // stop if line doesn't contain anything
        if (data.length === 0) {
            return;
        }

        const lines = data.trim().split('\n');

        while (0 < lines.length) {
            const line = lines.shift().trim();
            const lineParts = line.split(' ');

            // stop if lineParts doesn't contain anything
            if (lineParts.length === 0) {
                return;
            }

            // get the input command and convert to camel case
            const command = utils.toCamelCase(lineParts.shift());

            // invoke command if function exists and pass the data along
            // then return response if exists
            if (this[command] instanceof Function) {
                const response = this[command](lineParts);

                if (response && 0 < response.length) {
                    process.stdout.write(response + '\n');
                }
            } else {
                process.stderr.write(
                    'Unable to execute command: ' + command + ', with data: ' + lineParts + '\n'
                );
            }
        }
    }

    /**
     *
     * @param {Array} data
     * @returns {String | null}
     */
    action(data) {
        if (data[0] === 'order') {
            // this.state.timebank = parseInt(data[1], 10);
            const timebank = parseInt(data[1], 10);
            return this.bot.step(timebank);
        }
    }

    /**
     * Writes a setting to ...
     * @param {Array} data
     */
    settings(data) {
        // acts on self? or bot?
        const key = data[0];
        const value = data[1];

        // set key to value
        switch (key) {
            case 'candle_format':
                this.bot.gameSettings.candle_format = value.split(',');
                break;
            case 'timebank':
            case 'time_per_move':
            case 'candle_interval':
            case 'candles_total':
            case 'candles_given':
            case 'initial_stack':
                this.bot.gameSettings[key] = Number.parseInt(value);
                break;
            default:
                this.bot.gameSettings[key] = value;
        }
    }
    /**
     * Called when the engine sends an `update` message.
     * This function either updates the game data (field or round) or
     * the player data.
     *
     * @param {Array} data
     */
    update(data) {
        const command = data.shift();

        if (command === 'game') {
            this.updateGame(data);
            return;
        }
    }

    /**
     * Updates the game state with data provided by the engine
     *
     * @param {Array} data
     */
    updateGame(data) {
        switch (data[0]) {
            case 'next_candles':
                this.updateChart(data[1]);
                break;
            case 'stacks':
                this.updateStacks(data[1]);
                break;
            default:
                console.error(`Cannot parse game data input with key ${data[0]}`);
        }
    }

    updateChart(data) {
        return;
        const chartStrings = data.split(';');
        let dateUpdated = false;

        for (const candleString of chartStrings) {
            let candle = new Candle(this.bot.gameSettings.candle_format, candleString);
            if (!this.state.charts.hasOwnProperty(candle.pair)) {
                this.state.charts[candle.pair] = new Chart();
            }
            this.state.charts[candle.pair].addCandle(candle);

            if (!dateUpdated) {
                this.state.date = candle.date;
                dateUpdated = true;
            }
        }
    }

    updateStacks(data) {
        return;
        const stackStrings = data.split(',');
        for (const stackString of stackStrings) {
            const parts = stackString.split(':');
            if (!this.state.stacks.hasOwnProperty(parts[0])) {
                this.state.stacks[parts[0]] = {};
            }
            this.state.stacks[parts[0]] = Number.parseFloat(parts[1]);
        }
    }
};
