'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require('ccxt/js/base/Exchange');
const {
    ExchangeError,
    InsufficientFunds,
    OrderNotFound,
    InvalidOrder,
    DDoSProtection,
    InvalidNonce,
    AuthenticationError,
} = require('ccxt/js/base/errors');

//  ---------------------------------------------------------------------------

module.exports = class riddles extends Exchange {
    describe() {
        return this.deepExtend(super.describe(), {
            id: 'riddles',
            name: 'Riddles.io',
            countries: 'NL', // Netherlands
            rateLimit: 500,
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
            api: {
                web: {
                    get: ['exchange/public/product'],
                },
                public: {
                    get: [
                        'exchangeInfo',
                        'ping',
                        'time',
                        'depth',
                        'aggTrades',
                        'klines',
                        'ticker/24hr',
                        'ticker/allPrices',
                        'ticker/allBookTickers',
                        'ticker/price',
                        'ticker/bookTicker',
                        'exchangeInfo',
                    ],
                    put: ['userDataStream'],
                    post: ['userDataStream'],
                    delete: ['userDataStream'],
                },
                private: {
                    get: ['order', 'openOrders', 'allOrders', 'account', 'myTrades'],
                    post: ['order', 'order/test'],
                    delete: ['order'],
                },
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
            exceptions: {
                '-1013': InvalidOrder, // createOrder -> 'invalid quantity'/'invalid price'/MIN_NOTIONAL
                '-1021': InvalidNonce, // 'your time is ahead of server'
                '-1100': InvalidOrder, // createOrder(symbol, 1, asdf) -> 'Illegal characters found in parameter 'price'
                '-2010': InsufficientFunds, // createOrder -> 'Account has insufficient balance for requested action.'
                '-2011': OrderNotFound, // cancelOrder(1, 'BTC/USDT') -> 'UNKNOWN_ORDER'
                '-2015': AuthenticationError, // "Invalid API-key, IP, or permissions for action."
            },
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
            // "123456" is a "test symbol/market"
            if (id === '123456') continue;
            let baseId = market['baseAsset'];
            let quoteId = market['quoteAsset'];
            let base = this.commonCurrencyCode(baseId);
            let quote = this.commonCurrencyCode(quoteId);
            let symbol = base + '/' + quote;
            let filters = this.indexBy(market['filters'], 'filterType');
            let precision = {
                base: market['baseAssetPrecision'],
                quote: market['quotePrecision'],
                amount: market['baseAssetPrecision'],
                price: market['quotePrecision'],
            };
            let active = market['status'] === 'TRADING';
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
                active: active,
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
            if ('PRICE_FILTER' in filters) {
                let filter = filters['PRICE_FILTER'];
                entry['precision']['price'] = this.precisionFromString(filter['tickSize']);
                entry['limits']['price'] = {
                    min: parseFloat(filter['minPrice']),
                    max: parseFloat(filter['maxPrice']),
                };
            }
            if ('LOT_SIZE' in filters) {
                let filter = filters['LOT_SIZE'];
                entry['precision']['amount'] = this.precisionFromString(filter['stepSize']);
                entry['lot'] = parseFloat(filter['stepSize']); // lot size is deprecated as of 2018.02.06
                entry['limits']['amount'] = {
                    min: parseFloat(filter['minQty']),
                    max: parseFloat(filter['maxQty']),
                };
            }
            if ('MIN_NOTIONAL' in filters) {
                entry['limits']['cost']['min'] = parseFloat(filters['MIN_NOTIONAL']['minNotional']);
            }
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
        let timestamp = this.safeInteger(ticker, 'closeTime');
        let iso8601 = typeof timestamp === 'undefined' ? undefined : this.iso8601(timestamp);
        let symbol = this.findSymbol(this.safeString(ticker, 'symbol'), market);
        let last = this.safeFloat(ticker, 'lastPrice');
        return {
            symbol: symbol,
            timestamp: timestamp,
            datetime: iso8601,
            high: this.safeFloat(ticker, 'highPrice'),
            low: this.safeFloat(ticker, 'lowPrice'),
            bid: this.safeFloat(ticker, 'bidPrice'),
            bidVolume: this.safeFloat(ticker, 'bidQty'),
            ask: this.safeFloat(ticker, 'askPrice'),
            askVolume: this.safeFloat(ticker, 'askQty'),
            vwap: this.safeFloat(ticker, 'weightedAvgPrice'),
            open: this.safeFloat(ticker, 'openPrice'),
            close: last,
            last: last,
            previousClose: this.safeFloat(ticker, 'prevClosePrice'), // previous day close
            change: this.safeFloat(ticker, 'priceChange'),
            percentage: this.safeFloat(ticker, 'priceChangePercent'),
            average: undefined,
            baseVolume: this.safeFloat(ticker, 'volume'),
            quoteVolume: this.safeFloat(ticker, 'quoteVolume'),
            info: ticker,
        };
    }

    async fetchTicker(symbol, params = {}) {
        await this.loadMarkets();
        let market = this.market(symbol);
        let response = await this.publicGetTicker24hr(
            this.extend(
                {
                    symbol: market['id'],
                },
                params
            )
        );
        return this.parseTicker(response, market);
    }

    parseTickers(rawTickers, symbols = undefined) {
        let tickers = [];
        for (let i = 0; i < rawTickers.length; i++) {
            tickers.push(this.parseTicker(rawTickers[i]));
        }
        let tickersBySymbol = this.indexBy(tickers, 'symbol');
        // return all of them if no symbols were passed in the first argument
        if (typeof symbols === 'undefined') return tickersBySymbol;
        // otherwise filter by symbol
        let result = {};
        for (let i = 0; i < symbols.length; i++) {
            let symbol = symbols[i];
            if (symbol in tickersBySymbol) result[symbol] = tickersBySymbol[symbol];
        }
        return result;
    }

    async fetchBidAsks(symbols = undefined, params = {}) {
        await this.loadMarkets();
        let rawTickers = await this.publicGetTickerBookTicker(params);
        return this.parseTickers(rawTickers, symbols);
    }

    async fetchTickers(symbols = undefined, params = {}) {
        await this.loadMarkets();
        let rawTickers = await this.publicGetTicker24hr(params);
        return this.parseTickers(rawTickers, symbols);
    }

    parseOHLCV(ohlcv, market = undefined, timeframe = '1m', since = undefined, limit = undefined) {
        return [
            ohlcv[0],
            parseFloat(ohlcv[1]),
            parseFloat(ohlcv[2]),
            parseFloat(ohlcv[3]),
            parseFloat(ohlcv[4]),
            parseFloat(ohlcv[5]),
        ];
    }

    async fetchOHLCV(symbol, timeframe = '1m', since = undefined, limit = 500, params = {}) {
        await this.loadMarkets();
        let market = this.market(symbol);
        let request = {
            symbol: market['id'],
            interval: this.timeframes[timeframe],
            limit: limit, // default == max == 500
        };
        if (typeof since !== 'undefined') request['startTime'] = since;
        let response = await this.publicGetKlines(this.extend(request, params));
        return this.parseOHLCVs(response, market, timeframe, since, limit);
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
            order = this.extend(order, {
                price: this.priceToPrecision(symbol, price),
                timeInForce: 'GTC', // 'GTC' = Good To Cancel (default), 'IOC' = Immediate Or Cancel
            });
        }
        let response = await this.privatePostOrder(this.extend(order, params));
        return this.parseOrder(response);
    }

    commonCurrencyCode(currency) {
        return currency;
    }

    handleErrors(code, reason, url, method, headers, body) {
        // in case of error binance sets http status code >= 400
        if (code < 300)
            // status code ok, proceed with request
            return;
        if (code < 400)
            // should not normally happen, reserve for redirects in case
            // we'll want to scrape some info from web pages
            return;
        // code >= 400
        if (code === 418 || code === 429)
            throw new DDoSProtection(this.id + ' ' + code.toString() + ' ' + reason + ' ' + body);
        // error response in a form: { "code": -1013, "msg": "Invalid quantity." }
        // following block cointains legacy checks against message patterns in "msg" property
        // will switch "code" checks eventually, when we know all of them
        if (body.indexOf('Price * QTY is zero or less') >= 0)
            throw new InvalidOrder(
                this.id + ' order cost = amount * price is zero or less ' + body
            );
        if (body.indexOf('LOT_SIZE') >= 0)
            throw new InvalidOrder(
                this.id +
                    ' order amount should be evenly divisible by lot size, use this.amountToLots (symbol, amount) ' +
                    body
            );
        if (body.indexOf('PRICE_FILTER') >= 0)
            throw new InvalidOrder(
                this.id +
                    ' order price exceeds allowed price precision or invalid, use this.priceToPrecision (symbol, amount) ' +
                    body
            );
        if (body.indexOf('Order does not exist') >= 0)
            throw new OrderNotFound(this.id + ' ' + body);
        // checks against error codes
        if (typeof body === 'string') {
            if (body.length > 0) {
                if (body[0] === '{') {
                    let response = JSON.parse(body);
                    let error = this.safeString(response, 'code');
                    if (typeof error !== 'undefined') {
                        const exceptions = this.exceptions;
                        if (error in exceptions) {
                            throw new exceptions[error](this.id + ' ' + this.json(response));
                        } else {
                            throw new ExchangeError(
                                this.id + ': unknown error code: ' + this.json(response)
                            );
                        }
                    }
                }
            }
        }
    }
};
