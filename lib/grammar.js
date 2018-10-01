var
	/**
	 * Exported object.
	 */
	grammar = module.exports = {},

	/**
	 * Constants.
	 */
	REGEXP_CONTENT_TYPE = /^([^\t \/]+)\/([^\t ;]+)(.*)$/,
	REGEXP_CONTENT_TRANSFER_ENCODING = /^([a-zA-Z0-9\-_]+)$/,
	REGEXP_PARAM_KEY = /;[ \t|]*([^\t =]+)[ \t]*=[ \t]*/g,
	REGEXP_PARAM_VALUES = /[ \t]*([^"\t =]+|"([^"]*)")[ \t]*$/;


grammar.headerRules = {
	'Content-Type': {
		reg: function (value) {
			var
				match = value.match(REGEXP_CONTENT_TYPE),
				params = {};

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
				params: params
			};
		}
	},

	'Content-Transfer-Encoding': {
		reg: function (value) {
			var match = value.match(REGEXP_CONTENT_TRANSFER_ENCODING);

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


grammar.headerize = function (string) {
	var
		exceptions = {
			'Mime-Version': 'MIME-Version',
			'Content-Id': 'Content-ID'
		},
		name = string.toLowerCase().replace(/_/g, '-').split('-'),
		hname = '',
		parts = name.length,
		part;

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

Object.keys(grammar.headerRules).forEach(function (name) {
	var rule = grammar.headerRules[name];

	if (!rule.reg) {
		rule.reg = /(.*)/;
	}
});


/**
 * Private API.
 */


function parseParams(rawParams) {
	var
		splittedParams,
		i, len,
		paramMatch,
		params = {};

	if (rawParams === '' || rawParams === undefined || rawParams === null) {
		return params;
	}
	var splittedParams = rawParams.split(REGEXP_PARAM_KEY);

	return splittedParams.slice(1)
		.reduce(function (acc, key, i, list) {
			if (!(i%2)) {
				var values = (list[i + 1] || '').match(REGEXP_PARAM_VALUES) || [];
				acc[key.toLowerCase()] = values[2] || values[1];
			}
			return acc;
		}, Object.create(null));
}
