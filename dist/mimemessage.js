'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var debug = _interopDefault(require('debug'));
var randomString = _interopDefault(require('random-string'));

function _typeof(obj) {
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

/**
 * Exported object.
 */
var grammar = {};
var grammar_1 = grammar;
/**
 * Constants.
 */

var REGEXP_CONTENT_TYPE = /^([^\t /]+)\/([^\t ;]+)(.*)$/;
var REGEXP_CONTENT_TRANSFER_ENCODING = /^([a-zA-Z0-9\-_]+)$/;
var REGEXP_PARAM_KEY = /;[ \t|]*([^\t =]+)[ \t]*=[ \t]*/g;
var REGEXP_PARAM_VALUES = /[ \t]*([^"\t =]+|"([^"]*)")[ \t]*$/;
grammar.headerRules = {
  'Content-Type': {
    reg: function reg(value) {
      var match = value.match(REGEXP_CONTENT_TYPE);
      var params = {};

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
    reg: function reg(value) {
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
  var exceptions = {
    'Mime-Version': 'MIME-Version',
    'Content-Id': 'Content-ID'
  };
  var name = string.toLowerCase().replace(/_/g, '-').split('-');
  var parts = name.length;
  var hname = '';
  var part;

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
}; // Set sensible defaults to avoid polluting the grammar with boring details.


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
  if (rawParams === '' || rawParams === undefined || rawParams === null) {
    return {};
  }

  var splittedParams = rawParams.split(REGEXP_PARAM_KEY);
  return splittedParams.slice(1).reduce(function (acc, key, i, list) {
    if (!(i % 2)) {
      var values = (list[i + 1] || '').match(REGEXP_PARAM_VALUES) || [];
      acc[key.toLowerCase()] = values[2] || values[1];
    }

    return acc;
  }, Object.create(null));
}

/**
 * Expose the parse function and some util funtions within it.
 */

var parse_1 = parse;
parse.parseHeaderValue = parseHeaderValue;
/**
 * Dependencies.
 */

var debug$1 = debug('mimemessage:parse');
var debugerror = debug('mimemessage:ERROR:parse');
/**
 * Constants.
 */

var REGEXP_VALID_MIME_HEADER = /^([a-zA-Z0-9!#$%&'+,\-^_`|~]+)[ \t]*:[ \t]*(.+)$/;
debugerror.log = console.warn.bind(console);

function parse(rawMessage) {
  debug$1('parse()');

  if (typeof rawMessage !== 'string') {
    throw new TypeError('given data must be a string');
  }

  var entity = new Entity_1();

  if (!parseEntity(entity, rawMessage, true)) {
    debugerror('invalid MIME message');
    return false;
  }

  return entity;
}

function parseEntity(entity, rawEntity, topLevel) {
  debug$1('parseEntity()');
  var headersEnd = -1;
  var rawHeaders;
  var rawBody;
  var match;
  var partStart;
  var parts = []; // Just look for headers if first line is not empty.

  if (/^[^\r\n]/.test(rawEntity)) {
    headersEnd = rawEntity.indexOf('\r\n\r\n');
  }

  if (headersEnd !== -1) {
    rawHeaders = rawEntity.slice(0, headersEnd);
    rawBody = rawEntity.slice(headersEnd + 4);
  } else if (topLevel) {
    debugerror('parseEntity() | wrong MIME headers in top level entity');
    return false;
  } else if (/^\r\n/.test(rawEntity)) {
    rawBody = rawEntity.slice(2);
  } else {
    debugerror('parseEntity() | wrong sub-entity');
    return false;
  }

  if (rawHeaders && !parseEntityHeaders(entity, rawHeaders)) {
    return false;
  }

  var contentType = entity.contentType(); // Multipart internalBody.

  if (contentType && contentType.type === 'multipart') {
    var boundary = contentType.params.boundary;

    if (!boundary) {
      debugerror('parseEntity() | "multipart" Content-Type must have "boundary" parameter');
      return false;
    } // Build the complete boundary regexps.


    var boundaryRegExp = new RegExp('(\\r\\n)?--' + boundary + '[\\t ]*\\r\\n', 'g');
    var boundaryEndRegExp = new RegExp('\\r\\n--' + boundary + '--[\\t ]*');

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

    entity.internalBody = [];
    var len = parts.length;

    for (var i = 0; i < len; i++) {
      var subEntity = new Entity_1();
      entity.internalBody.push(subEntity);

      if (!parseEntity(subEntity, parts[i])) {
        debugerror('invalid MIME sub-entity');
        return false;
      }
    } // Non multipart internalBody.

  } else {
    entity.internalBody = rawBody;
  }

  return true;
}

function parseEntityHeaders(entity, rawHeaders) {
  var lines = rawHeaders.split('\r\n');
  var len = lines.length;

  for (var i = 0; i < len; i++) {
    var line = lines[i];

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
  var match = rawHeader.match(REGEXP_VALID_MIME_HEADER);

  if (!match) {
    debugerror('invalid MIME header "%s"', rawHeader);
    return false;
  }

  var name = grammar_1.headerize(match[1]);
  var value = match[2];
  var rule = grammar_1.headerRules[name] || grammar_1.unknownHeaderRule;
  var data;

  try {
    data = parseHeaderValue(rule, value);
  } catch (error) {
    debugerror('wrong MIME header: "%s"', rawHeader);
    return false;
  }

  entity.headers[name] = data;
  return true;
}

function parseHeaderValue(rule, value) {
  var parsedValue;
  var data = {};

  if (typeof rule.reg !== 'function') {
    parsedValue = value.match(rule.reg);

    if (!parsedValue) {
      throw new Error('parseHeaderValue() failed for ' + value);
    }

    var len = rule.names.length;

    for (var i = 0; i < len; i++) {
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

/**
 * Expose the Entity class.
 */

var Entity_1 = Entity;
/**
 * Dependencies.
 */

var debug$2 = debug('mimemessage:Entity');
var debugerror$1 = debug('mimemessage:ERROR:Entity');
var parseHeaderValue$1 = parse_1.parseHeaderValue;
debugerror$1.log = console.warn.bind(console);

function Entity() {
  debug$2('new()');
  this.headers = {};
  this.internalBody = null;
}

Entity.prototype.contentType = function (value) {
  // Get.
  if (!value && value !== null) {
    return this.headers['Content-Type']; // Set.
  }

  if (value) {
    this.headers['Content-Type'] = parseHeaderValue$1(grammar_1.headerRules['Content-Type'], value); // Delete.
  } else {
    delete this.headers['Content-Type'];
  }
};

Entity.prototype.contentTransferEncoding = function (value) {
  var contentTransferEncoding = this.headers['Content-Transfer-Encoding']; // Get.

  if (!value && value !== null) {
    return contentTransferEncoding ? contentTransferEncoding.value : undefined; // Set.
  }

  if (value) {
    this.headers['Content-Transfer-Encoding'] = parseHeaderValue$1(grammar_1.headerRules['Content-Transfer-Encoding'], value); // Delete.
  } else {
    delete this.headers['Content-Transfer-Encoding'];
  }
};

Entity.prototype.header = function (name, value) {
  var headername = grammar_1.headerize(name); // Get.

  if (!value && value !== null) {
    if (this.headers[headername]) {
      return this.headers[headername].value;
    } // Set.

  } else if (value) {
    this.headers[headername] = {
      value: value
    }; // Delete.
  } else {
    delete this.headers[headername];
  }
};

Object.defineProperty(Entity.prototype, 'body', {
  get: function get() {
    return this.internalBody;
  },
  set: function set(body) {
    if (body) {
      setBody.call(this, body);
    } else {
      delete this.internalBody;
    }
  }
});

Entity.prototype.isMultiPart = function () {
  var contentType = this.headers['Content-Type'];
  return contentType && contentType.type === 'multipart';
};

Entity.prototype.toString = function () {
  var _this = this;

  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
    noHeaders: false
  };
  var raw = '';
  var contentType = this.headers['Content-Type'];

  if (!options.noHeaders) {
    // MIME headers.
    var headers = Object.keys(this.headers).map(function (name) {
      return name + ': ' + _this.headers[name].value + '\r\n';
    });
    raw = headers.join('') + '\r\n';
  } // Body.


  if (Array.isArray(this.internalBody)) {
    var boundary = contentType.params.boundary;
    var i;
    var len = this.internalBody.length;

    for (i = 0; i < len; i++) {
      if (i > 0) {
        raw += '\r\n';
      }

      raw += '--' + boundary + '\r\n' + this.internalBody[i].toString();
    }

    raw += '\r\n--' + boundary + '--';
  } else if (typeof this.internalBody === 'string') {
    raw += this.internalBody;
  } else if (_typeof(this.internalBody) === 'object') {
    raw += JSON.stringify(this.internalBody);
  }

  return raw;
};
/**
 * Private API.
 */


function setBody(body) {
  var contentType = this.headers['Content-Type'];
  this.internalBody = body; // Multipart internalBody.

  if (Array.isArray(body)) {
    if (!contentType || contentType.type !== 'multipart') {
      this.contentType('multipart/mixed;boundary=' + randomString());
    } else if (!contentType.params.boundary) {
      this.contentType(contentType.fulltype + ';boundary=' + randomString());
    } // Single internalBody.

  } else if (!contentType || contentType.type === 'multipart') {
    this.contentType('text/plain;charset=utf-8');
  }
}

/**
 * Expose the factory function.
 */

var factory_1 = factory;
/**
 * Dependencies.
 */

var debug$3 = debug('mimemessage:factory');
var debugerror$2 = debug('mimemessage:ERROR:factory');
debugerror$2.log = console.warn.bind(console);

function factory() {
  var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  debug$3('factory() | [data:%o]', data);
  var entity = new Entity_1(); // Add Content-Type.

  if (data.contentType) {
    entity.contentType(data.contentType);
  } // Add Content-Transfer-Encoding.


  if (data.contentTransferEncoding) {
    entity.contentTransferEncoding(data.contentTransferEncoding);
  } // Add body.


  if (data.body) {
    entity.body = data.body;
  }

  return entity;
}

var mimemessage = {
  factory: factory_1,
  parse: parse_1,
  Entity: Entity_1
};
var mimemessage_1 = mimemessage.factory;
var mimemessage_2 = mimemessage.parse;
var mimemessage_3 = mimemessage.Entity;

exports.default = mimemessage;
exports.factory = mimemessage_1;
exports.parse = mimemessage_2;
exports.Entity = mimemessage_3;
