/**
 * Dependencies.
 */
const expect = require('expect.js');
const mimemessage = require('../');

/**
 * Local variables.
 */
let msg;


describe('Message', () => {

    it('must create a MIME message via mimemessage.factory()', () => {
        msg = mimemessage.factory({
            contentType: 'Text/Plain',
            contentTransferEncoding: 'BASE64',
            body: 'HELLO œæ€!'
        });

        expect(msg.contentType().type).to.be('text');
        expect(msg.contentType().subtype).to.be('plain');
        expect(msg.contentType().fulltype).to.be('text/plain');
        expect(msg.contentTransferEncoding()).to.be('base64');
        expect(msg.isMultiPart()).not.to.be.ok();
        expect(msg.body).to.be('HELLO œæ€!');
    });

    it('must extend the MIME message via Message API', () => {

        msg.contentTransferEncoding('8BIT');
        expect(msg.contentTransferEncoding()).to.be('8bit');

        msg.body = [];
        expect(msg.isMultiPart()).to.be.ok();
        expect(msg.contentType().type).to.be('multipart');

        const part1 = mimemessage.factory({
            body: 'PART1'
        });

        msg.body.push(part1);
        expect(msg.body[0].contentType().fulltype).to.be('text/plain');

        const part2 = mimemessage.factory({
            contentType: 'multipart/alternative',
            body: []
        });

        msg.body.push(part2);
        expect(msg.body[1].contentType().fulltype).to.be('multipart/alternative');

        part2.body.push(mimemessage.factory({
            body: 'SUBPART1'
        }));
        part2.body.push(mimemessage.factory({
            body: 'SUBPART2'
        }));
    });

    it('must parse header custom with ;', () => {
        const contentType = 'image/png; filename="Fleshing out a sketch of a bird for a friend! - ;.png"; name="Fleshing out a sketch of a bird for a friend! - ;.png"';
        const name = 'Fleshing out a sketch of a bird for a friend! - ;.png';
        const msg = mimemessage.factory({
            contentType
        });
        expect(msg.contentType().params).to.eql({
            name, filename: name
        });
    });

});
