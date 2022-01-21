# hermione-teamcity-reporter [![Build Status](https://travis-ci.org/gemini-testing/hermione-teamcity-reporter.svg?branch=master)](https://travis-ci.org/gemini-testing/hermione-teamcity-reporter)

[Hermione](https://github.com/gemini-testing/hermione) reporter for TeamCity CI.
Read more about `Hermione` plugins in the [documentation](https://github.com/gemini-testing/hermione#plugins).

## Install

```bash
$ npm install hermione-teamcity-reporter
```

## Usage

Add plugin to your configuration file:

```js
module.exports = {
    plugins: {
        'teamcity-reporter': true
    }
};
```

## Options

### enabled

Boolean, condition for enabling the plugin.
For example, you can switch on or switch off the plugin depending on the environment:

```js
module.exports = {
    plugins: {
        'teamcity-reporter': {
            // plugin will be enabled only when hermione is run in TeamCity CI
            enabled: Boolean(process.env.TEAMCITY_VERSION)
        }
    }
};
```

### reportScreenshots

Boolean, whether to report screenshots as [test metadata](https://www.jetbrains.com/help/teamcity/reporting-test-metadata.html). `true` by default.

```
module.exports = {
    plugins: {
        'teamcity-reporter': {
            reportScreenshots: false
        }
    }
};
```

### imagesDir

String, directory to save images to. `hermione-images` by default.

```
module.exports = {
    plugins: {
        'teamcity-reporter': {
            imagesDir: 'path/to/my/dir'
        }
    }
};
```

