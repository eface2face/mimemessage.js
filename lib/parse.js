/**
 * Expose the parse function and some util funtions within it.
 */
module.exports = parse;
parse.parseHeaderValue = parseHeaderValue;

/**
 * Dependencies.
 */
const rfc2047 = require('rfc2047');
const debug = require('debug')('mimemessage:parse');
const debugerror = require('debug')('mimemessage:ERROR:parse');
const encoding = require('./encoding');
const grammar = require('./grammar');
const Entity = require('./Entity');
/**
 * Constants.
 */
const REGEXP_VALID_MIME_HEADER = /^([a-zA-Z0-9!#$%&'+,\-^_`|~]+)[ \t]*:[ \t]*(.+)$/;

debugerror.log = console.warn.bind(console);

function parse(rawMessage) {
    debug('parse()');

    if (typeof rawMessage !== 'string') {
        throw new TypeError('given data must be a string');
    }

    const entity = new Entity();

    if (!parseEntity(entity, rawMessage, true)) {
        debugerror('invalid MIME message');
        return false;
    }

    return entity;
}

function parseEntity(entity, rawEntity, topLevel) {
    debug('parseEntity()');

    let headersEnd = -1;
    let rawHeaders;
    let rawBody;
    let match;
    let partStart;
    const parts = [];

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
    } else if (/^\r\n/.test(rawEntity)) {
        rawBody = rawEntity.slice(2);
    } else {
        debugerror('parseEntity() | wrong sub-entity');
        return false;
    }

    if (rawHeaders && !parseEntityHeaders(entity, rawHeaders)) {
        return false;
    }

    const contentType = entity.contentType();

    // Multipart internalBody.
    if (contentType && contentType.type === 'multipart') {
        const boundary = contentType.params.boundary;
        if (!boundary) {
            debugerror('parseEntity() | "multipart" Content-Type must have "boundary" parameter');
            return false;
        }

        // Build the complete boundary regexps.
        const boundaryRegExp = new RegExp('(\\r\\n)?--' + boundary + '[\\t ]*\\r\\n', 'g');
        const boundaryEndRegExp = new RegExp('\\r\\n--' + boundary + '--[\\t ]*');

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

        const len = parts.length;
        for (let i = 0; i < len; i++) {
            const subEntity = new Entity();
            entity.internalBody.push(subEntity);

            if (!parseEntity(subEntity, parts[i])) {
                debugerror('invalid MIME sub-entity');
                return false;
            }
        }
        // Non multipart internalBody.
    } else {
        const transferencoding = entity.header('Content-Transfer-Encoding');
        const { params: { charset = '' } = {} } = contentType || {};
        const transform = [];

        if (transferencoding === 'base64') {
            transform.push(encoding.decodeBase64);
        } else if (transferencoding === 'quoted-printable') {
            transform.push(encoding.decodeQP);
        }

        if (charset.replace(/-/g, '').toLowerCase() === 'utf8') {
            transform.push(encoding.decodeUTF8);
        }

        entity.internalBody = transform.reduce((body, cb) => cb(body), rawBody);
    }

    return true;
}

function parseEntityHeaders(entity, rawHeaders) {
    const lines = rawHeaders.split('\r\n');
    const len = lines.length;

    for (let i = 0; i < len; i++) {
        let line = lines[i];

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
    const match = rawHeader.match(REGEXP_VALID_MIME_HEADER);

    if (!match) {
        debugerror('invalid MIME header "%s"', rawHeader);
        return false;
    }

    const name = grammar.headerize(match[1]);
    const value = match[2];

    const rule = grammar.headerRules[name] || grammar.unknownHeaderRule;

    let data;
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
    let parsedValue;
    let data = {};

    const decodedvalue = value.split(';').map(rfc2047.decode).join(';');

    if (typeof rule.reg !== 'function') {
        parsedValue = decodedvalue.match(rule.reg);
        if (!parsedValue) {
            throw new Error('parseHeaderValue() failed for ' + value);
        }
        const len = rule.names.length;
        for (let i = 0; i < len; i++) {
            if (parsedValue[i + 1] !== undefined) {
                data[rule.names[i]] = parsedValue[i + 1];
            }
        }
    } else {
        data = rule.reg(decodedvalue);
        if (!data) {
            throw new Error('parseHeaderValue() failed for ' + value);
        }
    }

    if (!data.value) {
        data.value = decodedvalue;
    }


    return data;
}
