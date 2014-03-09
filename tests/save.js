var util = require('util');
var capture = require('../index');
var sinon = require('sinon');
var expect = require('expect.js');
var fs = require('fs');
var path = require('path');
var fsUtil = require('../src/util/fs');

describe('save', function () {
    beforeEach(function () {
        sinon.stub(fs, 'readFileSync').returns('hello world');
        sinon.stub(fs, 'writeFileSync');
    });

    afterEach(function () {
        fs.readFileSync.restore();
        fs.writeFileSync.restore();
    });

    it('should save google.req as ~/.capture/save/google', function () {
        capture.save('google.req', 'google');

        expect(fs.readFileSync.callCount).to.be(1);
        expect(fs.readFileSync.args[0]).to.eql(['google.req']);

        expect(fs.writeFileSync.callCount).to.be(1);
        expect(fs.writeFileSync.args[0]).to.eql([path.join(fsUtil.homePath(), '.capture/save/google'), 'hello world']);
    });
});

describe('load', function () {
    beforeEach(function () {
        sinon.stub(fs, 'readFileSync').returns('hello world');
        var exists = sinon.stub(fs, 'exists');
        exists.withArgs('newFile').returns(false);
        exists.withArgs('localFile').returns(true);
        exists.withArgs('savedFile').returns(false);
        exists.withArgs(path.join(fsUtil.homePath(), '.capture/save/savedFile')).returns(true);
    });

    afterEach(function () {
        fs.readFileSync.restore();
        fs.exists.restore();
    });

    it('should return null if no file exists', function () {
        var result = capture.load('newFile');

        expect(result).to.be(null);
    });

    it('should return contents for a file that exists in the current path', function () {
        var result = capture.load('localFile');

        expect(result).to.be('hello world');
    });

    it('should return contents for a file that does not exist in the current path, but exists in the saved files folder', function () {
        var result = capture.load('savedFile');

        expect(result).to.be('hello world');
    });
});
