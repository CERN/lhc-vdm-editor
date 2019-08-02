// NOTE: this needs to not have any imports, as we cannot use the ES6 import syntax here
const maxBeamPos = 100;
/**
 * @param {any[]} arr1
 * @param {any[]} arr2
 */
function isSubsetOf(arr1, arr2) {
    // returns true iff arr1 is a subset of arr2
    return arr1.every(x => arr2.includes(x))
}
function trimTime(dist) {
    const trimRate = 0.1; // mm/s
    return Math.abs(dist) * trimRate;
}
export function sigmaToMM(amount) {
    const betaStar = 20; // m
    const normEmittance = 3.5*1e-6; // m
    const gamma = 6500/0.938;
    const emittance = normEmittance/gamma;
    const factor = Math.sqrt(emittance*betaStar);
    return amount * factor;
}

export class MySyntaxError extends Error {
    /**
     * @param {number} line
     * @param {string} message
     */
    constructor(line, message) {
        super();
        this.line = line;
        this.message = message;
    }
}
/**
 * @param {object[]} objArr
 */
function genInitTrimArgs(objArr) {
    let argArr = [
        { 'type': 'IP', 'values': new Set([]) },
        { 'type': 'BEAM', 'values': new Set([]) },
        { 'type': 'PLANE', 'values': new Set([]) },
        { 'type': 'UNITS', 'values': new Set([]) },
    ];
    for (let obj of objArr) {
        if (obj.type == 'command' && obj.command.match(/(?:TRIM)$/)) {
            for (let i = 0; i < obj.args.length; i += 5) {
                argArr[0].values.add(obj.args[i + 0]);
                argArr[1].values.add(obj.args[i + 1]);
                argArr[2].values.add(obj.args[i + 2]);
                argArr[3].values.add(obj.args[i + 4]);
            }
        }
    }
    for (let type of argArr) {
        if (type.values.size < 1) {
            throw new Error('Missing ' + type.type + ' argument to generate INITIALIZE_TRIM command')
        }
    }
    return argArr.map(x => x.type + '(' + Array.from(x.values).join(',').trim() + ')');
}
/**
 * @param {object[]} objArr
 */
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
/**
 * @param {string} str
 * @param {string} type
 */
function getInnerBracket(str, type) {
    const match = str.match(new RegExp('^' + type + '\\((.*)\\)$'));
    if (!match) {
        throw 'Invalid INITIALIZE_TRIM command. Expected "' + type + '(...)" but got ' + str
    }
    return match[1].split(',');
}
/**
 * @param {{ args: string[]; }} obj
 * @param {{ IPs: string; beams: string; planes: string; units: string; }} state
 */
function checkTrim(obj, state) {
    if (obj.args.length == 0) { throw 'Invalid TRIM command. Command has to include arguments: IP BEAM PLANE AMOUNT UNIT' }
    for (let i = 0; i < obj.args.length; i += 5) {
        if (!state.IPs.includes(obj.args[i])) {
            throw 'Invalid TRIM command. Expected IP to be' + state.IPs + ' but got ' + obj.args[i]
        }
        if (!state.beams.includes(obj.args[i + 1])) {
            throw 'Invalid TRIM command. Expected beam in [' + state.beams + '] but got ' + obj.args[i + 1]
        }
        if (!state.planes.includes(obj.args[i + 2])) {
            throw 'Invalid TRIM command. Expected plane in [' + state.planes + '] but got ' + obj.args[i + 2]
        }
        if (!isFinite(Number(obj.args[i + 3]))) {
            throw 'Invalid TRIM command. Amount has to be finite but got ' + obj.args[i + 3]
        }
        if (!state.units.includes(obj.args[i + 4])) {
            throw 'Invalid TRIM command. Expected unit in [' + state.units + '] but got ' + obj.args[i + 4]
        }
    }
}
let commandHandler = {
    'INITIALIZE_TRIM':
        /**
         * @param {{ args: any[]; }} obj
         * @param {{ currentLineNum: number; IPs: string[]; beams: string[]; planes: string[]; planesContainer: string[]; units: string[]; }} state
         */
        function (obj, state) {
            if (state.currentLineNum != 0) {
                throw 'Invalid INITIALIZE_TRIM command. Must occur on line zero'
            }
            if (obj.args.length != 4) {
                throw 'Invalid INITIALIZE_TRIM command. Must have exactly four arguments: IP(...) BEAM(...) PLANE(...) UNITS(...), but got ' + obj.args
            }
            const IPs = getInnerBracket(obj.args[0], 'IP');
            const beams = getInnerBracket(obj.args[1], 'BEAM');
            const planes = getInnerBracket(obj.args[2], 'PLANE');
            const units = getInnerBracket(obj.args[3], 'UNITS');

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
        },
    'SECONDS_WAIT':
        /**
         * @param {{ args: string[]; }} obj
         * @param {any} state
         */
        function (obj, state) {
            if (obj.args.length != 1) {
                throw 'Invalid SECONDS_WAIT command. Expected exactly one argument but got ' + obj.args
            }
            if (isFinite(Number(obj.args[0]))) {
                state.sequenceTime += Number(obj.args[0]);
                state.realTime += Number(obj.args[0]);
            } else {
                throw 'Invalid SECONDS_WAIT command. Argument must be a finte number but got ' + obj.args
            }
        },
    'RELATIVE_TRIM':
        /**
         * @param {any} obj
         * @param {any} state
         */
        function (obj, state) {
            // Check syntax
            checkTrim(obj, state)
            // Update state simulation
            for (let i = 0; i < obj.args.length; i += 5) {
                try {
                    const amount = obj.args[i + 4] == 'MM' ? Number(obj.args[i + 3]) : sigmaToMM(Number(obj.args[i + 3]));
                    state.pos[obj.args[i + 1]][obj.args[i + 2]] += amount;
                    state.realTime += trimTime(amount);
                    const pos = state.pos[obj.args[i + 1]][obj.args[i + 2]];
                    if (Math.abs(pos) > maxBeamPos) {
                        throw 'Beam position: ' + pos + 'mm exceeds the maximally allowed distance to zero of ' + maxBeamPos + 'mm'
                    }
                }
                catch (err) {
                    throw err
                }
            }
        },
    'ABSOLUTE_TRIM':
        /**
         * @param {any} obj
         * @param {any} state
         */
        function (obj, state) {
            // Check syntax
            checkTrim(obj, state)
            // Update state simulation
            for (let i = 0; i < obj.args.length; i += 5) {
                try {
                    const pos = obj.args[i + 4] == 'MM' ? Number(obj.args[i + 3]) : sigmaToMM(Number(obj.args[i + 3]));
                    const dist = state.pos[obj.args[i + 1]][obj.args[i + 2]] - pos;
                    state.pos[obj.args[i + 1]][obj.args[i + 2]] = pos;
                    state.realTime += trimTime(dist);
                    if (Math.abs(pos) > maxBeamPos) {
                        throw 'Beam position ' + pos + 'mm exceeds the maximally allowed distance to zero of ' + maxBeamPos + 'mm'
                    }
                } catch (err) {
                    throw (err)
                }
            }
        },
    'START_FIT':
        /**
         * @param {{ args: string | any[]; }} obj
         * @param {{ isFitting: boolean; planes: string | any[]; fitTypes: string; }} state
         */
        function (obj, state) {
            try {
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
            } finally { state.isFitting = true }
        },
    'END_FIT':
        /**
         * @param {{ args: string; }} obj
         * @param {{ isFitting: boolean; planes: any; planesContainer: any; }} state
         */
        function (obj, state) {
            try {
                if (!state.isFitting) {
                    throw 'Invalid END_FIT command. Missing START_FIT command'
                }
                if (obj.args.length != 0) {
                    throw 'Invalid END_FIT command. No arguments allowed but got ' + obj.args
                }
            } finally {
                state.planes = state.planesContainer;
                state.isFitting = false;
            }
        },
    'END_SEQUENCE':
        /**
         * @param {{ args: string; }} obj
         * @param {{ hasEnded: boolean; }} state
         */
        function (obj, state) {
            state.hasEnded = true;
            if (obj.args.length != 0) {
                throw 'Invalid END_SEQUENCE command. No arguments allowed but got ' + obj.args
            }
        },
    'MESSAGE':
        /**
         * @param {any} obj
         * @param {any} state
         */
        function (obj, state) {
            // Do nothing
        }
}
/**
 * @param {{ command?: any; }} obj
 * @param {{ IPs: string[]; beams: string[]; planes: string[]; units: string[]; fitTypes: string[]; planesContainer: string[]; isFitting: boolean; hasEnded: boolean; currentLineNum: number; }} state
 */
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
        const obj = struct[i]
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
            throw new MySyntaxError(i, 'Expected object of type command, empty, or comment but got ' + obj.type)
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
        // Variables used when simulating
        'realTime': 0,
        'sequenceTime': 0,
        'pos': {
            'BEAM1': {
                'SEPARATION': 0,
                'CROSSING': 0,
            },
            'BEAM2': {
                'SEPARATION': 0,
                'CROSSING': 0,
            }
        }
    }

    // Split data into array containing each line
    const lineArr = data.split(/\n/).map(x => x.trim());
    // Array to be filled and then returned as the VdM structure + array to contain possible line errors
    let objArr = [];
    let errArr = [];
    for (let i = 0; i < lineArr.length; i++) {
        // Object to be created and pushed to the structure
        let obj = {};
        try {
            // Deconstruct string into arguments by spaces
            const line = lineArr[i].split(/ +/);
            // Check syntax line by line
            if (!line[0].match(/^(?:[1-9][0-9]*|0)$/)) {
                // Line type is NOT a command line (not initialised with integer)
                if (line[0] == '') {
                    obj.type = 'empty';
                } else if (line[0].charAt(0) == '#') {
                    obj.type = 'comment';
                    obj.comment = lineArr[i].slice(1).trim();
                } else {
                    throw new MySyntaxError(i, 'Line has to be of the type "#COMMENT", "INT COMMAND", or "EMPTY_LINE"')
                }
            } else {
                // Line type is a command line (initialised with integer)! Check syntax:
                try {
                    /* if (lineArr[i].match(/ {2,}/)) {
                        throw new MySyntaxError(i, 'Sevaral spaces encountered after ' + lineArr[i].match(/\b\w+\b(?= {2,})/) + '. Use only single ')
                    } */
                    if (state.hasEnded) {
                        throw new MySyntaxError(i, 'Encountered command line "' + lineArr[i] + '" after the END_SEQUENCE command')
                    }
                    if (line.length < 2) {
                        throw new MySyntaxError(i, 'Lines initiated with an integer cannot be empty. Missing a valid command')
                    }
                    if (state.currentLineNum == 0 && line[1] != 'INITIALIZE_TRIM' && !genHeaders) {
                        throw new MySyntaxError(i, 'Expected first command to be INITIALIZE_TRIM but got ' + lineArr[i])
                    }

                    // Add object values and check validity of arguments
                    obj.type = 'command';
                    obj.command = line[1];
                    obj.args = line.slice(2);
                    try { validateArgs(obj, state) }
                    catch (err) {
                        if(typeof err == "string") throw new MySyntaxError(i, err)
                        else throw err;
                    }
                    finally {
                        obj.realTime = state.realTime;
                        obj.sequenceTime = state.sequenceTime;
                        obj.pos = state.pos;
                    }
                    // Check line numbering.
                    // Must be executed last for command terminations to be detected beforehand
                    if (parseInt(line[0]) != state.currentLineNum) {
                        throw new MySyntaxError(i, 'Incorrect line numbering. Expected ' + state.currentLineNum + ' but got ' + line[0])
                    }
                } finally { state.currentLineNum++; }
            }
        } catch (err) {
            errArr.push(err)
        } finally {
            objArr.push(obj);
        }
    }

    // Command termination tests + header generation
    if (state.isFitting) {
        errArr.push(new MySyntaxError(objArr.length, 'Missing command END_FIT'))
    }
    if (genHeaders) {
        if (state.hasEnded) {
            const index = objArr.findIndex(x => x.command == 'END_SEQUENCE');
            errArr.push(new MySyntaxError(index, 'Command END_SEQUENCE not allowed. It is being generated!'))
        }
        if (errArr.length == 0) {
            try {
                objArr = addHeaders(objArr);
                state.currentLineNum = 0;
                validateArgs(objArr[0], state);
            } catch (err) {
                errArr.push(new MySyntaxError(0, 'Encountered problem while generating INITIALIZE_TRIM command:\n' + err))
            }
        }
    } else if (!state.hasEnded) {
        errArr.push(new MySyntaxError(objArr.length, 'Missing command END_SEQUENCE'))
    }

    // Return finished structure or throw error array
    if (errArr.length == 0) { return objArr }
    else throw errArr
}