# lhc-vdm-editor

A code and file editor for VdM scans.

![GitHub test status](https://github.com/CERN/lhc-vdm-editor/workflows/Tests/badge.svg)

![lhc-vdm-editor screenshot](https://user-images.githubusercontent.com/6304200/63919839-d1049680-ca3f-11e9-862a-dac7d8d756c7.png)



## Features

* A VdM code editor, including: 
  - Syntax highlighting
  - Syntax checking
  - Autocompletion
  - Auto generation of line numbers
  - VdM file headers and hints for VdM commands
* A file browser tracking files on a GitLab repository.
* Graphs containing simulations of expected beam position and luminosity.
* Generation of common VdM scans.

## Local Development

* Create the file `/secrets.json` with the format `{"token": <TOKEN>}`.
* Install all the dev dependencies: `npm install`.
* Run a http server: `npm run-script test-server`.

### For testing:
#### In the browser
* Open 127.0.0.1:8080/SpecRunner.html
* To test specific files, you can use the spec parameter e.g. `127.0.0.1:8080/SpecRunner.html?spec=CodeEditor`
#### In a headless chrome instance, with coverage reports
* Run `node console_test.js`

### For viewing the editor locally:
* Open 127.0.0.1:8080/index.html

### Linting
This package is linted using tslint: `npm run-script lint`
