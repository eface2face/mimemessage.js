# Entity Class API

A `Entity` instance represents a [MIME entity](https://tools.ietf.org/html/rfc2045) (which can be the top-level message or a MIME sub-entity in a [multipart message]((https://tools.ietf.org/html/rfc2046)). An entity has both headers and a body, which can also be a multipart body containing N MIME sub-entities.


## Constructor

```javascript
var entity = new mimemessage.Entity();
```


## Methods


### `entity.contentType()`

Returns the *Content-Type* header as an object with these fields:

* `type` (String): Type.
* `subtype` (String): Subtype.
* `fulltype` (String): MIME type in "type/subtype" format (no parameters).
* `params` (Object): Param/value pairs.
* `value` (String): The full string value.

Returns `undefined` if there is no *Content-Type* header.

```javascript
entity.contentType();

// => {type: 'text', subtype: 'plain', fulltype: 'text/plain', params: {charset: 'utf-16'}, value: 'text/plain;charset:utf-16'}
```


### `entity.contentType(value)`

Sets the MIME *Content-Type* header with the given string.

If `value` is `null` the header is removed.

```javascript
entity.contentType('text/html;charset=utf-8');
entity.contentType('text/plain  ; charset = utf-16');
```


### `entity.contentTransferEncoding()`

Returns the *Content-Transfer-Encoding* string value (lowcase), or `undefined` if there is no *Content-Transfer-Encoding* header.

```javascript
entity.contentTransferEncoding();

// => '8bit'
```


### `entity.contentTransferEncoding(value)`

Sets the MIME *Content-Transfer-Encoding* header with the given string.

If `value` is `null` the header is removed.

```javascript
entity.contentTransferEncoding('base64');
```


### `entity.header()`

Returns the MIME header value (string) matching the given header `name` (string).

Returns `undefined` if there is such a header.

```javascript
entity.header('Content-ID');

// => "<kjhsd7kjasd@test.local>"
```


### `entity.header(name, value)`

Sets the MIME header with the given header `name` (string) and header `value` (string).

If `value` is `null` the header is removed.

```javascript
entity.mimeHeader('Content-ID', '<1234@foo.com>');
```


### `entity.body`

A getter that returns the body of this MIME message or entity. The body can be an array of MIME entities if this is a multipart message/entity.

Returns `undefined` if there is no body.


### `entity.body = value`

Sets the MIME body of the message to the given `body` (string or array of [Entity](Entity.md)).

If `body` is `null` the body is removed.

*NOTE:* In case of a multipart message, further sub-entities can be safely added to the body later by using `entity.body.push(subEntity1);`.


### `entity.toString()`

Serializes the MIME message/entity into a single string.

```javascript
myWebSocket.send(entity.toString());
```


### `entity.isMultiPart()`

Returns `true` if the current message/entity has a multipart "Content-Type" header ("multipart/mixed", "multipart/alternative"...). If so, the `entity.body` must be treated as an array.
