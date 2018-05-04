/**
 * This file is part of the Crypto Trader JavaScript starter bot
 *
 * @author Niko van Meurs <niko@riddles.io>
 * @License MIT License (http://opensource.org/Licenses/MIT)
 */
'use strict';

function toCamelCase(string) {
    return string.replace('/', '_').replace(/_[a-z]/g, function(match) {
        return match.toUpperCase().replace('_', '');
    });
}

module.exports = {
    toCamelCase,
};
