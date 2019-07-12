$(document).ready(function () {
    // Put datastructure into the veiwer
    /* let table = document.getElementById('table');
    table.content = source_commands; */

    let file = `0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA)
1 SECONDS_WAIT 10.0
2 START_FIT SEPARATION GAUSSIAN
3 RELATIVE_TRIM IP1 BEAM1 SEPARATION -3.0 SIGMA IP1 BEAM2 SEPARATION 3.0 SIGMA
4 SECONDS_WAIT 10.0
5 RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.0 SIGMA IP1 BEAM2 SEPARATION -1.0 SIGMA
6 SECONDS_WAIT 10.0
7 RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.0 SIGMA IP1 BEAM2 SEPARATION -1.0 SIGMA
8 SECONDS_WAIT 10.0
9 RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.0 SIGMA IP1 BEAM2 SEPARATION -1.0 SIGMA
10 SECONDS_WAIT 10.0
11 RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.0 SIGMA IP1 BEAM2 SEPARATION -1.0 SIGMA
12 SECONDS_WAIT 10.0
13 RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.0 SIGMA IP1 BEAM2 SEPARATION -1.0 SIGMA
14 SECONDS_WAIT 10.0
15 RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.0 SIGMA IP1 BEAM2 SEPARATION -1.0 SIGMA
16 SECONDS_WAIT 10.0
17 RELATIVE_TRIM IP1 BEAM1 SEPARATION -3.0 SIGMA IP1 BEAM2 SEPARATION 3.0 SIGMA
18 SECONDS_WAIT 10.0
19 END_FIT
20 END_SEQUENCE`

    console.log(JSON.stringify(parseVdM(file)))
    console.log(JSON.stringify(parseVdM('0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA) \n 1 END_SEQUENCE')))
});

class SyntaxError {
    constructor(line, message) {
        this.line = line;
        this.message = message;
    }
}

/**
 * @param {string} data
 */
export default function parseVdM(data) {
    // Array to be filled and then returned as the VdM structure
    let objArr = [];
    // Containers for expected arguments
    let IP = [];
    let beams = [];
    let planes = [];
    let planesContainer = [];
    let units = [];
    // Alowed arguments
    // Valid IPs are IP1 IP2 IP5 IP8
    let fitTypes = ['GAUSSIAN', 'GAUSSIAN_PLUS_CONSTANT'];
    let beamTypes = ['BEAM1', 'BEAM2'];
    let planeTypes = ['SEPARATION', 'CROSSING'];
    let unitTypes = ['SIGMA', 'MM'];
    // Variables used during parseing
    let lineArr = data.split(/\n/).map(x => x.trim());
    let currentlineNum = 0;
    let hasEnded = false;
    // Parse
    try {
        for (let i = 0; i < lineArr.length; i++) {
            // Object to be pushed to the structure
            let obj = {};
            // Deconstruct string into arguments
            let line = lineArr[i].split(/\s+/);
            // Check line syntax
            // Line type is NOT a command line (initialised with an integer)
            if (!line[0].match(/^(?:[1-9][0-9]*|0)$/)) {
                if (line[0] == '') {
                    obj.type = 'empty';
                } else if (line[0].charAt(0) == '#') {
                    obj.type = 'comment';
                    obj.comment = lineArr[i].slice(1).trim();
                } else {
                    throw new SyntaxError(i, 'Line has to be of the type "#COMMENT", "INT COMMAND", or "EMPTY_LINE"')
                }
            } else {
                // Line type is a command line! Check syntax:
                if (hasEnded) {
                    throw new SyntaxError(i, 'Encountered command line "' + lineArr[i] + '" after the END_SEQUENCE command')
                }
                if (currentlineNum == 0 && line[1] != 'INITIALIZE_COMMAND') {
                    throw new SyntaxError(i, 'Expected first command to be INITIALIZE_COMMAND but got ' + lineArr[i])
                }
                if (parseInt(line[0]) != currentlineNum) {
                    throw new SyntaxError(i, 'Incorrect line numbering. Expected ' + currentlineNum + ' but got ' + line[0])
                } 
                obj.type = 'command';
                obj.command = line[1];
                obj.args = line.slice(2);
                try { validateArgs(obj) } catch (err) { throw new SyntaxError(i, err) }

                objArr.push(obj);
                currentlineNum++;
            }
        }
        if (!hasEnded) {
            throw new SyntaxError('end', 'Missing END_SEQUENCE command')
        }
    } catch (err) {
        throw Error('Error while parsing line ' + err.line + '.\n' + err.message)
    }
    return objArr

    function validateArgs(obj) {
        function checkTrim(obj) {
            for (let i = 0; i < obj.args.length; i += 5) {
                if (!IP.includes(obj.args[i])) {
                    throw 'Invalid TRIM command. Expected [' + IP + '] but got ' + obj.args[i]
                }
                if (!beams.includes(obj.args[i + 1])) {
                    throw 'Invalid TRIM command. Expected beam in [' + beams + '] but got ' + obj.args[i + 1]
                }
                if (!planes.includes(obj.args[i + 2])) {
                    throw 'Invalid TRIM command. Expected plane in [' + planes + '] but got ' + obj.args[i + 2]
                }
                if (!isFinite(obj.args[i + 3])) {
                    throw 'Invalid TRIM command. Amount has to be finite but got ' + obj.args[i + 3]
                }
                if (!units.includes(obj.args[i + 4])) {
                    throw 'Invalid TRIM command. Expected unit in [' + units + '] but got ' + obj.args[i + 4]
                }
            }
        }
        let commandHandler = {
            'INITIALIZE_TRIM': function (obj) {
                if (currentlineNum != 0) {
                    throw 'Invalid INITIALIZE_TRIM command. Must occur on line zero'
                }
                function getInnerBracket(str, type) {
                    let match = str.match(new RegExp('^' + type + '\\((.*)\\)$'));
                    if (!match) {
                        throw 'Invalid INITIALIZE_TRIM command. Argument "' + type + '(...)" missing'
                    }
                    match = match[1].split(',');
                    if (match.length > 2) {
                        throw 'Invalid INITIALIZE_TRIM command. "' + type + '(...)" can include at most 2 arguments but got ' + match
                    }
                    return match;
                }
                IP = getInnerBracket(obj.args[0], 'IP');
                beams = getInnerBracket(obj.args[1], 'BEAM');
                planes = getInnerBracket(obj.args[2], 'PLANE');
                planesContainer = planes;
                units = getInnerBracket(obj.args[3], 'UNITS');
                if (IP.length != 1 || !IP[0].match(/^(?:IP)[1258]$/)) {
                    throw 'Invalid INITIALIZE_TRIM command. Expected exactly one of [IP1,IP2,IP5,IP8] but got ' + IP
                }
                if (!beams.every(x => beamTypes.includes(x))) {
                    throw 'Invalid BEAM argument. Expected subset of ' + beamTypes + ' but got ' + beams
                }
                if (!planes.every(x => planeTypes.includes(x))) {
                    throw 'Invalid PLANE argument. Expected subset of ' + planeTypes + ' but got ' + planes
                }
                if (!units.every(x => unitTypes.includes(x))) {
                    throw 'Invalid UNITS argument. Expected subset of ' + unitTypes + ' but got ' + units
                }
                if (obj.args.length != 4) {
                    throw 'Invalid INITIALIZE_TRIM command. Too many arguments. Overflow: ' + obj.args.slice(4)
                }
            },
            'SECONDS_WAIT': function (obj) {
                if (obj.args.length != 1) {
                    throw 'Invalid SECONDS_WAIT command. Expected exactly one argument but got ' + obj.args
                }
                if (!isFinite(obj.args)) {
                    throw 'Invalid SECONDS_WAIT command. Argument must be finte but got ' + obj.args
                }
            },
            'RELATIVE_TRIM': function (obj) {
                checkTrim(obj)
            },
            'ABSOLUTE_TRIM': function (obj) {
                checkTrim(obj)
            },
            'START_FIT': function (obj) {
                if (obj.args.length == 2) {
                    if (!planes.includes(obj.args[0])) {
                        throw 'Invalid START_FIT command. Expected plane in ' + planes + ' but got ' + obj.ars[0]
                    }
                    if (!fitTypes.includes(obj.args[1])) {
                        throw 'Invalid START_FIT command. Expected fit type in ' + fitTypes + ' but got ' + obj.ars[1]
                    }
                    planes = [obj.args[0]];
                } else {
                    throw 'Invalid START_FIT command. Expected exactly two arguments "PLANE FIT_TYPE" but got ' + obj.args
                }
            },
            'END_FIT': function (obj) {
                if (obj.args.length != 0) {
                    throw 'Invalid END_FIT command. No arguments allowed but got ' + obj.args
                }
                planes = planesContainer;
            },
            'END_SEQUENCE': function (obj) {
                if (obj.args.length != 0) {
                    throw 'Invalid END_SEQUENCE command. No arguments allowed but got ' + obj.args
                }
                hasEnded = true;
            },
            'MESSAGE': function (obj) {
                // Do nothing
            }
        }
        if (!commandHandler[obj.command]) {
            throw 'Unknown command "' + obj.command + '" encountered'
        }
        else {
            commandHandler[obj.command](obj);
        }
    }
}

/* *
 * @param {string} command
 * @param {int} newLineNum
 * @param {Array} args
 */
function addLine(newLineNum, command, args) {
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
function removeLine(lineNum) {
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
function replaceLine(lineNum, command, args) {
    this.removeLine(lineNum);
    this.addLine(lineNum, command, args);
}