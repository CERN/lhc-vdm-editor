// NOTE: this needs to not have any imports, as we cannot use the ES6 import syntax here


/**
 * @param {any[]} arr1
 * @param {any[]} arr2
 */
function isSubsetOf(arr1, arr2) {
    // returns true iff arr1 is a subset of arr2
    return arr1.every(x => arr2.includes(x))
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
export class VdMSyntaxError extends Error {
    /**
     * @param {MySyntaxError[]} errArr
     * @param {Object[]} structure
     */
    constructor(errArr, structure){
        super()
        this.errors = errArr;
        this.dataStructure = structure;
    }
}

export function parseVdM(data, genHeaders = false){
    return (new VdM()).parseVdM(data, genHeaders)
    //return (new VdM(param)).parseVdM(data, genHeaders)
}
export function deparseVdM(structure){
    return (new VdM()).deparseVdM(structure)
}

const init_beam_param = { // IP1
    "energy": 6500,
    "particle_mass": 0.938,
    "emittance": 3.5e-6,
    "beta_star": {
        "IP1": 20,
        "IP2": 21,
        "IP5": 20,
        "IP8": 23
    },
    "crossing_angle": {
        "IP1": 0,
        "IP2": 200e-6,
        "IP5": 0,
        "IP8": 200e-6
    },
    "scan_limits": {
        "IP1": 6,
        "IP2": 4,
        "IP5": 6,
        "IP8": 4
    },
    "trim_rate": 0.1,
    "intensity": 1e11,
    "bunches": 50
}
const lhc_constants = {
    f_rev: 11245,
    crossing_plane: {
        'IP1': "V",
        'IP2': "V",
        'IP5': "H",
        'IP8': "H"
    },
}

class VdM {
    constructor(param = init_beam_param) {
        this.sigma = Math.sqrt((param.emittance / (param.energy / param.particle_mass)) * param.beta_star.IP1); // mm
        this.trim_rate = param.trim_rate; // mm/s
        this.scan_limit = param.scan_limits.IP1 * this.sigma; // mm
        this.state = {};

        this.commandHandler = {
            'INITIALIZE_TRIM':
                /**
                 * @param {{ args: any[]; }} obj
                 */
                (obj) => {
                    if (this.state.currentLineNum != 0) {
                        throw 'Invalid INITIALIZE_TRIM command. Must occur on line zero'
                    }
                    if (obj.args.length != 4) {
                        throw 'Invalid INITIALIZE_TRIM command. Must have exactly four arguments: IP(...) BEAM(...) PLANE(...) UNITS(...), but got ' + obj.args
                    }
                    const IPs = this.getInnerBracket(obj.args[0], 'IP');
                    const beams = this.getInnerBracket(obj.args[1], 'BEAM');
                    const planes = this.getInnerBracket(obj.args[2], 'PLANE');
                    const units = this.getInnerBracket(obj.args[3], 'UNITS');

                    if (IPs.length == 1 && isSubsetOf(IPs, this.state.IPs)) { this.state.IPs = IPs; }
                    else { throw 'Invalid INITIALIZE_TRIM command. Expected exactly one of ' + this.state.IPs + ' but got ' + IPs }

                    if (isSubsetOf(beams, this.state.beams)) { this.state.beams = beams; }
                    else { throw 'Invalid BEAM argument. Expected subset of ' + this.state.beams + ' but got ' + beams }

                    if (isSubsetOf(planes, this.state.planes)) {
                        this.state.planes = planes;
                        this.state.planesContainer = planes;
                    }
                    else { throw 'Invalid PLANE argument. Expected subset of ' + this.state.planes + ' but got ' + planes }

                    if (isSubsetOf(units, this.state.units)) { this.state.units = units; }
                    else { throw 'Invalid UNITS argument. Expected subset of ' + this.state.units + ' but got ' + units }
                },
            'SECONDS_WAIT':
                /**
                 * @param {{ args: string[]; }} obj
                 */
                (obj) => {
                    if (obj.args.length != 1) {
                        throw 'Invalid SECONDS_WAIT command. Expected exactly one argument but got ' + obj.args
                    }
                    if (isFinite(Number(obj.args[0])) && Number(obj.args[0]) >= 0) {
                        this.state.sequenceTime += Number(obj.args[0]);
                        this.state.realTime += Number(obj.args[0]);
                    } else {
                        throw 'Invalid SECONDS_WAIT command. Argument must be a finite positive number but got ' + obj.args
                    }
                },
            'RELATIVE_TRIM':
                /**
                 * @param {any} obj
                 */
                (obj) => {
                    // Check syntax
                    this.checkTrim(obj)
                    // Update this.state simulation
                    for (let i = 0; i < obj.args.length; i += 5) {
                        try {
                            const amount = obj.args[i + 4] == 'MM' ? Number(obj.args[i + 3]) : Number(obj.args[i + 3]) * this.sigma;
                            this.state.pos[obj.args[i + 1]][obj.args[i + 2]] += amount;
                            this.state.realTime += Math.abs(amount) * this.trim_rate;
                            const pos = this.state.pos[obj.args[i + 1]][obj.args[i + 2]];
                            if (Math.abs(pos) > this.scan_limit) {
                                throw 'Beam position: ' + pos + 'mm exceeds the maximally allowed distance from zero of ' + this.scan_limit + 'mm'
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
                 */
                (obj) => {
                    // Check syntax
                    this.checkTrim(obj)
                    // Update this.state simulation
                    for (let i = 0; i < obj.args.length; i += 5) {
                        try {
                            const pos = obj.args[i + 4] == 'MM' ? Number(obj.args[i + 3]) : Number(obj.args[i + 3]) * this.sigma;
                            const dist = Math.abs(this.state.pos[obj.args[i + 1]][obj.args[i + 2]] - pos);
                            this.state.pos[obj.args[i + 1]][obj.args[i + 2]] = pos;
                            this.state.realTime += dist * this.trim_rate;
                            if (Math.abs(pos) > this.scan_limit) {
                                throw 'Beam position ' + pos + 'mm exceeds the maximally allowed distance to zero of ' + this.scan_limit + 'mm'
                            }
                        } catch (err) {
                            throw (err)
                        }
                    }
                },
            'START_FIT':
                /**
                 * @param {{ args: string | any[]; }} obj
                 */
                (obj) => {
                    try {
                        if (this.state.isFitting) {
                            throw 'Invalid START_FIT command. Previous fit command not teminated'
                        }
                        if (obj.args.length == 2) {
                            if (!this.state.planes.includes(obj.args[0])) {
                                throw 'Invalid START_FIT command. Expected plane in ' + this.state.planes + ' but got ' + obj.args[0]
                            }
                            if (!this.state.fitTypes.includes(obj.args[1])) {
                                throw 'Invalid START_FIT command. Expected fit type in ' + this.state.fitTypes + ' but got ' + obj.args[1]
                            }
                            this.state.planes = [obj.args[0]];
                        } else {
                            throw 'Invalid START_FIT command. Expected exactly two arguments "PLANE FIT_TYPE" but got ' + obj.args
                        }
                    } finally { this.state.isFitting = true }
                },
            'END_FIT':
                /**
                 * @param {{ args: string; }} obj
                 */
                (obj) => {
                    try {
                        if (!this.state.isFitting) {
                            throw 'Invalid END_FIT command. Missing START_FIT command'
                        }
                        if (obj.args.length != 0) {
                            throw 'Invalid END_FIT command. No arguments allowed but got ' + obj.args
                        }
                    } finally {
                        this.state.planes = this.state.planesContainer;
                        this.state.isFitting = false;
                    }
                },
            'END_SEQUENCE':
                /**
                 * @param {{ args: string; }} obj
                 */
                (obj) => {
                    this.state.hasEnded = true;
                    if (obj.args.length != 0) {
                        throw 'Invalid END_SEQUENCE command. No arguments allowed but got ' + obj.args
                    }
                },
            'MESSAGE':
                /**
                 * @param {any} obj
                 */
                (obj) => {
                    // Do nothing
                }
        }
    }
    /**
     * @param {object[]} objArr
     */
    genInitTrimArgs(objArr) {
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
    addHeaders(objArr) {
        let res = objArr;
        res.unshift({
            'type': 'command',
            'command': 'INITIALIZE_TRIM',
            'args': this.genInitTrimArgs(objArr),
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
        });
        res.push({
            'type': 'command',
            'command': 'END_SEQUENCE',
            'args': [],
            'realTime': objArr[objArr.length-1].realTime,
            'sequenceTime': objArr[objArr.length-1].sequenceTime,
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
        });
        return res;
    }
    /**
     * @param {string} str
     * @param {string} type
     */
    getInnerBracket(str, type) {
        const match = str.match(new RegExp('^' + type + '\\((.*)\\)$'));
        if (!match) {
            throw 'Invalid INITIALIZE_TRIM command. Expected "' + type + '(...)" but got ' + str
        }
        return match[1].split(',');
    }
    /**
     * @param {{ args: string[]; }} obj
     */
    checkTrim(obj) {
        if (obj.args.length == 0) { throw 'Invalid TRIM command. Command has to include arguments: IP BEAM PLANE AMOUNT UNIT' }
        for (let i = 0; i < obj.args.length; i += 5) {
            if (!this.state.IPs.includes(obj.args[i])) {
                throw 'Invalid TRIM command. Expected IP to be' + this.state.IPs + ' but got ' + obj.args[i]
            }
            if (!this.state.beams.includes(obj.args[i + 1])) {
                throw 'Invalid TRIM command. Expected beam in [' + this.state.beams + '] but got ' + obj.args[i + 1]
            }
            if (!this.state.planes.includes(obj.args[i + 2])) {
                throw 'Invalid TRIM command. Expected plane in [' + this.state.planes + '] but got ' + obj.args[i + 2]
            }
            if (!isFinite(Number(obj.args[i + 3]))) {
                throw 'Invalid TRIM command. Amount has to be finite but got ' + obj.args[i + 3]
            }
            if (!this.state.units.includes(obj.args[i + 4])) {
                throw 'Invalid TRIM command. Expected unit in [' + this.state.units + '] but got ' + obj.args[i + 4]
            }
        }
    }

    /**
     * @param {{ command?: any; }} obj
     */
    validateArgs(obj) {
        if (this.commandHandler[obj.command]) {
            this.commandHandler[obj.command](obj);
        }
        else {
            throw 'Unknown command "' + obj.command + '" encountered'
        }
    }

    /**
     * @param {Array} struct
     */
    deparseVdM(struct) {
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
        return string.trim() + '\n';
    }
    /**
     * @param {string} data
     * @param {boolean} genHeaders
     */
    parseVdM(data, genHeaders = false) {
        this.state = {
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
                        if (this.state.hasEnded) {
                            throw new MySyntaxError(i, 'Encountered command line "' + lineArr[i] + '" after the END_SEQUENCE command')
                        }
                        if (line.length < 2) {
                            throw new MySyntaxError(i, 'Lines initiated with an integer cannot be empty. Missing a valid command')
                        }
                        if (this.state.currentLineNum == 0 && line[1] != 'INITIALIZE_TRIM' && !genHeaders) {
                            throw new MySyntaxError(i, 'Expected first command to be INITIALIZE_TRIM but got ' + lineArr[i])
                        }

                        // Add object values and check validity of arguments
                        obj.type = 'command';
                        obj.command = line[1];
                        obj.args = line.slice(2);
                        try { this.validateArgs(obj) }
                        catch (err) {
                            if (typeof err == "string") throw new MySyntaxError(i, err)
                            else throw err;
                        }
                        finally {
                            obj.realTime = this.state.realTime;
                            obj.sequenceTime = this.state.sequenceTime;
                            obj.pos = JSON.parse(JSON.stringify(this.state.pos));
                        }
                        // Check line numbering.
                        // Must be executed last for command terminations to be detected beforehand
                        if (parseInt(line[0]) != this.state.currentLineNum) {
                            throw new MySyntaxError(i, 'Incorrect line numbering. Expected ' + this.state.currentLineNum + ' but got ' + line[0])
                        }
                    } finally { this.state.currentLineNum++; }
                }
            } catch (err) {
                if(err instanceof MySyntaxError) errArr.push(err)
                else throw err
            } finally {
                objArr.push(obj);
            }
        }

        // Command termination tests + header generation
        if (this.state.isFitting) {
            errArr.push(new MySyntaxError(objArr.length, 'Missing command END_FIT'))
        }
        if (genHeaders) {
            if (this.state.hasEnded) {
                const index = objArr.findIndex(x => x.command == 'END_SEQUENCE');
                errArr.push(new MySyntaxError(index, 'Command END_SEQUENCE not allowed. It is being generated!'))
            }
            if (errArr.length == 0) {
                try {
                    objArr = this.addHeaders(objArr);
                    this.state.currentLineNum = 0;
                    this.validateArgs(objArr[0]);
                } catch (err) {
                    errArr.push(new MySyntaxError(0, 'Encountered problem while generating INITIALIZE_TRIM command:\n' + err))
                }
            }
        } else if (!this.state.hasEnded) {
            errArr.push(new MySyntaxError(objArr.length, 'Missing command END_SEQUENCE'))
        }

        // Return finished structure or throw error array
        if (errArr.length == 0) { return objArr }
        else throw new VdMSyntaxError(errArr, objArr)
    }
}