class SyntaxError {
    constructor(line, message) {
        this.line = line;
        this.message = message;
    }
}
function isSubsetOf(arr1, arr2) {
    // returns true iff arr1 is a subset of arr2
    return new Boolean(arr1.every(x => arr2.includes(x)))
}
function genInitTrimArgs(objArr) {
    let argArr = [
        { 'type': 'IP', 'values': new Set([]) },
        { 'type': 'BEAM', 'values': new Set([]) },
        { 'type': 'PLANE', 'values': new Set([]) },
        { 'type': 'UNITS', 'values': new Set([]) },
    ];
    for (let obj of objArr) {
        if (obj.command.match(/(?:TRIM)$/)) {
            argArr[0].values.add(obj.args[0]);
            argArr[1].values.add(obj.args[1]);
            argArr[2].values.add(obj.args[2]);
            argArr[3].values.add(obj.args[4]);
        }
    }
    for (let type of argArr) {
        if (type.values.size < 1) {
            throw new Error('Missing ' + type.type + ' argument to generate INITIALIZE_TRIM command')
        }
    }
    let strArr = argArr.map(x => x.type + '(' + Array.from(x.values).join(',').trim() + ')');
    return strArr;
}
function addHeaders(objArr) {
    let res = objArr;
    res.unshift({
        'type': 'command',
        'command': 'INITIALIZE_TRIM',
        'args': genInitTrimArgs(objArr)
    });
    res.push({
        'type': 'command',
        'command': 'END_SEQUENCE',
        'args': []
    });
    return res;
}
function getInnerBracket(str, type) {
    let match = str.match(new RegExp('^' + type + '\\((.*)\\)$'));
    if (!match) {
        throw 'Invalid INITIALIZE_TRIM command. Expected "' + type + '(...)" but got' + str
    }
    match = match[1].split(',');
    return match;
}
function checkTrim(obj, state) {
    for (let i = 0; i < obj.args.length; i += 5) {
        if (!state.IPs.includes(obj.args[i])) {
            throw 'Invalid TRIM command. Expected ' + state.IPs + ' but got ' + obj.args[i]
        }
        if (!state.beams.includes(obj.args[i + 1])) {
            throw 'Invalid TRIM command. Expected beam in [' + state.beams + '] but got ' + obj.args[i + 1]
        }
        if (!state.planes.includes(obj.args[i + 2])) {
            throw 'Invalid TRIM command. Expected plane in [' + state.planes + '] but got ' + obj.args[i + 2]
        }
        if (!isFinite(obj.args[i + 3])) {
            throw 'Invalid TRIM command. Amount has to be finite but got ' + obj.args[i + 3]
        }
        if (!state.units.includes(obj.args[i + 4])) {
            throw 'Invalid TRIM command. Expected unit in [' + state.units + '] but got ' + obj.args[i + 4]
        }
    }
}
let commandHandler = {
    'INITIALIZE_TRIM': function (obj, state) {
        if (state.currentLineNum != 0) {
            throw 'Invalid INITIALIZE_TRIM command. Must occur on line zero'
        }
        let IPs = getInnerBracket(obj.args[0], 'IP');
        let beams = getInnerBracket(obj.args[1], 'BEAM');
        let planes = getInnerBracket(obj.args[2], 'PLANE');
        let units = getInnerBracket(obj.args[3], 'UNITS');

        if (IPs.length == 1 && isSubsetOf(IPs, state.IPs)) { state.IPs = IPs; }
        else { throw 'Invalid INITIALIZE_TRIM command. Expected exactly one of ' + state.IPs + ' but got ' + IPs }

        if (isSubsetOf(beams, state.beams)) { state.beams = beams; }
        else { throw 'Invalid BEAM argument. Expected subset of ' + state.beams + ' but got ' + beams }

        if (isSubsetOf(planes, state.planes)) {
            state.planes = planes;
            state.planesContainer = planes;
        }
        else { throw 'Invalid PLANE argument. Expected subset of ' + state.planes + ' but got ' + planes }

        if (isSubsetOf(units, state.units)) { state.units = units; }
        else { throw 'Invalid UNITS argument. Expected subset of ' + state.units + ' but got ' + units }

        if (obj.args.length > 4) {
            throw 'Invalid INITIALIZE_TRIM command. Too many arguments. Overflow: ' + obj.args.slice(4)
        }
    },
    'SECONDS_WAIT': function (obj, state) {
        if (obj.args.length != 1) {
            throw 'Invalid SECONDS_WAIT command. Expected exactly one argument but got ' + obj.args
        }
        if (!isFinite(obj.args)) {
            throw 'Invalid SECONDS_WAIT command. Argument must be finte but got ' + obj.args
        }
    },
    'RELATIVE_TRIM': function (obj, state) {
        checkTrim(obj, state)
    },
    'ABSOLUTE_TRIM': function (obj, state) {
        checkTrim(obj, state)
    },
    'START_FIT': function (obj, state) {
        if (state.isFitting) {
            throw 'Invalid START_FIT command. Previous fit command not teminated'
        }
        if (obj.args.length == 2) {
            if (!state.planes.includes(obj.args[0])) {
                throw 'Invalid START_FIT command. Expected plane in ' + state.planes + ' but got ' + obj.args[0]
            }
            if (!state.fitTypes.includes(obj.args[1])) {
                throw 'Invalid START_FIT command. Expected fit type in ' + state.fitTypes + ' but got ' + obj.args[1]
            }
            state.planes = [obj.args[0]];
        } else {
            throw 'Invalid START_FIT command. Expected exactly two arguments "PLANE FIT_TYPE" but got ' + obj.args
        }
        state.isFitting = true;
    },
    'END_FIT': function (obj, state) {
        if (!state.isFitting) {
            throw 'Invalid END_FIT command. Missing START_FIT command'
        }
        if (obj.args.length != 0) {
            throw 'Invalid END_FIT command. No arguments allowed but got ' + obj.args
        }
        state.planes = state.planesContainer;
        state.isFitting = false;
    },
    'END_SEQUENCE': function (obj, state) {
        if (obj.args.length != 0) {
            throw 'Invalid END_SEQUENCE command. No arguments allowed but got ' + obj.args
        }
        state.hasEnded = true;
    },
    'MESSAGE': function (obj, state) {
        // Do nothing
    }
}
function validateArgs(obj, state) {
    if (commandHandler[obj.command]) {
        commandHandler[obj.command](obj, state);
    }
    else {
        throw 'Unknown command "' + obj.command + '" encountered'
    }
}









/**
 * @param {Array} struct
 */
export function deparseVdM(struct) {
    let string = '';
    let currentLineNum = 0;
    for (let i = 0; i < struct.length; i++) {
        let obj = struct[i]
        let line = '';
        if (obj.type == 'command') {
            line += currentLineNum + ' ';
            line += obj.command + ' ';
            line += obj.args.join(' ');
            line = line.trim();
            currentLineNum++;
        } else if (obj.type == 'empty') {
            // Line stays empty
        } else if (obj.type == 'comment') {
            line += '# ' + obj.comment;
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
export function parseVdM(data, genHeaders = false) {
    let state = {
        // Allowed arguments
        'IPs': ['IP1', 'IP2', 'IP5', 'IP8'],
        'beams': ['BEAM1', 'BEAM2'],
        'planes': ['SEPARATION', 'CROSSING'],
        'units': ['SIGMA', 'MM'],
        'fitTypes': ['GAUSSIAN', 'GAUSSIAN_PLUS_CONSTANT'],
        // Variables used during parsing
        'planesContainer': ['SEPARATION', 'CROSSING'],
        'isFitting': false,
        'hasEnded': false,
        'currentLineNum': genHeaders ? 1 : 0,
    }

    let lineArr = data.split(/\n/).map(x => x.trim());
    // Array to be filled and then returned as the VdM structure
    let objArr = [];
    for (let i = 0; i < lineArr.length; i++) {
        // Object to be created and pushed to the structure
        let obj = {};
        // Deconstruct string into arguments
        let line = lineArr[i].split(/ +/);
        // Check line syntax
        // Line type is NOT a command line (not initialised with an integer)
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
            if (state.hasEnded) {
                throw new SyntaxError(i, 'Encountered command line "' + lineArr[i] + '" after the END_SEQUENCE command')
            }
            if (state.currentLineNum == 0 && line[1] != 'INITIALIZE_TRIM' && !genHeaders) {
                throw new SyntaxError(i, 'Expected first command to be INITIALIZE_TRIM but got ' + lineArr[i])
            }
            if (parseInt(line[0]) != state.currentLineNum) {
                throw new SyntaxError(i, 'Incorrect line numbering. Expected ' + state.currentLineNum + ' but got ' + line[0])
            }
            obj.type = 'command';
            obj.command = line[1];
            obj.args = line.slice(2);
            try { validateArgs(obj, state) } catch (err) { throw new SyntaxError(i, err) }

            state.currentLineNum++;
        }
        objArr.push(obj);
    }
    if (state.isFitting) {
        throw new SyntaxError(lineArr.length, 'Missing command END_FIT')
    }
    if (genHeaders) {
        objArr = addHeaders(objArr);
        state.currentLineNum = 0;
        try { validateArgs(objArr[0], state) } catch (err) { throw new SyntaxError(0, 'Encountered problem while generating INITIALIZE_TRIM command:\n' + err) }
    } else if (!state.hasEnded) {
        throw new SyntaxError(lineArr.length, 'Missing command END_SEQUENCE')
    }
    // Return the finished structure
    return objArr
}