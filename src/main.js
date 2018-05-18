/**
 * This file is part of the Crypto Trader JavaScript starter bot
 *
 * @author Dino Hensen <dino@riddles.io>
 * @License MIT License (http://opensource.org/Licenses/MIT)
 *
 * __main__
 */

const readline = require('readline');
const Bot = require('./Bot');
const ExchangeDataProxy = require('./ExchangeDataProxy');
const CommandDelegator = require('./CommandDelegator');
const ccxt = require('./ccxt');
const exchange = new ccxt.riddles();
const bot = new Bot(exchange);
const dataProxy = new ExchangeDataProxy();
const commandDelegator = new CommandDelegator(bot, dataProxy);
exchange.setDataProxy(dataProxy);

// todo: create a CommandDelegator that holds dataProxy and bot

function run() {
    this.io = readline.createInterface(process.stdin, process.stdout);
    this.io.on('line', commandDelegator.handleLine.bind(commandDelegator));
    this.io.on('close', () => {
        process.exit(0);
    });
}

run();
