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

	var entity = new Entity();

	if (typeof rawMessage !== 'string') {
		throw new TypeError('given data must be a string');
	}

	if (!parseEntity(entity, rawMessage, true)) {
		debugerror('invalid MIME message');
		return false;
	}

	return entity;
}


function parseEntity(entity, rawEntity, topLevel) {
	debug('parseEntity()');

	var
		headersEnd,
		rawHeaders,
		rawBody,
		contentType, boundary,
		boundaryRegExp, boundaryEndRegExp, match, partStart,
		parts = [],
		i, len,
		subEntity;

	headersEnd = rawEntity.indexOf('\r\n\r\n');

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
