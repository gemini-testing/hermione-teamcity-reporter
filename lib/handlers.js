'use strict';

const path = require('path');
const fs = require('fs-extra');
const tsm = require('teamcity-service-messages');

const TEAMCITY_HIDDEN_ARTIFACTS_PATH = '.teamcity';

const formatTestName = (test) => {
    const fullTitle = test.fullTitle().trim();

    return `${fullTitle} [${test.browserId}]`;
};

exports.getHandlers = ({imagesDir = 'hermione-images'}) => {
    fs.ensureDirSync(imagesDir);

    const getImagePath = (test, imageName) => path.join(
        imagesDir,
        test.fullTitle().trim(),
        test.browserId.trim(),
        imageName + '.png'
    );

    const reportScreenshot = (test, imagePath) => {
        tsm.publishArtifacts(
            path.resolve(imagePath) + ' => ' + path.join(
                TEAMCITY_HIDDEN_ARTIFACTS_PATH,
                path.dirname(imagePath)
            )
        );
        var message = new tsm.Message('testMetadata', {
            testName: formatTestName(test),
            type: 'image',
            value: path.join(
                TEAMCITY_HIDDEN_ARTIFACTS_PATH,
                imagePath
            )
        });
        console.log(message.toString());
    };

    const copyAndReportScreenshot = (test, imageName, srcPath) => {
        if (!srcPath || !srcPath.path) {
            return;
        }
        const imagePath = getImagePath(test, imageName);
        fs.copy(srcPath.path, imagePath).then(() => {
            reportScreenshot(test, imagePath);
        });
    };

    const reportScreenshots = (test) => {
        if (test.err && test.err.screenshot) {
            const errPath = getImagePath(test, 'Error');
            fs.outputFile(errPath, test.err.screenshot.base64, 'base64').then(() => {
                reportScreenshot(test, errPath);
            });
        }
        if (test.assertViewResults) {
            test.assertViewResults.forEach((assertResult) => {
                const {stateName, refImg, currImg} = assertResult;
                copyAndReportScreenshot(test, `${stateName}.reference`, refImg);

                if (assertResult instanceof Error) {
                    copyAndReportScreenshot(test, `${stateName}.current`, currImg);

                    if (assertResult.saveDiffTo) {
                        const diffPath = getImagePath(test, `${stateName}.diff`);
                        assertResult.saveDiffTo(diffPath).then(() => reportScreenshot(test, diffPath));
                    }
                }
            });
        }
    };

    return {
        onTestPending: (test) => tsm.testIgnored({name: formatTestName(test)}),

        onTestPass: (test) => {
            const testName = formatTestName(test);

            tsm
                .testStarted({name: testName})
                .testFinished({
                    name: testName,
                    duration: test.duration || 0
                });
            reportScreenshots(test);
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
            reportScreenshots(test);
        }
    };
};
