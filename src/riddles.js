'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require('ccxt/js/base/Exchange');
const {
    ExchangeError,
    InsufficientFunds,
    OrderNotFound,
    InvalidOrder,
    NotSupported,
} = require('ccxt/js/base/errors');

//  ---------------------------------------------------------------------------

module.exports = class riddles extends Exchange {
    describe() {
        return this.deepExtend(super.describe(), {
            id: 'riddles',
            name: 'Riddles.io',
            countries: 'NL', // Netherlands
            rateLimit: 0,
            // new metainfo interface
            has: {
                CORS: false,
                publicAPI: false,
                privateAPI: false,
                cancelOrder: false,
                cancelOrders: false,
                createDepositAddress: false,
                createOrder: true,
                createMarketOrder: true,
                createLimitOrder: false,
                deposit: false,
                editOrder: 'emulated',
                fetchBalance: true,
                fetchBidsAsks: false,
                fetchClosedOrders: false,
                fetchCurrencies: true,
                fetchDepositAddress: false,
                fetchFundingFees: false,
                fetchL2OrderBook: false,
                fetchMarkets: true,
                fetchMyTrades: false,
                fetchOHLCV: true,
                fetchOpenOrders: false,
                fetchOrder: false,
                fetchOrderBook: false,
                fetchOrderBooks: false,
                fetchOrders: false,
                fetchTicker: true,
                fetchTickers: true,
                fetchTrades: true,
                withdraw: false,
            },
            timeframes: {
                '30m': '30m',
            },
            urls: {
                logo: 'https://static-content.riddles.io/logo-signature.png',
                api: 'https://docs.riddles.io/crypto-trader/api',
                www: 'https://playground.riddles.io/competitions/crypto-trader',
                doc: 'https://docs.riddles.io/crypto-trader/rules',
            },
            fees: {
                trading: {
                    tierBased: false,
                    percentage: true,
                    taker: 0.002,
                    maker: 0.002,
                },
                funding: {
                    tierBased: false,
                    percentage: false,
                },
            },
            // exchange-specific options
            options: {
                warnOnFetchOpenOrdersWithoutSymbol: true,
                recvWindow: 5 * 1000, // 5 sec, binance default
            },
            exceptions: {},
        });
    }

    setDataProxy(dataProxy) {
        this.dataProxy = dataProxy;
    }

    getDataProxy() {
        return this.dataProxy;
    }

    async fetchMarkets() {
        let markets = this.dataProxy.markets;
        let result = [];
        for (let i = 0; i < markets.length; i++) {
            let market = markets[i];
            let id = market['symbol'];
            let baseId = market['baseAsset'];
            let quoteId = market['quoteAsset'];
            let base = this.commonCurrencyCode(baseId);
            let quote = this.commonCurrencyCode(quoteId);
            let symbol = base + '/' + quote;
            let fixedPrecision = 10; // todo: find out game engine precision
            let precision = {
                base: fixedPrecision,
                quote: fixedPrecision,
                amount: fixedPrecision,
                price: fixedPrecision,
            };
            // lot size is deprecated as of 2018.02.06
            let lot = -1 * Math.log10(precision['amount']);
            let entry = {
                id: id,
                symbol: symbol,
                base: base,
                quote: quote,
                baseId: baseId,
                quoteId: quoteId,
                info: market,
                lot: lot, // lot size is deprecated as of 2018.02.06
                active: true,
                precision: precision,
                limits: {
                    amount: {
                        min: Math.pow(10, -precision['amount']),
                        max: undefined,
                    },
                    price: {
                        min: Math.pow(10, -precision['price']),
                        max: undefined,
                    },
                    cost: {
                        min: lot,
                        max: undefined,
                    },
                },
            };
            result.push(entry);
        }
        return result;
    }

    calculateFee(symbol, type, side, amount, price, takerOrMaker = 'taker', params = {}) {
        let market = this.markets[symbol];
        let key = 'quote';
        let rate = market[takerOrMaker];
        let cost = parseFloat(this.costToPrecision(symbol, amount * rate));
        if (side === 'sell') {
            cost *= price;
        } else {
            key = 'base';
        }
        return {
            type: takerOrMaker,
            currency: market[key],
            rate: rate,
            cost: parseFloat(this.feeToPrecision(symbol, cost)),
        };
    }

    async fetchBalance(params = {}) {
        await this.loadMarkets();
        let result = {};
        let balances = this.dataProxy.stacks;
        for (var asset in balances) {
            let currency = asset;
            if (currency in this.currencies_by_id)
                currency = this.currencies_by_id[currency]['code'];
            let value = balances[asset];
            let free = value; // set to stack value for now
            let locked = 0; // set to 0 for now
            let account = {
                free: parseFloat(free),
                used: parseFloat(locked),
                total: 0.0,
            };
            account['total'] = this.sum(account['free'], account['used']);
            result[currency] = account;
        }
        return this.parseBalance(result);
    }

    async fetchCurrencies(params = {}) {
        let result = {};
        let currencies = Object.keys(this.dataProxy.stacks);
        const precision = 10; // todo: fill in correct precision
        for (let currency of currencies) {
            result[currency] = {
                id: currency,
                code: currency.toUpperCase(),
                name: currency,
                active: true,
                status: 'ok',
                precision: precision,
                funding: {
                    withdraw: {
                        active: false,
                        fee: 100,
                    },
                    deposit: {
                        active: false,
                        fee: 100,
                    },
                },
                limits: {
                    amount: {
                        min: undefined,
                        max: Math.pow(10, precision),
                    },
                    price: {
                        min: Math.pow(10, -precision),
                        max: Math.pow(10, precision),
                    },
                    cost: {
                        min: undefined,
                        max: undefined,
                    },
                },
            };
        }
        return result;
    }

    parseTicker(ticker, market = undefined) {
        let timestamp = this.safeInteger(ticker, 'date');
        let iso8601 = typeof timestamp === 'undefined' ? undefined : this.iso8601(timestamp);
        let symbol = this.findSymbol(this.safeString(ticker, 'symbol'), market);
        return {
            symbol: symbol,
            timestamp: timestamp,
            datetime: iso8601,
            high: this.safeFloat(ticker, 'high'),
            low: this.safeFloat(ticker, 'low'),
            bid: undefined,
            bidVolume: undefined,
            ask: undefined,
            askVolume: undefined,
            vwap: undefined,
            open: this.safeFloat(ticker, 'open'),
            close: this.safeFloat(ticker, 'close'),
            last: this.safeFloat(ticker, 'close'),
            previousClose: undefined,
            change: undefined,
            percentage: undefined,
            average: undefined,
            baseVolume: this.safeFloat(ticker, 'volume'),
            quoteVolume: undefined,
            info: ticker,
        };
    }

    async fetchTicker(symbol, params = {}) {
        await this.loadMarkets();
        let market = this.market(symbol);
        let dataSource = this.dataProxy.candles[market['id']];
        var ticker = dataSource[dataSource.length - 1];
        return this.parseTicker(ticker, market);
    }

    async fetchTickers(symbols = undefined, params = {}) {
        await this.loadMarkets();
        const tickers = [];
        for (const marketId in this.dataProxy.candles) {
            let market = this.marketsById[marketId];
            let dataSource = this.dataProxy.candles[marketId];
            tickers.push(this.parseTicker(dataSource[dataSource.length - 1], market));
        }
        if (typeof symbols === 'undefined') return tickers;
        return this.filterByArray(tickers, 'symbol', symbols);
    }

    parseOHLCV(ohlcv, market = undefined, timeframe = '30m', since = undefined, limit = undefined) {
        return [
            ohlcv['date'],
            parseFloat(ohlcv['open']),
            parseFloat(ohlcv['high']),
            parseFloat(ohlcv['low']),
            parseFloat(ohlcv['close']),
            parseFloat(ohlcv['volume']),
        ];
    }

    async fetchOHLCV(symbol, timeframe = '30m', since = undefined, limit = 500, params = {}) {
        await this.loadMarkets();
        let market = this.market(symbol);
        if (!(timeframe in this.timeframes)) {
            const validFrames = Object.keys(this.timeframes).join(',');
            throw new NotSupported(`invalid timeframe, only ${validFrames} is supported`);
        }
        let candles = this.dataProxy.candles[market.id];
        if (typeof since !== 'undefined') {
            candles = candles.filter(unparsed_ohlcv => unparsed_ohlcv.date >= since);
        }
        return this.parseOHLCVs(candles, market, timeframe, since, limit);
    }

    parseTrade(trade, market = undefined) {
        let timestampField = 'T' in trade ? 'T' : 'time';
        let timestamp = trade[timestampField];
        let priceField = 'p' in trade ? 'p' : 'price';
        let price = parseFloat(trade[priceField]);
        let amountField = 'q' in trade ? 'q' : 'qty';
        let amount = parseFloat(trade[amountField]);
        let idField = 'a' in trade ? 'a' : 'id';
        let id = trade[idField].toString();
        let side = undefined;
        let order = undefined;
        if ('orderId' in trade) order = trade['orderId'].toString();
        if ('m' in trade) {
            side = trade['m'] ? 'sell' : 'buy'; // this is reversed intentionally
        } else {
            side = trade['isBuyer'] ? 'buy' : 'sell'; // this is a true side
        }
        let fee = undefined;
        if ('commission' in trade) {
            fee = {
                cost: parseFloat(trade['commission']),
                currency: this.commonCurrencyCode(trade['commissionAsset']),
            };
        }
        return {
            info: trade,
            timestamp: timestamp,
            datetime: this.iso8601(timestamp),
            symbol: market['symbol'],
            id: id,
            order: order,
            type: undefined,
            side: side,
            price: price,
            cost: price * amount,
            amount: amount,
            fee: fee,
        };
    }

    async fetchTrades(symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets();
        let market = this.market(symbol);
        let request = {
            symbol: market['id'],
        };
        if (typeof since !== 'undefined') {
            request['startTime'] = since;
            request['endTime'] = since + 3600000;
        }
        if (typeof limit !== 'undefined') request['limit'] = limit;
        // 'fromId': 123,    // ID to get aggregate trades from INCLUSIVE.
        // 'startTime': 456, // Timestamp in ms to get aggregate trades from INCLUSIVE.
        // 'endTime': 789,   // Timestamp in ms to get aggregate trades until INCLUSIVE.
        // 'limit': 500,     // default = maximum = 500
        let response = await this.publicGetAggTrades(this.extend(request, params));
        return this.parseTrades(response, market, since, limit);
    }

    parseOrderStatus(status) {
        let statuses = {
            NEW: 'open',
            PARTIALLY_FILLED: 'open',
            FILLED: 'closed',
            CANCELED: 'canceled',
        };
        return status in statuses ? statuses[status] : status.toLowerCase();
    }

    parseOrder(order, market = undefined) {
        let status = this.safeValue(order, 'status');
        if (typeof status !== 'undefined') status = this.parseOrderStatus(status);
        let symbol = this.findSymbol(this.safeString(order, 'symbol'), market);
        let timestamp = undefined;
        if ('time' in order) timestamp = order['time'];
        else if ('transactTime' in order) timestamp = order['transactTime'];
        else throw new ExchangeError(this.id + ' malformed order: ' + this.json(order));
        let price = parseFloat(order['price']);
        let amount = parseFloat(order['origQty']);
        let filled = this.safeFloat(order, 'executedQty', 0.0);
        let remaining = Math.max(amount - filled, 0.0);
        let cost = undefined;
        if (typeof price !== 'undefined') if (typeof filled !== 'undefined') cost = price * filled;
        let result = {
            info: order,
            id: order['orderId'].toString(),
            timestamp: timestamp,
            datetime: this.iso8601(timestamp),
            symbol: symbol,
            type: order['type'].toLowerCase(),
            side: order['side'].toLowerCase(),
            price: price,
            amount: amount,
            cost: cost,
            filled: filled,
            remaining: remaining,
            status: status,
            fee: undefined,
        };
        return result;
    }

    async createOrder(symbol, type, side, amount, price = undefined, params = {}) {
        await this.loadMarkets();
        let market = this.market(symbol);
        let order = {
            symbol: market['id'],
            quantity: this.amountToString(symbol, amount),
            type: type.toUpperCase(),
            side: side.toUpperCase(),
        };
        if (type === 'limit') {
            throw new NotSupported('limit orders are not supported');
        }
        let response = this.dataProxy.addOrder(order);
        return this.parseOrder(response);
    }

    handleErrors(code, reason, url, method, headers, body) {
        throw new ExchangeError(
            this.id +
                ': unknown error code: ' +
                this.json({ code, reason, url, method, headers, body })
        );
    }
};
