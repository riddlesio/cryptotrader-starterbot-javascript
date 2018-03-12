/**
 * This file is part of the Crypto Trader JavaScript starter bot
 *
 * Last update: February 27, 2018
 *
 * @author Dino Hensen <dino@riddles.io>
 * @License MIT License (http://opensource.org/Licenses/MIT)
 *
 * __main__
 */

const readline = require('readline');
const Bot = require('./src/Bot');
const ccxt = require('./src/ccxt');
const exchange = new ccxt.riddles();
const dataProxy = exchange.getDataProxy();
const bot = new Bot(exchange);

function run() {
    this.io = readline.createInterface(process.stdin, process.stdout);
    this.io.on('line', dataProxy.handleLine);
    this.io.on('close', () => {
        process.exit(0);
    });
}

run();
