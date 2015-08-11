var
	/**
	 * Dependencies.
	 */
	mimemessage = require('../'),
	tools = require('./tools'),
	expect = require('expect.js');


describe('Parser', function () {

	it('must parse msg1', function () {
		var
			raw = tools.readFile('msg1'),
			msg = mimemessage.parse(raw);

		expect(msg).to.be.ok();
		expect(msg.isMultiPart()).not.to.be.ok();
		expect(msg.contentType().type).to.eql('text');
		expect(msg.contentType().subtype).to.eql('plain');
		expect(msg.contentType().fulltype).to.eql('text/plain');
		expect(msg.contentType().params).to.eql({
			charset: 'utf-8'
		});
		expect(msg.body).to.be('Hi!\r\n');
	});

	it('must parse multipart msg2', function () {
		var
			raw = tools.readFile('msg2'),
			msg = mimemessage.parse(raw),
			part1, part2;

		expect(msg).to.be.ok();
		expect(msg.isMultiPart()).to.be.ok();
		expect(msg.contentType().type).to.eql('multipart');
		expect(msg.contentType().subtype).to.eql('mixed');
		expect(msg.contentType().fulltype).to.eql('multipart/mixed');
		expect(msg.contentType().params).to.eql({
			boundary: 'simple boundary'
		});

		part1 = msg.body[0];
		expect(part1).to.be.ok();
		expect(part1.body).to.be('Body NOT ending with a linebreak.');

		part2 = msg.body[1];
		expect(part2).to.be.ok();
		expect(part2.contentType().type).to.eql('text');
		expect(part2.contentType().subtype).to.eql('plain');
		expect(part2.contentType().fulltype).to.eql('text/plain');
		expect(part2.contentType().params).to.eql({
			charset: 'us-ascii'
		});
		expect(part2.body).to.be('Body ending with a linebreak.\r\n');
	});

	it('must parse recursive multipart msg3', function () {
		var
			raw = tools.readFile('msg3'),
			msg = mimemessage.parse(raw),
			partAAAA1, partAAAA2, partAAAA3, partAAAA4, partBBBB1, partBBBB2,
			normalizedRawPrinted, normalizedParsedPrinted;

		expect(msg).to.be.ok();
		expect(msg.contentType().type).to.eql('multipart');
		expect(msg.contentType().subtype).to.eql('mixed');
		expect(msg.contentType().fulltype).to.eql('multipart/mixed');
		expect(msg.contentType().params).to.eql({
			boundary: 'AAAA'
		});

		partAAAA1 = msg.body[0];
		expect(partAAAA1).to.be.ok();
		expect(partAAAA1.body).to.be('body_AAAA_1');

		partAAAA2 = msg.body[1];
		expect(partAAAA2).to.be.ok();
		expect(partAAAA2.contentType().type).to.eql('multipart');
		expect(partAAAA2.contentType().subtype).to.eql('alternative');
		expect(partAAAA2.contentType().fulltype).to.eql('multipart/alternative');
		expect(partAAAA2.contentType().params).to.eql({
			boundary: 'BBBB'
		});

		partBBBB1 = partAAAA2.body[0];
		expect(partBBBB1).to.be.ok();
		expect(partBBBB1.contentType().type).to.eql('text');
		expect(partBBBB1.contentType().subtype).to.eql('plain');
		expect(partBBBB1.contentType().fulltype).to.eql('text/plain');
		expect(partBBBB1.contentType().params).to.eql({});
		expect(partBBBB1.body).to.be('body_BBBB_1\r\n');

		partBBBB2 = partAAAA2.body[1];
		expect(partBBBB2).to.be.ok();
		expect(partBBBB2.contentType().type).to.eql('text');
		expect(partBBBB2.contentType().subtype).to.eql('html');
		expect(partBBBB2.contentType().fulltype).to.eql('text/html');
		expect(partBBBB2.contentType().params).to.eql({});
		expect(partBBBB2.header('X-foo')).to.eql('bar');
		expect(partBBBB2.body).to.be('<h1>body_BBBB_1</h1>');

		partAAAA3 = msg.body[2];
		expect(partAAAA3).to.be.ok();
		expect(partAAAA3.contentType().type).to.eql('text');
		expect(partAAAA3.contentType().subtype).to.eql('plain');
		expect(partAAAA3.contentType().fulltype).to.eql('text/plain');
		expect(partAAAA3.contentType().params).to.eql({
			charset: 'utf-8',
			bar: 'yes'
		});
		expect(partAAAA3.contentTransferEncoding()).to.eql('quoted-printable');
		expect(partAAAA3.body).to.be('body_AAAA_3\r\n');

		partAAAA4 = msg.body[3];
		expect(partAAAA4).to.be.ok();
		expect(partAAAA4.contentType().type).to.eql('application');
		expect(partAAAA4.contentType().subtype).to.eql('epub+zip');
		expect(partAAAA4.contentType().fulltype).to.eql('application/epub+zip');
		expect(partAAAA4.contentType().params).to.eql({
			name: 'Some Book.epub'
		});
		expect(partAAAA4.header('content-disposition')).to.eql('attachment;filename="Some Book.epub"');
		expect(partAAAA4.contentTransferEncoding()).to.eql('base64');
		expect(partAAAA4.header('x-attachment-id')).to.eql('f_icxs58pn0');
		expect(partAAAA4.body).to.be('UEsDBBQAAAAAAAKfVkVvYassFAAAABQAAAAIAAAAbWltZXR5cGVhcHBsaWNhdGlvbi9lcHVi==');

		normalizedRawPrinted = raw
			.toLowerCase()
			.replace(/[\t ]+/g, ' ')
			.replace(/\r\n[\t ]+/g, ' ')
			.trim();

		normalizedParsedPrinted = msg.toString()
			.toLowerCase()
			.replace(/[\t ]+/g, ' ')
			.trim();

		expect(normalizedParsedPrinted).to.be(normalizedRawPrinted);
	});

});
