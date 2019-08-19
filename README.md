# lhc-vdm-editor

An code and file editor for VdM scans.

![lhc-vdm-editor-pic](https://user-images.githubusercontent.com/6304200/63268652-f1409280-c294-11e9-92fa-ef0ecc4c37c8.png)

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
* Open 127.0.0.1:8080/SpecRunner.html
* To test specific files, you can use the spec parameter e.g. `127.0.0.1:8080/SpecRunner.html?spec=CodeEditor`

### For viewing the editor locally:
* Open 127.0.0.1:8080/index.html
