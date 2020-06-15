'use strict';

const tsm = require('teamcity-service-messages');

const titlePath = testOrSuite => {
    let result = [];
    if (testOrSuite.parent) {
        result = result.concat(titlePath(testOrSuite.parent));
    }
    if (!testOrSuite.root) {
        result.push(testOrSuite.title.trim());
    }
    return result;
};

const formatTestName = (test) => `${titlePath(test).join(': ')} [${test.browserId}]`;

module.exports = {
    onTestPending: (test) => tsm.testIgnored({name: formatTestName(test)}),

    onTestPass: (test) => {
        const testName = formatTestName(test);

        tsm
            .testStarted({name: testName})
            .testFinished({
                name: testName,
                duration: test.duration || 0
            });
    },

    onTestFail: (test) => {
        const testName = formatTestName(test);

        tsm
            .testStarted({name: testName})
            .testFailed({
                name: testName,
                message: test.err && test.err.message || 'Unknown Error',
                details: test.err && test.err.stack || test.err
            })
            .testFinished({
                name: testName,
                duration: test.duration || test.hook && test.hook.duration || 0
            });
    }
};
