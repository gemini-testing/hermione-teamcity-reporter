'use strict';

const tsm = require('teamcity-service-messages');

const handlers = require('../../lib/handlers');

describe('handlers', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        ['testIgnored', 'testStarted', 'testFailed', 'testFinished'].forEach((method) => {
            sandbox.stub(tsm, method).returns(tsm);
        });
    });

    afterEach(() => sandbox.restore());

    const stubTest = (test) => {
        test = test || {};

        test.fullTitle = test.fullTitle || sinon.stub().returns(test.title || 'default-title');

        return test;
    };

    describe('.onTestPending', () => {
        it('should consider test as pending', () => {
            handlers.onTestPending(stubTest({title: 'test', browserId: 'bro'}));

            assert.calledWith(tsm.testIgnored, {name: 'test [bro]'});
        });
    });

    describe('.onTestPass', () => {
        it('should start test', () => {
            handlers.onTestPass(stubTest({title: 'test', browserId: 'bro'}));

            assert.calledWith(tsm.testStarted, {name: 'test [bro]'});
        });

        it('should finish test', () => {
            handlers.onTestPass(stubTest({title: 'test', browserId: 'bro', duration: 100500}));

            assert.calledWith(tsm.testFinished, {name: 'test [bro]', duration: 100500});
        });

        it('should handle cases when there is no any information about test duration', () => {
            handlers.onTestPass(stubTest());

            assert.calledWithMatch(tsm.testFinished, {duration: 0});
        });

        it('should finish test after test start', () => {
            handlers.onTestPass(stubTest());

            assert.callOrder(tsm.testStarted, tsm.testFinished);
        });

        it('should trim full test title', () => {
            const test = stubTest({
                fullTitle: sinon.stub().returns('  test  '),
                browserId: 'bro'
            });

            handlers.onTestPass(test);

            assert.calledWith(tsm.testStarted, {name: 'test [bro]'});
            assert.calledWithMatch(tsm.testFinished, {name: 'test [bro]'});
        });
    });

    describe('.onTestFail', () => {
        it('should start test', () => {
            handlers.onTestFail(stubTest({title: 'test', browserId: 'bro'}));

            assert.calledWith(tsm.testStarted, {name: 'test [bro]'});
        });

        it('should fail test', () => {
            handlers.onTestFail(stubTest({title: 'test', browserId: 'bro'}));

            assert.calledWithMatch(tsm.testFailed, {name: 'test [bro]'});
        });

        it('should pass error message from failed test', () => {
            handlers.onTestFail(stubTest({err: {message: 'awesome-error'}}));

            assert.calledWithMatch(tsm.testFailed, {message: 'awesome-error'});
        });

        it('should handle cases when failed test does not contain error message', () => {
            handlers.onTestFail(stubTest({err: {}}));

            assert.calledWithMatch(tsm.testFailed, {message: 'Unknown Error'});
        });

        it('should handle cases when failed test does not contain error at all', () => {
            handlers.onTestFail(stubTest());

            assert.calledWithMatch(tsm.testFailed, {message: 'Unknown Error'});
        });

        it('should pass error stack from failed test', () => {
            handlers.onTestFail(stubTest({err: {stack: 'awesome-stack'}}));

            assert.calledWithMatch(tsm.testFailed, {details: 'awesome-stack'});
        });

        it('should handle cases when failed test does not contain error stack', () => {
            handlers.onTestFail(stubTest({err: {some: 'error'}}));

            assert.calledWithMatch(tsm.testFailed, {details: {some: 'error'}});
        });

        it('should finish test', () => {
            handlers.onTestFail(stubTest({title: 'test', browserId: 'bro', duration: 100500}));

            assert.calledWith(tsm.testFinished, {name: 'test [bro]', duration: 100500});
        });

        it('should use hook duration if there is no duration in failed test', () => {
            handlers.onTestFail(stubTest({hook: {duration: 100500}}));

            assert.calledWithMatch(tsm.testFinished, {duration: 100500});
        });

        it('should use test duration instead of hook duration if specified both', () => {
            handlers.onTestFail(stubTest({duration: 100500, hook: {duration: 500100}}));

            assert.calledWithMatch(tsm.testFinished, {duration: 100500});
        });

        it('should handle cases when there is no any information about test duration', () => {
            handlers.onTestFail(stubTest());

            assert.calledWithMatch(tsm.testFinished, {duration: 0});
        });

        it('should start, fail and finish test', () => {
            handlers.onTestFail(stubTest());

            assert.callOrder(tsm.testStarted, tsm.testFailed, tsm.testFinished);
        });

        it('should trim full test title', () => {
            const test = stubTest({
                fullTitle: sinon.stub().returns('  test  '),
                browserId: 'bro'
            });

            handlers.onTestFail(test);

            assert.calledWith(tsm.testStarted, {name: 'test [bro]'});
            assert.calledWithMatch(tsm.testFailed, {name: 'test [bro]'});
            assert.calledWithMatch(tsm.testFinished, {name: 'test [bro]'});
        });
    });
});
