# mimemessage.js

MIME messages for JavaScript (RFC [2045](https://tools.ietf.org/html/rfc2045) & [2046](https://tools.ietf.org/html/rfc2046)).

Suitable for parsing and generating MIME messages, allowing access to headers and body, including multipart messages such as:

```
From: Nathaniel Borenstein <nsb@bellcore.com>
To: Ned Freed <ned@innosoft.com>
Date: Sun, 21 Mar 1993 23:56:48 -0800 (PST)
Subject: Sample message
MIME-Version: 1.0
Content-type: multipart/mixed; boundary="simple boundary"

--simple boundary

This is implicitly typed plain US-ASCII text.
It does NOT end with a linebreak.
--simple boundary
Content-type: text/plain; charset=us-ascii

This is explicitly typed plain US-ASCII text.
It DOES end with a linebreak.

--simple boundary--
```

*NOTE:* This library is not intended for mail parsing (there are tons of MIME related Node libraries for that). In fact, it does not deal with encodings different that UTF-8. The purpose of this library is to be used in pure browser/Node environments in which MIME messages are useful to transmit data.


## Installation

### **npm**:

```bash
$ npm install mimemessage --save
```

And then:

```javascript
var mimemessage = require('mimemessage');
```


## Browserified library

The browserified version of the library at `dist/mimemessage.js` exposes the global `window.mimemessage` module.

```html
<script type='text/javascript' src='js/mimemessage.js'></script>
```


## Usage Example

Let's build a complex multipart MIME message with the following content:

* An HTML body.
* An alternate plain text for those non HTML capable clients.
* An attached PNG image named "mypicture.png" encoded in Base64.

```javascript
var mimemessage = require('mimemessage');
var msg, alternateEntity, htmlEntity, plainEntity, pngEntity;

// Build the top-level multipart MIME message.
msg = mimemessage.factory({
    contentType: 'multipart/mixed',
    body: []
});
msg.header('Message-ID', '<1234qwerty>');

// Build the multipart/alternate MIME entity containing both the HTML and plain text entities.
alternateEntity = mimemessage.factory({
    contentType: 'multipart/alternate',
    body: []
});

// Build the HTML MIME entity.
htmlEntity = mimemessage.factory({
    contentType: 'text/html;charset=utf-8',
    body: '<p>This is the <strong>HTML</strong> version of the message.</p>'
});

// Build the plain text MIME entity.
plainEntity = mimemessage.factory({
    body: 'This is the plain text version of the message.'
});

// Build the PNG MIME entity.
pngEntity = mimemessage.factory({
    contentType: 'image/png',
    contentTransferEncoding: 'base64',
    body: 'fVkVvYassFAAAABQAAAAIAAAAbWltZXR5cG=='
});
pngEntity.header('Content-Disposition', 'attachment ;filename="mypicture.png"');

// Add both the HTML and plain text entities to the multipart/alternate entity.
alternateEntity.body.push(htmlEntity);
alternateEntity.body.push(plainEntity);

// Add the multipart/alternate entity to the top-level MIME message.
msg.body.push(alternateEntity);

// Add the PNG entity to the top-level MIME message.
msg.body.push(pngEntity);
```

By calling `msg.toString()` it produces the following MIME formatted string:

```
Content-Type: multipart/mixed;boundary=92ckNGfS
Message-Id: <1234qwerty>

--92ckNGfS
Content-Type: multipart/alternate;boundary=EVGuDPPT

--EVGuDPPT
Content-Type: text/html;charset=utf-8

<p>This is the <strong>HTML</strong> version of the message.</p>
--EVGuDPPT
Content-Type: text/plain;charset=utf-8

This is the plain text version of the message.
--EVGuDPPT--
--92ckNGfS
Content-Type: image/png
Content-Transfer-Encoding: base64
Content-Disposition: attachment ;filename="mypicture.png"

fVkVvYassFAAAABQAAAAIAAAAbWltZXR5cG==
--92ckNGfS--
```


## Documentation

You can read the full [API documentation](docs/index.md) in the *docs* folder.


### Debugging

The library includes the Node [debug](https://github.com/visionmedia/debug) module. In order to enable debugging:

In Node set the `DEBUG=mimemessage*` environment variable before running the application, or set it at the top of the script:

```javascript
process.env.DEBUG = 'mimemessage*';
```

In the browser run `mimemessage.debug.enable('mimemessage*');` and reload the page. Note that the debugging settings are stored into the browser LocalStorage. To disable it run `mimemessage.debug.disable('mimemessage*');`.


## Author

Iñaki Baz Castillo at [eFace2Face, inc.](https://eface2face.com)


## License

[MIT](./LICENSE) :)
