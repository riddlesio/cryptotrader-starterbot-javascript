/**
 * This file is part of the Crypto Trader JavaScript starter bot
 *
 * @author Dino Hensen <dino@riddles.io>
 * @License MIT License (http://opensource.org/Licenses/MIT)
 */
'use strict';
var ccxt = require('ccxt');
ccxt.riddles = require('./riddles');
module.exports = ccxt;
