/**
 * Exported object.
 */
const grammar = {};
module.exports = grammar;
/**
 * Constants.
 */
const REGEXP_CONTENT_TYPE = /^([^\t /]+)\/([^\t ;]+)(.*)$/;
const REGEXP_CONTENT_TRANSFER_ENCODING = /^([a-zA-Z0-9\-_]+)$/;
const REGEXP_PARAM_KEY = /;[ \t|]*([^\t =]+)[ \t]*=[ \t]*/g;
const REGEXP_PARAM_VALUES = /[ \t]*([^"\t =]+|"([^"]*)")[ \t]*$/;

grammar.headerRules = {
    'Content-Type': {
        reg(value) {
            const match = value.match(REGEXP_CONTENT_TYPE);
            let params = {};

            if (!match) {
                return undefined;
            }

            if (match[3]) {
                params = parseParams(match[3]);
                if (!params) {
                    return undefined;
                }
            }

            return {
                fulltype: match[1].toLowerCase() + '/' + match[2].toLowerCase(),
                type: match[1].toLowerCase(),
                subtype: match[2].toLowerCase(),
                params
            };
        }
    },

    'Content-Disposition': {
        reg: function (value) {
            return {
                fulltype: value,
                params: parseParams(value)
            };
        }
    },

    'Content-Transfer-Encoding': {
        reg(value) {
            const match = value.match(REGEXP_CONTENT_TRANSFER_ENCODING);

            if (!match) {
                return undefined;
            }

            return {
                value: match[1].toLowerCase()
            };
        }
    }
};

grammar.unknownHeaderRule = {
    reg: /(.*)/,
    names: ['value']
};

grammar.headerize = function(string) {
    const exceptions = {
        'Mime-Version': 'MIME-Version',
        'Content-Id': 'Content-ID'
    };
    const name = string
            .toLowerCase()
            .replace(/_/g, '-')
            .split('-');
    const parts = name.length;

    let hname = '';
    let part;
    for (part = 0; part < parts; part++) {
        if (part !== 0) {
            hname += '-';
        }
        hname += name[part].charAt(0).toUpperCase() + name[part].substring(1);
    }

    if (exceptions[hname]) {
        hname = exceptions[hname];
    }

    return hname;
};

// Set sensible defaults to avoid polluting the grammar with boring details.

Object.keys(grammar.headerRules).forEach((name) => {
    const rule = grammar.headerRules[name];

    if (!rule.reg) {
        rule.reg = /(.*)/;
    }
});

/**
 * Private API.
 */
function parseParams(rawParams) {

    if (rawParams === '' || rawParams === undefined || rawParams === null) {
        return {};
    }
    const splittedParams = rawParams.split(REGEXP_PARAM_KEY);

    return splittedParams.slice(1)
        .reduce((acc, key, i, list) => {
            if (!(i % 2)) {
                const values = (list[i + 1] || '').match(REGEXP_PARAM_VALUES) || [];
                acc[key.toLowerCase()] = values[2] || values[1];
            }
            return acc;
        }, Object.create(null));
}
