'use strict';

const handlersModule = require('./handlers');

module.exports = (hermione, pluginConfig) => {
    pluginConfig = pluginConfig || {};

    if (pluginConfig.enabled === false) {
        return;
    }

    const handlers = handlersModule.getHandlers(pluginConfig);

    hermione.on(hermione.events.TEST_PENDING, (test) => handlers.onTestPending(test));
    hermione.on(hermione.events.TEST_PASS, (test) => handlers.onTestPass(test));

    hermione.on(hermione.events.TEST_FAIL, (test) => handlers.onTestFail(test));
    // Event `SUITE_FAIL` can be handled as event `TEST_FAIL`
    hermione.on(hermione.events.SUITE_FAIL, (fail) => handlers.onTestFail(fail));
};
