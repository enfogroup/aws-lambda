# Introduction

This is a fleshed out typescript NPM package template. If you have just created a new repository using this template you should read this README and then update it to contain information about your package.

Have fun!

## Quick start

Update the contents of src to contain your desired code. Write unit tests. Commit and run the manual trigger on the pipeline. Done! You will have to manually maintain control of versions between publications.

## Features

* Pre-configured to work immediately in Bitbucket pipelines
* Husky hooks enforcing work flows
* Commit lint enforcing commit message format
* Linting using [ESLint](https://www.npmjs.com/package/eslint) and [ESLint Standard](https://www.npmjs.com/package/eslint-config-standard) configuration
* Ready to use build script using [Webpack](https://webpack.js.org/)
* Testing using [Jest](https://jestjs.io/)

## Explanation of installed packages

* @commitlint/* Enforces commit message format
* @types/node Fixes error message that will otherwise show up in tsconfig, also useful when coding
* @typescript/* and eslint* Used for linting
* husky Adds support for git hooks which can run pre-commit and pre-push
* jest and ts-jest Used for testing
* typescript Hopefully obvious. Locked at 3.9.7 to resolve a typescript path problem.
* webpack* Used for building
* ts-loader Used to load typescript in webpack
* dotenv-webpack Used to read .env file and adding variables to code. This should only be used for non-sensitive things such as urls.
* tsconfig-paths-webpack-plugin Used to handle typescript paths in Webpack
* copy-webpack-plugin Used to copy package.json and README.MD to output folder
* ttypescript and typescript-transform-paths Used to transform typescript paths in declarations file output

## Notes on testing

The Jest configuration is setup to allow traffic over the Internet. The main purpose of this is to allow integration tests in case you are writing an SDK for an API or similar. The configuration is also set to require 100 percent coverage on all metrics. Please respect this when writing a package as it will make life easier for anyone wanting to contribute.

## Contributing

Create a pull request and make sure your test coverage is 100 percent.
