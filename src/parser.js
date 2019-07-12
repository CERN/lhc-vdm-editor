class SyntaxError {
    constructor(line, message) {
        this.line = line;
        this.message = message;
    }
}

/* try {

} catch (err) {
    throw Error('Error while parsing line ' + err.line + '.\n' + err.message)
} */

/**
 * @param {Array} struct
 */
export function deparseVdM(struct) {
    let string = '';
    for (let i = 0; i < struct.length; i++) {
        let obj = struct[i]
        let line = '';
        if (obj.type == 'command') {
            line += obj.index + ' ';
            line += obj.command + ' ';
            line += obj.args.join(' ');
            line = line.trim();
        } else if (obj.type == 'empty') {
            // Do nothing
        } else if (obj.type == 'comment') {
            line += obj.comment;
        } else {
            throw new SyntaxError(i, 'Expected object of type command, empty, or comment but got ' + obj.type)
        }
        line += '\n';
        string += line;
    }
    return string.trim();
}


/**
 * @param {string} data
 * @param {boolean} genHeaders
 */
export function parseVdM(data, genHeaders) {
    // Array to be filled and then returned as the VdM structure
    let objArr = [];
    // Alowed arguments
    let IPs = ['IP1', 'IP2', 'IP5', 'IP8'];
    let fitTypes = ['GAUSSIAN', 'GAUSSIAN_PLUS_CONSTANT'];
    let beams = ['BEAM1', 'BEAM2'];
    let planes = ['SEPARATION', 'CROSSING'];
    let units = ['SIGMA', 'MM'];
    // Variables used during parseing
    let lineArr = data.split(/\n/).map(x => x.trim());
    let planesContainer = [];
    let isFitting = false;
    let hasEnded = false;
    // Parse

    function main() {
        for (let i = 0; i < lineArr.length; i++) {
            // Object to be pushed to the structure
            let obj = {};
            // Deconstruct string into arguments
            let line = lineArr[i].split(/ +/);
            let currentlineNum = 0;
            // Check line syntax
            // Line type is NOT a command line (initialised with an integer)
            if (!line[0].match(/^(?:[1-9][0-9]*|0)$/)) {
                if (line[0] == '') {
                    obj.type = 'empty';
                } else if (line[0].charAt(0) == '#') {
                    obj.type = 'comment';
                    obj.comment = lineArr[i].trim();
                } else {
                    throw new SyntaxError(i, 'Line has to be of the type "#COMMENT", "INT COMMAND", or "EMPTY_LINE"')
                }
            } else {
                // Line type is a command line! Check syntax:
                if (hasEnded) {
                    throw new SyntaxError(i, 'Encountered command line "' + lineArr[i] + '" after the END_SEQUENCE command')
                }
                if (currentlineNum == 0 && line[1] != 'INITIALIZE_TRIM' && !genHeaders) {
                    throw new SyntaxError(i, 'Expected first command to be INITIALIZE_TRIM but got ' + lineArr[i])
                }
                if (parseInt(line[0]) != currentlineNum) {
                    throw new SyntaxError(i, 'Incorrect line numbering. Expected ' + currentlineNum + ' but got ' + line[0])
                }
                obj.type = 'command';
                obj.index = currentlineNum;
                obj.command = line[1];
                obj.args = line.slice(2);
                try { validateArgs(obj) } catch (err) { throw new SyntaxError(i, err) }

                currentlineNum++;
            }
            objArr.push(obj);
        }
        if (isFitting) {
            throw new SyntaxError(lineArr.length, 'Missing END_FIT command')
        }
        if (genHeaders) {
            let usedIPs = new Set([]);
            let usedBeams = new Set([]);
            let usedPlanes = new Set([]);
            let usedUnits = new Set([]);
            for (let obj of objArr) {
                if (obj.command.match(/(?:TRIM)$/)){
                    usedIPs.add(obj.arg[0]);
                    usedBeams.add(obj.arg[1]);
                    usedPlanes.add(obj.arg[2]);
                    usedUnits.add(obj.arg[4]);
                }
            }
            objArr = [{
                'type': 'command',
                'command': 'INITIALIZE_TRIM',
                'args': '' //----------------------------------------------------get the sets into strings------------------------------------------------
            }].concat(objArr)
            objArr.push({
                'type': 'command',
                'command': 'END_SEQUENCE',
                'args': ''
            })
        } else if (!hasEnded) {
            throw new SyntaxError(lineArr.length, 'Missing END_SEQUENCE command')
        }
        // Return the finished structure
        return objArr
    }
    function isSubsetOf(arr1, arr2) {
        return new Boolean(arr1.every(x => arr2.includes(x)))
    }
    function checkTrim(obj) {
        for (let i = 0; i < obj.args.length; i += 5) {
            if (!IPs.includes(obj.args[i])) {
                throw 'Invalid TRIM command. Expected ' + IPs + ' but got ' + obj.args[i]
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
            if (obj.index != 0) {
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

            let givenIP = getInnerBracket(obj.args[0], 'IP');
            let givenBeams = getInnerBracket(obj.args[1], 'BEAM');
            let givenPlanes = getInnerBracket(obj.args[2], 'PLANE');
            let givenUnits = getInnerBracket(obj.args[3], 'UNITS');

            if (givenIP.length == 1 && isSubsetOf(givenIP, IPs)) { IPs = givenIP; }
            else { throw 'Invalid INITIALIZE_TRIM command. Expected exactly one of ' + IPs + ' but got ' + givenIP }

            if (isSubsetOf(givenBeams, beams)) { beams = givenBeams; }
            else { throw 'Invalid BEAM argument. Expected subset of ' + beams + ' but got ' + givenBeams }

            if (isSubsetOf(givenPlanes, planes)) {
                planes = givenPlanes;
                planesContainer = givenPlanes;
            }
            else { throw 'Invalid PLANE argument. Expected subset of ' + planes + ' but got ' + givenPlanes }

            if (isSubsetOf(givenUnits, units)) { units = givenUnits; }
            else { throw 'Invalid UNITS argument. Expected subset of ' + units + ' but got ' + givenUnits }

            if (obj.args.length > 4) {
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
                    throw 'Invalid START_FIT command. Expected plane in ' + planes + ' but got ' + obj.args[0]
                }
                if (!fitTypes.includes(obj.args[1])) {
                    throw 'Invalid START_FIT command. Expected fit type in ' + fitTypes + ' but got ' + obj.args[1]
                }
                planes = [obj.args[0]];
            } else {
                throw 'Invalid START_FIT command. Expected exactly two arguments "PLANE FIT_TYPE" but got ' + obj.args
            }
            isFitting = true;
        },
        'END_FIT': function (obj) {
            if (obj.args.length != 0) {
                throw 'Invalid END_FIT command. No arguments allowed but got ' + obj.args
            }
            planes = planesContainer;
            isFitting = false;
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
    function validateArgs(obj) {
        if (commandHandler[obj.command]) {
            commandHandler[obj.command](obj);
        }
        else {
            throw 'Unknown command "' + obj.command + '" encountered'
        }
    }

    // Run main
    main();
}

/**
 * @param {string} command
 * @param {number} newLineNum
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
 * @param {number} lineNum
 */
function removeLine(lineNum) {
    let start = this.lines.slice(0, lineNum);
    let end = this.lines.slice(lineNum + 1);
    this.lines = start.concat(end);
    this._simulateBeamPath(this.lines);
}
/**
 * @param {string} command
 * @param {number} lineNum
 * @param {Array} args
 */
function replaceLine(lineNum, command, args) {
    this.removeLine(lineNum);
    this.addLine(lineNum, command, args);
}