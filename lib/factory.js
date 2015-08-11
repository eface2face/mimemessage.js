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
