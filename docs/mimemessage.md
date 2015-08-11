# mimemessage Module API

The top-level module exported by the library is a JavaScript object with the entries described below.


### `mimemessage.factory(data)`

Returns an instance of [Entity](Entity.md).

If given, `data` object may contain the following fields:

* `contentType` (String): Same data passed to [entity.contentType(value)](Entity.md#messagecontenttypevalue).
* `contentTransferEncoding` (String): Same data passed to [entity.contentTransferEncoding(value)](Entity.md#messagecontenttransferencodingvalue).
* `body` (String or Array of [Entity](Entity.md)): The body of the MIME message or entity, or an array of entities if this is a multipart MIME message.

```javascript
var message = mimemessage.factory({
    contentType: 'text/plain',
    body: 'HELLO'
});
```

*Note:* Further modifications can be done to the entity returned by the `factory()` call by means of the [Entity](Entity.md) API.


### `mimemessage.parse(raw)`

Parses the given raw MIME message. If valid an instance of [Entity](Entity.md) is returned, `false` otherwise.

* `raw` (String): A raw MIME message.

```javascript
myWebSocket.onmessage = function (event) {
    var
        raw = event.data,
        msg = mimemessage.parse(raw);

    if (msg) {
        console.log('MIME message received: %s', msg);
    } else {
        console.error('invalid MIME message received: "%s"', raw);
    }
});
```


### `mimemessage.Entity`

The [Entity](Entity.md) class. Useful to check `instanceof mimemessage.Entity`.
