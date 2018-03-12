const utils = require('./utils');
const Candle = require('./Candle');
const Chart = require('./Chart');

module.exports = class ExchangeDataProxy {
    constructor(bot) {
        this.bot = bot;
    }

    updateData(data) {
        this.data = data;
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

            // either call method on this or on the bot if it is a setting or action
            var subject = this;
            if (['action', 'settings'].includes(command)) {
                subject = this.bot;
            }

            // invoke command if function exists and pass the data along
            // then return response if exists
            if (subject[command] instanceof Function) {
                const response = subject[command](lineParts);

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
        const chartStrings = data.split(';');
        let dateUpdated = false;

        for (const candleString of chartStrings) {
            let candle = new Candle(this.gameSettings.candle_format, candleString);
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
