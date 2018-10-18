/*
 * mimemessage v1.0.5
 * MIME messages for JavaScript (RFC 2045 & 2046)
 * Copyright 2015-2018 Iñaki Baz Castillo
 * License MIT
 */

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.mimemessage = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{"./grammar":3,"./parse":5,"debug":6,"random-string":10}],2:[function(require,module,exports){
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
(function (process){
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
  '#0000CC', '#0000FF', '#0033CC', '#0033FF', '#0066CC', '#0066FF', '#0099CC',
  '#0099FF', '#00CC00', '#00CC33', '#00CC66', '#00CC99', '#00CCCC', '#00CCFF',
  '#3300CC', '#3300FF', '#3333CC', '#3333FF', '#3366CC', '#3366FF', '#3399CC',
  '#3399FF', '#33CC00', '#33CC33', '#33CC66', '#33CC99', '#33CCCC', '#33CCFF',
  '#6600CC', '#6600FF', '#6633CC', '#6633FF', '#66CC00', '#66CC33', '#9900CC',
  '#9900FF', '#9933CC', '#9933FF', '#99CC00', '#99CC33', '#CC0000', '#CC0033',
  '#CC0066', '#CC0099', '#CC00CC', '#CC00FF', '#CC3300', '#CC3333', '#CC3366',
  '#CC3399', '#CC33CC', '#CC33FF', '#CC6600', '#CC6633', '#CC9900', '#CC9933',
  '#CCCC00', '#CCCC33', '#FF0000', '#FF0033', '#FF0066', '#FF0099', '#FF00CC',
  '#FF00FF', '#FF3300', '#FF3333', '#FF3366', '#FF3399', '#FF33CC', '#FF33FF',
  '#FF6600', '#FF6633', '#FF9900', '#FF9933', '#FFCC00', '#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // Internet Explorer and Edge do not support colors.
  if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
    return false;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit')

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
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

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

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

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}

}).call(this,require('_process'))
},{"./debug":7,"_process":9}],7:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * Active `debug` instances.
 */
exports.instances = [];

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  var prevTime;

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
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

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);
  debug.destroy = destroy;

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  exports.instances.push(debug);

  return debug;
}

function destroy () {
  var index = exports.instances.indexOf(this);
  if (index !== -1) {
    exports.instances.splice(index, 1);
    return true;
  } else {
    return false;
  }
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

  exports.names = [];
  exports.skips = [];

  var i;
  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }

  for (i = 0; i < exports.instances.length; i++) {
    var instance = exports.instances[i];
    instance.enabled = exports.enabled(instance.namespace);
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
  if (name[name.length - 1] === '*') {
    return true;
  }
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
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
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
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],9:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],10:[function(require,module,exports){
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
    special: typeof opts.special === 'boolean' ? opts.special : false,
    exclude: Array.isArray(opts.exclude)       ? opts.exclude : []
  };
}

function _buildChars (opts) {
  var chars = '';
  if (opts.numeric) { chars += numbers; }
  if (opts.letters) { chars += letters; }
  if (opts.special) { chars += specials; }
  for (var i = 0; i <= opts.exclude.length; i++){
    chars = chars.replace(opts.exclude[i], "");
  }
  return chars;
}

module.exports = function randomString(opts) {
  opts = _defaults(opts);
  var i, rn,
      rnd = '',
      len = opts.length,
      exclude = opts.exclude,
      randomChars = _buildChars(opts);
  for (i = 1; i <= len; i++) {
    rnd += randomChars.substring(rn = Math.floor(Math.random() * randomChars.length), rn + 1);
  }
  return rnd;
};


},{}]},{},[4])(4)
});
