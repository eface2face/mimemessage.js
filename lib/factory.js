/**
 * Expose the factory function.
 */
module.exports = factory;

/**
 * Dependencies.
 */
const debug = require('debug')('mimemessage:factory');
const debugerror = require('debug')('mimemessage:ERROR:factory');
const Entity = require('./Entity');

debugerror.log = console.warn.bind(console);

function factory(data = {}) {
    debug('factory() | [data:%o]', data);

    const entity = new Entity();

    // Add Content-Type.
    if (data.contentType) {
        entity.contentType(data.contentType);
    }

    // Add Content-Type.
    if (data.contentDisposition) {
        entity.contentDisposition(data.contentDisposition);
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
