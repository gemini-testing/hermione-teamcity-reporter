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

Besides, you can switch on or switch off the plugin depending on the environment, for example, this way:

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
