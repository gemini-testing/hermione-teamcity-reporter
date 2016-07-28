'use strict';

const EventEmitter = require('events').EventEmitter;

const hermioneEvents = require('hermione/lib/constants/runner-events');

const teamcityReporter = require('../../lib');
const handlers = require('../../lib/handlers');

describe('hermione-teamcity-reporter', () => {
    const sandbox = sinon.sandbox.create();

    let hermione;

    const initHermioneWithPlugin = (pluginConfig) => {
        hermione = new EventEmitter();

        sandbox.spy(hermione, 'on');

        hermione.events = hermioneEvents;

        teamcityReporter(hermione, pluginConfig);
    };

    afterEach(() => sandbox.restore());

    it('should do nothing if plugin is disabled', () => {
        initHermioneWithPlugin({enabled: false});

        assert.notCalled(hermione.on);
    });

    describe('handling of events', () => {
        beforeEach(() => {
            initHermioneWithPlugin();

            sandbox.stub(handlers, 'onTestPending');
            sandbox.stub(handlers, 'onTestPass');
            sandbox.stub(handlers, 'onTestFail');
        });

        it('should handle event `TEST_PENDING`', () => {
            hermione.emit(hermione.events.TEST_PENDING, {some: 'data'});

            assert.calledWith(handlers.onTestPending, {some: 'data'});
        });

        it('should handle event `TEST_PASS`', () => {
            hermione.emit(hermione.events.TEST_PASS, {some: 'data'});

            assert.calledWith(handlers.onTestPass, {some: 'data'});
        });

        it('should handle event `TEST_FAIL`', () => {
            hermione.emit(hermione.events.TEST_FAIL, {some: 'data'});

            assert.calledWith(handlers.onTestFail, {some: 'data'});
        });

        it('should handle event `SUITE_FAIL`', () => {
            hermione.emit(hermione.events.SUITE_FAIL, {some: 'data'});

            assert.calledWith(handlers.onTestFail, {some: 'data'});
        });
    });
});
