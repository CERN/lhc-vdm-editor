$(document).ready(function () {
    // Put datastructure into the veiwer
    /* let table = document.getElementById('table');
    table.content = source_commands; */

    let file = `0 INITIALIZE_TRIM IP(IP8) BEAM(BEAM1,BEAM2) PLANE(SEPARATION,CROSSING) UNITS(SIGMA)
1 SECONDS_WAIT 20
2 RELATIVE_TRIM IP8 BEAM1 CROSSING -3.375 SIGMA IP8 BEAM2 CROSSING 3.375 SIGMA
3 SECONDS_WAIT 10
4 RELATIVE_TRIM IP8 BEAM1 CROSSING 0.375 SIGMA IP8 BEAM2 CROSSING -0.375 SIGMA
5 SECONDS_WAIT 10`



    // Here I do stuff with the object!
    VdMObject = new VdMConstructor(file);
});

class SyntaxError {
    constructor(line, message) {
        this.line = line;
        this.message = message;
    }
}

class VdMConstructor {
    /**
     * @param {string} data
     */
    constructor(data) {
        this.lines = this._parse(data);
        this._simulateBeamPath(this.lines);

        // Some code that checks whether there is an INITIALIZE_TRIM line
    }

    /**
     * @param {string} command
     * @param {int} newLineNum
     * @param {Array} args
     */
    addLine(newLineNum, command, args) {
        let obj = {
            'command': command,
            'args': args
        }
        let start = this.lines.slice(0, newLineNum);
        let end = this.lines.slice(newLineNum);
        let middle = [obj];
        this.lines = start.concat(middle, end);
        this._simulateBeamPath(this.lines);
    }
    /**
     * @param {string} newLine
     * @param {int} newLineNum
     */
    removeLine(lineNum) {
        let start = this.lines.slice(0, lineNum);
        let end = this.lines.slice(lineNum + 1);
        this.lines = start.concat(end);
        this._simulateBeamPath(this.lines);
    }
    /**
     * @param {string} command
     * @param {int} lineNum
     * @param {Array} args
     */
    replaceLine(lineNum, command, args) {
        this.removeLine(lineNum);
        this.addLine(lineNum, command, args);
    }

    /**
     * @param {Array} lineArr
     */
    _parse(data) {
        let lineArr = data.split(/\n/);
        let objArr = [];
        try {
            if (!Array.isArray(lineArr)) {
                throw new SyntaxError({}'_commandlinesToObjects takes an array! Got "' + typeof lineArr + '" with value: ' + JSON.stringify(lineArr))
            }
            for (let i = 0; i < lineArr.length; i++) {
                // Deconstruct string into arguments
                let tmp = lineArr[i].trim().split(/\s+/);
                let obj = {};
                // Check for valid lines
                if (!isInteger(tmp[0])) {
                    if (tmp[0] == '') {
                        // Do nothing
                    } else if (tmp[0].charAt(0) == '#') {
                        obj.comment = tmp[0];
                    } else {
                        throw new SyntaxError(i, 'Line has to be of the type "#COMMENT", "INT COMMAND", or "EMPTY_LINE"')
                    }
                } else { // Create object from command line
                    if (tmp.length < 2) {
                        throw new SyntaxError(i, 'Command line has to include: "int + command" but got: ' + tmp);
                    }
                    obj.command = tmp[1];
                    obj.args = tmp.slice(2);
                    try{_validateArgs(obj)} catch(err){throw new SyntaxError(i, err)}
                }
                objArr.push(obj);
            }
        } catch (err) {
            throw Error('Error while parsing line' + err.line + '.\n' + err.message)
        }
        return objArr
    }

    _validateArgs(obj) {
        if (!commandHandler[obj.command]) {
            throw 'Invalid command ' + obj.command
        } else {
            
        }
        let commandHandler = {
            'INITIALIZE_TRIM': function (ips, beams, planes, units) {

            },
            'SECONDS_WAIT': function (arg) {

            },
            'RELATIVE_TRIM': function (...actions) {

            },
            'ABSOLUTE_TRIM': function (...actions) {

            },
            'START_FIT': function (plane, type) {

            },
            'END_FIT': function (plane) {

            },
            'END_SEQUENCE': function (actions) {

            },
            'MESSAGE': function (message) {

            }
        }
    }
    /**
     * 
     * @param {*} objArr 
     */
    // Maybe 'updateBeamPath' more fitting. Do not know what to put in above
    _simulateBeamPath(objArr) {
        let beamPos = {
            'BEAM1': { 'CROSSING': 0.0, 'SEPARATION': 0.0 },
            'BEAM2': { 'CROSSING': 0.0, 'SEPARATION': 0.0 }
        }
        let stepTime = 0.0;
        let realTime = 0.0;

        function toMM()
        let commandHandler = {
            'INITIALIZE_TRIM': function (ips, beams, planes, units) {

            },
            'SECONDS_WAIT': function (arg) {
                let duration = parseFloat(arg);
                if (!Number.isFinite(duration)) {
                    throw 'Wait time has to be finite but got: ' + duration
                }
                stepTime += duration;
                realTime += duration;
            },
            'RELATIVE_TRIM': function (...actions) {
                for (let i = 0; i < actions.length; i += 5) {
                    // Check if IP = actions[0] is in INITIALIZE
                    // Check if BEAM = actions[1] is in INITIALIZE
                    // Check if PLANE = actions[2] is in INITIALIZE
                    // Check if UNIT = actions[4] is in INITIALIZE
                    let beam = actions[1];
                    let plane = actions[2];
                    let amount = actions[3];
                    let unit = actions[4];
                    if (unit == 'SIGMA') { amount = toMM(amount) };
                    beamPos[beam][plane] += amount;
                }
            },
            'ABSOLUTE_TRIM': function (...actions) {

            },
            'START_FIT': function (plane, type) {

            },
            'END_FIT': function (plane) {

            },
            'END_SEQUENCE': function (actions) {

            },
            'MESSAGE': function (message) {

            }
        }

        // Read one line at a time and apply commands
        let i = 0;
        try {
            if (objArr[0].command != 'INITIALIZE_TRIM') {
                throw 'Expected first line to be an "INITIALIZE_TRIM" command but got ' + objArr[0].command
            }
            while (i < objArr.length) {
                let step = objArr[i];
                commandHandler[step.command].apply(step, step.args);
                step.beamPos = beamPos;
                step.stepTime = stepTime;
                step.realTime = realTime;
                i++;
            }
        } catch (err) {
            throw 'Error in executing line ' + i + '\n' + err
        }
    }
}