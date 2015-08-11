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


Entity.prototype.toString = function () {
	var
		raw = '',
		name, header,
		i, len,
		contentType = this._headers['Content-Type'],
		boundary;

	// MIME headers.
	for (name in this._headers) {
		if (this._headers.hasOwnProperty(name)) {
			header = this._headers[name];

			raw += name + ': ' + header.value + '\r\n';
		}
	}

	// Body.
	if (Array.isArray(this._body)) {
		boundary = contentType.params.boundary;

		for (i = 0, len = this._body.length; i < len; i++) {
			raw += '\r\n--' + boundary + '\r\n' + this._body[i].toString();
		}
		raw += '\r\n--' + boundary + '--';
	} else if (this._body) {
		raw += '\r\n' + this._body.toString();
	} else {
		raw += '\r\n';
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
