'use strict';

const path = require('path');
const fs = require('fs-extra');
const tsm = require('teamcity-service-messages');

const formatTestName = (test) => {
    const fullTitle = test.fullTitle().trim();

    return `${fullTitle} [${test.browserId}]`;
};

exports.getHandlers = args => {
    const imagesDir = args.imagesDir || 'hermione-images';
    const reportScreenshotsOption = args.reportScreenshots !== undefined ? args.reportScreenshots : 'onlyFailures';
    fs.ensureDirSync(imagesDir);

    const getImagePath = (test, imageName) => path.join(
        imagesDir,
        test.fullTitle().trim(),
        test.browserId.trim(),
        imageName + '.png'
    );

    const reportScreenshot = (test, imagePath) => {
        tsm.publishArtifacts(
            `${path.resolve(imagePath)} => ${path.dirname(imagePath)}`
        );
        tsm.testMetadata({
            testName: formatTestName(test),
            type: 'image',
            value: imagePath
        });
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
        if (!reportScreenshotsOption) {
            return;
        }
        if (test.err && test.err.screenshot) {
            const errPath = getImagePath(test, 'Error');
            fs.outputFile(errPath, test.err.screenshot.base64, 'base64').then(() => {
                reportScreenshot(test, errPath);
            });
        }
        if (test.assertViewResults) {
            test.assertViewResults.forEach((assertResult) => {
                const stateName = assertResult.stateName;
                const refImg = assertResult.refImg;
                const currImg = assertResult.currImg;
                if (assertResult instanceof Error || reportScreenshotsOption === 'always') {
                    copyAndReportScreenshot(test, `${stateName}.reference`, refImg);
                }

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
