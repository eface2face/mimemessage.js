/*
 * mimemessage v1.0.4
 * MIME messages for JavaScript (RFC 2045 & 2046)
 * Copyright 2015-2016 Iñaki Baz Castillo at eFace2Face, inc. (https://eface2face.com)
 * License MIT
 */

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.mimemessage = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Expose the Entity class.
 */
module.exports = Entity;

var
	/**
	 * Dependencies.
	 */
	debug = require('debug')('mimemessage:Entity'),
	debugerror = require('debug')('mimemessage:ERROR:Entity'),
	randomString = require('random-string'),
	grammar = require('./grammar'),
	parseHeaderValue = require('./parse').parseHeaderValue;

debugerror.log = console.warn.bind(console);


function Entity() {
	debug('new()');

	this._headers = {};
	this._body = null;
}


Entity.prototype.contentType = function (value) {
	// Get.
	if (!value && value !== null) {
		return this._headers['Content-Type'];
	// Set.
	} else if (value) {
		this._headers['Content-Type'] =
			parseHeaderValue(grammar.headerRules['Content-Type'], value);
	// Delete.
	} else {
		delete this._headers['Content-Type'];
	}
};


Entity.prototype.contentTransferEncoding = function (value) {
	var contentTransferEncoding = this._headers['Content-Transfer-Encoding'];

	// Get.
	if (!value && value !== null) {
		return contentTransferEncoding ? contentTransferEncoding.value : undefined;
	// Set.
	} else if (value) {
		this._headers['Content-Transfer-Encoding'] =
			parseHeaderValue(grammar.headerRules['Content-Transfer-Encoding'], value);
	// Delete.
	} else {
		delete this._headers['Content-Transfer-Encoding'];
	}
};


Entity.prototype.header = function (name, value) {
	name = grammar.headerize(name);

	// Get.
	if (!value && value !== null) {
		if (this._headers[name]) {
			return this._headers[name].value;
		}
	// Set.
	} else if (value) {
		this._headers[name] = {
			value: value
		};
	// Delete.
	} else {
		delete this._headers[name];
	}
};


Object.defineProperty(Entity.prototype, 'body', {
	get: function () {
		return this._body;
	},
	set: function (body) {
		if (body) {
			setBody.call(this, body);
		} else {
			delete this._body;
		}
	}
});


Entity.prototype.isMultiPart = function () {
	var contentType = this._headers['Content-Type'];

	if (contentType && contentType.type === 'multipart') {
		return true;
	} else {
		return false;
	}
};


Entity.prototype.toString = function (options) {
	var
		raw = '',
		name, header,
		i, len,
		contentType = this._headers['Content-Type'],
		boundary;

	options = options || {
		noHeaders: false
	};

	if (!options.noHeaders) {
		// MIME headers.
		for (name in this._headers) {
			if (this._headers.hasOwnProperty(name)) {
				header = this._headers[name];

				raw += name + ': ' + header.value + '\r\n';
			}
		}

		// Separator line.
		raw += '\r\n';
	}

	// Body.
	if (Array.isArray(this._body)) {
		boundary = contentType.params.boundary;

		for (i = 0, len = this._body.length; i < len; i++) {
			if (i > 0) {
				raw += '\r\n';
			}
			raw += '--' + boundary + '\r\n' + this._body[i].toString();
		}
		raw += '\r\n--' + boundary + '--';
	} else if (typeof this._body === 'string') {
		raw += this._body;
	} else if (typeof this._body === 'object') {
		raw += JSON.stringify(this._body);
	}

	return raw;
};


/**
 * Private API.
 */


function setBody(body) {
	var contentType = this._headers['Content-Type'];

	this._body = body;

	// Multipart body.
	if (Array.isArray(body)) {
		if (!contentType || contentType.type !== 'multipart') {
			this.contentType('multipart/mixed;boundary=' + randomString());
		} else if (!contentType.params.boundary) {
			this.contentType(contentType.fulltype + ';boundary=' + randomString());
		}
	// Single body.
	} else {
		if (!contentType || contentType.type === 'multipart') {
			this.contentType('text/plain;charset=utf-8');
		}
	}
}

},{"./grammar":3,"./parse":5,"debug":6,"random-string":9}],2:[function(require,module,exports){
/**
 * Expose the factory function.
 */
module.exports = factory;

var
	/**
	 * Dependencies.
	 */
	debug = require('debug')('mimemessage:factory'),
	debugerror = require('debug')('mimemessage:ERROR:factory'),
	Entity = require('./Entity');

debugerror.log = console.warn.bind(console);


function factory(data) {
	debug('factory() | [data:%o]', data);

	var entity = new Entity();

	data = data || {};

	// Add Content-Type.
	if (data.contentType) {
		entity.contentType(data.contentType);
	}

	// Add Content-Transfer-Encoding.
	if (data.contentTransferEncoding) {
		entity.contentTransferEncoding(data.contentTransferEncoding);
	}

	// Add body.
	if (data.body) {
		entity.body = data.body;
	}

	return entity;
}

},{"./Entity":1,"debug":6}],3:[function(require,module,exports){
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
	REGEXP_PARAM = /^[ \t]*([^\t =]+)[ \t]*=[ \t]*([^"\t =]+|"([^"]*)")[ \t]*$/;


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

	splittedParams = rawParams.split(';');
	if (splittedParams.length === 0) {
		return undefined;
	}

	for (i = 1, len = splittedParams.length; i < len; i++) {
		paramMatch = splittedParams[i].match(REGEXP_PARAM);
		if (!paramMatch) {
			return undefined;
		}

		params[paramMatch[1].toLowerCase()] = paramMatch[3] || paramMatch[2];
	}

	return params;
}

},{}],4:[function(require,module,exports){
module.exports = {
	factory: require('./factory'),
	parse: require('./parse'),
	Entity: require('./Entity')
};


},{"./Entity":1,"./factory":2,"./parse":5}],5:[function(require,module,exports){
/**
 * Expose the parse function and some util funtions within it.
 */
module.exports = parse;
parse.parseHeaderValue = parseHeaderValue;

var
	/**
	 * Dependencies.
	 */
	debug = require('debug')('mimemessage:parse'),
	debugerror = require('debug')('mimemessage:ERROR:parse'),
	grammar = require('./grammar'),
	Entity = require('./Entity'),

	/**
 	 * Constants.
 	 */
	REGEXP_VALID_MIME_HEADER = /^([a-zA-Z0-9!#$%&'+,\-\^_`|~]+)[ \t]*:[ \t]*(.+)$/;

debugerror.log = console.warn.bind(console);


function parse(rawMessage) {
	debug('parse()');

	var entity;

	if (typeof rawMessage !== 'string') {
		throw new TypeError('given data must be a string');
	}

	entity = new Entity();

	if (!parseEntity(entity, rawMessage, true)) {
		debugerror('invalid MIME message');
		return false;
	}

	return entity;
}


function parseEntity(entity, rawEntity, topLevel) {
	debug('parseEntity()');

	var
		headersEnd = -1,
		rawHeaders,
		rawBody,
		contentType, boundary,
		boundaryRegExp, boundaryEndRegExp, match, partStart,
		parts = [],
		i, len,
		subEntity;

	// Just look for headers if first line is not empty.
	if (/^[^\r\n]/.test(rawEntity)) {
		headersEnd = rawEntity.indexOf('\r\n\r\n');
	}

	if (headersEnd !== -1) {
		rawHeaders = rawEntity.slice(0, headersEnd);
		rawBody = rawEntity.slice(headersEnd + 4);
	} else if (topLevel) {
		debugerror('parseEntity() | wrong MIME headers in top level entity');
		return false;
	} else {
		if (/^\r\n/.test(rawEntity)) {
			rawBody = rawEntity.slice(2);
		} else {
			debugerror('parseEntity() | wrong sub-entity');
			return false;
		}
	}

	if (rawHeaders && !parseEntityHeaders(entity, rawHeaders)) {
		return false;
	}

	contentType = entity.contentType();

	// Multipart body.
	if (contentType && contentType.type === 'multipart') {
		boundary = contentType.params.boundary;
		if (!boundary) {
			debugerror('parseEntity() | "multipart" Content-Type must have "boundary" parameter');
			return false;
		}

		// Build the complete boundary regexps.
		boundaryRegExp = new RegExp('(\\r\\n)?--' + boundary + '[\\t ]*\\r\\n', 'g');
		boundaryEndRegExp = new RegExp('\\r\\n--' + boundary + '--[\\t ]*');

		while (true) {
			match = boundaryRegExp.exec(rawBody);

			if (match) {
				if (partStart !== undefined) {
					parts.push(rawBody.slice(partStart, match.index));
				}

				partStart = boundaryRegExp.lastIndex;
			} else {
				if (partStart === undefined) {
					debugerror('parseEntity() | no bodies found in a "multipart" sub-entity');
					return false;
				}

				boundaryEndRegExp.lastIndex = partStart;
				match = boundaryEndRegExp.exec(rawBody);

				if (!match) {
					debugerror('parseEntity() | no ending boundary in a "multipart" sub-entity');
					return false;
				}

				parts.push(rawBody.slice(partStart, match.index));
				break;
			}
		}

		entity._body = [];

		for (i = 0, len = parts.length; i < len; i++) {
			subEntity = new Entity();
			entity._body.push(subEntity);

			if (!parseEntity(subEntity, parts[i])) {
				debugerror('invalid MIME sub-entity');
				return false;
			}
		}
	// Non multipart body.
	} else {
		entity._body = rawBody;
	}

	return true;
}


function parseEntityHeaders(entity, rawHeaders) {
	var
		lines = rawHeaders.split('\r\n'),
		line,
		i, len;

	for (i = 0, len = lines.length; i < len; i++) {
		line = lines[i];

		while (/^[ \t]/.test(lines[i + 1])) {
			line = line + ' ' + lines[i + 1].trim();
			i++;
		}

		if (!parseHeader(entity, line)) {
			debugerror('parseEntityHeaders() | invalid MIME header: "%s"', line);
			return false;
		}
	}

	return true;
}


function parseHeader(entity, rawHeader) {
	var
		match = rawHeader.match(REGEXP_VALID_MIME_HEADER),
		name, value, rule, data;

	if (!match) {
		debugerror('invalid MIME header "%s"', rawHeader);
		return false;
	}

	name = grammar.headerize(match[1]);
	value = match[2];

	rule = grammar.headerRules[name] || grammar.unknownHeaderRule;

	try {
		data = parseHeaderValue(rule, value);
	}	catch (error) {
		debugerror('wrong MIME header: "%s"', rawHeader);
		return false;
	}

	entity._headers[name] = data;
	return true;
}


function parseHeaderValue(rule, value) {
	var
		parsedValue,
		i, len,
		data = {};

	if (typeof rule.reg !== 'function') {
		parsedValue = value.match(rule.reg);
		if (!parsedValue) {
			throw new Error('parseHeaderValue() failed for ' + value);
		}

		for (i = 0, len = rule.names.length; i < len; i++) {
			if (parsedValue[i + 1] !== undefined) {
				data[rule.names[i]] = parsedValue[i + 1];
			}
		}
	} else {
		data = rule.reg(value);
		if (!data) {
			throw new Error('parseHeaderValue() failed for ' + value);
		}
	}

	if (!data.value) {
		data.value = value;
	}

	return data;
}

},{"./Entity":1,"./grammar":3,"debug":6}],6:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":7}],7:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":8}],8:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],9:[function(require,module,exports){
/*
 * random-string
 * https://github.com/valiton/node-random-string
 *
 * Copyright (c) 2013 Valiton GmbH, Bastian 'hereandnow' Behrens
 * Licensed under the MIT license.
 */

'use strict';

var numbers = '0123456789',
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    specials = '!$%^&*()_+|~-=`{}[]:;<>?,./';


function _defaults (opts) {
  opts || (opts = {});
  return {
    length: opts.length || 8,
    numeric: typeof opts.numeric === 'boolean' ? opts.numeric : true,
    letters: typeof opts.letters === 'boolean' ? opts.letters : true,
    special: typeof opts.special === 'boolean' ? opts.special : false
  };
}

function _buildChars (opts) {
  var chars = '';
  if (opts.numeric) { chars += numbers; }
  if (opts.letters) { chars += letters; }
  if (opts.special) { chars += specials; }
  return chars;
}

module.exports = function randomString(opts) {
  opts = _defaults(opts);
  var i, rn,
      rnd = '',
      len = opts.length,
      randomChars = _buildChars(opts);
  for (i = 1; i <= len; i++) {
    rnd += randomChars.substring(rn = Math.floor(Math.random() * randomChars.length), rn + 1);
  }
  return rnd;
};

},{}]},{},[4])(4)
});