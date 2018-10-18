/**
 * Dependencies.
 */
const path = require('path');
const fs = require('fs');
/**
 * Constants.
 */
const MESSAGES_FOLDER = 'messages';


module.exports.readFile = function (filename) {
    const filepath = path.join(__dirname, MESSAGES_FOLDER, filename);

    // NOTE: Return this in case files are not CRLF line ended.
    // return content.replace(/\n/g, '\r\n');
    return fs.readFileSync(filepath, 'utf8');
};
