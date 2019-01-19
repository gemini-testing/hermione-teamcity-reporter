'use strict';

var path = require('path');
var fs = require('fs-extra');
const tsm = require('teamcity-service-messages');

const handlersModule = require('../../lib/handlers');

const resolveImmediately = () => ({
    then: (callback) => callback()
});

describe('handlers', () => {
    const sandbox = sinon.sandbox.create();
    let handlers;
    let saveDiffTo;

    beforeEach(() => {
        [
            'testIgnored',
            'testStarted',
            'testFailed',
            'testFinished',
            'publishArtifacts'
        ].forEach((method) => {
            sandbox.stub(tsm, method).returns(tsm);
        });
        sandbox.stub(tsm, 'Message', (_, {value}) => ({
            toString: () => `Message(${value})`
        }));
        sandbox.stub(console, 'log');
        sandbox.stub(path, 'resolve', path.join.bind(path, '<cwd>'));
        sandbox.stub(fs, 'ensureDirSync');
        sandbox.stub(fs, 'copy', resolveImmediately);
        saveDiffTo = sandbox.spy(resolveImmediately);
        handlers = handlersModule.getHandlers({});
    });

    afterEach(() => sandbox.restore());

    const stubTest = (test) => {
        test = test || {};

        test.fullTitle = test.fullTitle || sinon.stub().returns(test.title || 'default-title');

        return test;
    };

    const stubAssertViewResult = (stateName, isError) => {
        const stub = {
            stateName,
            refImg: {
                path: `path/to/${stateName}/ref`
            },
            currImg: {
                path: `path/to/${stateName}/curr`
            },
            saveDiffTo
        };
        return isError ? Object.assign(new Error(), stub) : stub;
    };

    describe('initialization', () => {
        it('should create directory for images', function() {
            assert.calledWith(fs.ensureDirSync, 'hermione-images');
        });

        it('should support custom directory', function() {
            handlersModule.getHandlers({imagesDir: 'imagesDir'});
            assert.calledWith(fs.ensureDirSync, 'imagesDir');
        });
    });

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

        it('should copy & report reference images', () => {
            const test = stubTest({
                title: 'test',
                browserId: 'bro',
                assertViewResults: [
                    stubAssertViewResult('foo'),
                    stubAssertViewResult('bar')
                ]
            });

            handlers.onTestPass(test);

            assert.calledWith(
                fs.copy,
                'path/to/foo/ref',
                'hermione-images/test/bro/foo.reference.png'
            );
            assert.calledWith(
                fs.copy,
                'path/to/bar/ref',
                'hermione-images/test/bro/bar.reference.png'
            );
            assert.calledWith(
              tsm.publishArtifacts,
              '<cwd>/hermione-images/test/bro/foo.reference.png => .teamcity/hermione-images/test/bro'
            );
            assert.calledWith(
              tsm.publishArtifacts,
              '<cwd>/hermione-images/test/bro/bar.reference.png => .teamcity/hermione-images/test/bro'
            );
            assert.calledWithMatch(tsm.Message, 'testMetadata', {
                testName: 'test [bro]',
                type: 'image',
                value: '.teamcity/hermione-images/test/bro/foo.reference.png'
            });
            assert.calledWithMatch(tsm.Message, 'testMetadata', {
                testName: 'test [bro]',
                type: 'image',
                value: '.teamcity/hermione-images/test/bro/bar.reference.png'
            });
            assert.calledWith(console.log, 'Message(.teamcity/hermione-images/test/bro/foo.reference.png)');
            assert.calledWith(console.log, 'Message(.teamcity/hermione-images/test/bro/bar.reference.png)');
        });

        it('shouldn\'t copy or report any other images', () => {
            const test = stubTest({
                title: 'test',
                browserId: 'bro',
                assertViewResults: [
                    stubAssertViewResult('foo')
                ]
            });

            handlers.onTestPass(test);

            assert.calledOnce(fs.copy);
            assert.calledOnce(tsm.publishArtifacts);
            assert.calledOnce(tsm.Message);
            assert.calledOnce(console.log);
            assert.notCalled(saveDiffTo);
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

        it('should copy & report reference images', () => {
            const test = stubTest({
                title: 'test',
                browserId: 'bro',
                assertViewResults: [
                    stubAssertViewResult('foo'),
                    stubAssertViewResult('bar', true)
                ]
            });

            handlers.onTestFail(test);

            assert.calledWith(
              fs.copy,
              'path/to/foo/ref',
              'hermione-images/test/bro/foo.reference.png'
            );
            assert.calledWith(
              fs.copy,
              'path/to/bar/ref',
              'hermione-images/test/bro/bar.reference.png'
            );
            assert.calledWith(
              tsm.publishArtifacts,
              '<cwd>/hermione-images/test/bro/foo.reference.png => .teamcity/hermione-images/test/bro'
            );
            assert.calledWith(
              tsm.publishArtifacts,
              '<cwd>/hermione-images/test/bro/bar.reference.png => .teamcity/hermione-images/test/bro'
            );
            assert.calledWithMatch(tsm.Message, 'testMetadata', {
                testName: 'test [bro]',
                type: 'image',
                value: '.teamcity/hermione-images/test/bro/foo.reference.png'
            });
            assert.calledWithMatch(tsm.Message, 'testMetadata', {
                testName: 'test [bro]',
                type: 'image',
                value: '.teamcity/hermione-images/test/bro/bar.reference.png'
            });
            assert.calledWith(console.log, 'Message(.teamcity/hermione-images/test/bro/foo.reference.png)');
            assert.calledWith(console.log, 'Message(.teamcity/hermione-images/test/bro/bar.reference.png)');
        });

        it('should copy & report current images for failed assertions only', () => {
            const test = stubTest({
                title: 'test',
                browserId: 'bro',
                assertViewResults: [
                    stubAssertViewResult('foo'),
                    stubAssertViewResult('bar', true)
                ]
            });

            handlers.onTestFail(test);

            assert.calledWith(
              fs.copy,
              'path/to/bar/curr',
              'hermione-images/test/bro/bar.current.png'
            );
            assert.calledWith(
              tsm.publishArtifacts,
              '<cwd>/hermione-images/test/bro/bar.current.png => .teamcity/hermione-images/test/bro'
            );
            assert.calledWithMatch(tsm.Message, 'testMetadata', {
                testName: 'test [bro]',
                type: 'image',
                value: '.teamcity/hermione-images/test/bro/bar.current.png'
            });
            assert.calledWith(console.log, 'Message(.teamcity/hermione-images/test/bro/bar.current.png)');
        });

        it('should copy & report diff images for failed assertions only', () => {
            const test = stubTest({
                title: 'test',
                browserId: 'bro',
                assertViewResults: [
                    stubAssertViewResult('foo'),
                    stubAssertViewResult('bar', true)
                ]
            });

            handlers.onTestFail(test);

            assert.calledWithMatch(
              saveDiffTo,
              'hermione-images/test/bro/bar.diff.png'
            );
            assert.calledOnce(saveDiffTo);
            assert.calledWith(
              tsm.publishArtifacts,
              '<cwd>/hermione-images/test/bro/bar.diff.png => .teamcity/hermione-images/test/bro'
            );
            assert.calledWithMatch(tsm.Message, 'testMetadata', {
                testName: 'test [bro]',
                type: 'image',
                value: '.teamcity/hermione-images/test/bro/bar.diff.png'
            });
            assert.calledWith(console.log, 'Message(.teamcity/hermione-images/test/bro/bar.diff.png)');
        });
    });
});
