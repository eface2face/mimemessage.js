var
	/**
	 * Dependencies.
	 */
	path = require('path'),
	fs = require('fs'),

	/**
	 * Constants.
	 */
	MESSAGES_FOLDER = 'messages';


module.exports.readFile = function (filename) {
	var
		filepath = path.join(__dirname, MESSAGES_FOLDER, filename),
		content = fs.readFileSync(filepath, 'utf8');

	// NOTE: Return this in case files are not CRLF line ended.
	// return content.replace(/\n/g, '\r\n');
	return content;
};
