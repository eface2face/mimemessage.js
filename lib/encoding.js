
const RFC2045_LIMIT = 76;

const wrapline = (line, escape = '', limit = RFC2045_LIMIT) => {
    const lineCount = Math.ceil(line.length / limit);
    const result = Array.from({ length: lineCount }, (_, i) => line.substring(limit * i, limit * (i + 1)));
    return result.join(escape + '\r\n');
};
// the newlines in mime messages are \r\n. This function expects \n as incoming lines and produces \r\n newlines.
const wraplines = (lines, escape = '', limit = RFC2045_LIMIT) =>
    lines
        .split('\n')
        .map((line) => wrapline(line, escape, limit))
        .join('\r\n');

// Don't escape newlines, tabs, everything between space and ~ save the = sign.
const MATCH_ESCAPE_CHARS = /[^\t\n\r\x20-\x3C\x3E-\x7E]/g;
const encodeQPSequence = (char) =>
    '=' +
    (
        '00' +
        char
            .charCodeAt(0)
            .toString(16)
            .toUpperCase()
    ).substr(-2);
const encodeQPSequences = (input) => input.replace(MATCH_ESCAPE_CHARS, encodeQPSequence);
const normalLinebreaks = (input) => input.replace(/(\r\n|\n|\r)/g, '\n');
// restore wrapping in escape sequences ==\r\n0D, =0\r\nD -> =0D=\r\n
const restoreQPSequences = (input) =>
    input.replace(
        /(?=.{0,2}=\r\n)(=(=\r\n)?[0-9A-F](=\r\n)?[0-9A-F])/g,
        (seq) => seq.replace(/=\r\n/, '') + '=\r\n'
    );
const wrapQPLines = (input) => restoreQPSequences(wraplines(input, '=', RFC2045_LIMIT - 2));
const encodeQPTrailingSpace = (input) => input.replace(/ $/gm, ' =\r\n\r\n');

const encodeUTF8 = (value) => {
    // only encode if it has > 8 bits, otherwise it's fine
    // eslint-disable-next-line no-control-regex
    if (!/[^\u0000-\u00ff]/.test(value)) {
        return value;
    }
    return unescape(encodeURIComponent(value));
};
const decodeUTF8 = (value) => {
    try {
        return decodeURIComponent(escape(value));
    } catch (e) {
        return value;
    }
};

const base64encode = typeof btoa === 'undefined' ? (str) => Buffer.from(str, 'binary').toString('base64') : btoa;
const base64decode = typeof atob === 'undefined' ? (str) => Buffer.from(str, 'base64').toString('binary') : atob;

const encodeBase64 = (value) => wraplines(base64encode(value));
const decodeBase64 = (value) => base64decode(value);


/**
 * Quoted-Printable, or QP encoding, is an encoding using printable ASCII characters
 * (alphanumeric and the equals sign =) to transmit 8-bit data over a 7-bit data path)
 * Any 8-bit byte value may be encoded with 3 characters: an = followed by two hexadecimal digits (0–9 or A–F)
 * representing the byte's numeric value. For example, an ASCII form feed character (decimal value 12) can be
 * represented by "=0C", and an ASCII equal sign (decimal value 61) must be represented by =3D.
 * All characters except printable ASCII characters or end of line characters (but also =)
 * must be encoded in this fashion.
 *
 * All printable ASCII characters (decimal values between 33 and 126) may be represented by themselves, except =
 * (decimal 61).
 *
 * @param binarydata
 * @return 7-bit encoding of the input using QP encoding
 */
const encodeQP = (binarydata) => encodeQPTrailingSpace(wrapQPLines(normalLinebreaks(
        encodeQPSequences(encodeUTF8(binarydata)))
    ));

const removeSoftBreaks = (value) => value.replace(/=(\r\n|\n|\r)|/g, '');

const decodeQuotedPrintables = (value) => value.replace(/=([0-9A-F][0-9A-F])/gm, (match, contents) => {
    return String.fromCharCode(parseInt(contents, 16));
});

const decodeQP = (value) => {
    return decodeUTF8(decodeURIComponent(escape(decodeQuotedPrintables(removeSoftBreaks(value)))));
};

module.exports = {
    encodeBase64,
    decodeBase64,
    encodeQP,
    decodeQP
};
