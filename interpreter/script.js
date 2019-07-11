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
        let lineArr = data.split(/\n/).map(x => x.trim());
        let objArr = [];
        let currentlineNum = 0;
        let hasEnded = false;
        let IP = [];
        let beams = [];
        let planes = [];
        let planesContainer = [];
        let units = [];
        let fitTypes = ['GAUSSIAN', 'GAUSSIAN_PLUS_CONSTANT'];

        try {
            if (!Array.isArray(lineArr)) {
                throw Error('_commandlinesToObjects takes an array! Got "' + typeof lineArr + '" with value: ' + JSON.stringify(lineArr))
            }
            for (let i = 0; i < lineArr.length; i++) {
                // Deconstruct string into arguments
                let line = lineArr[i].split(/\s+/);
                let obj = {};
                // Check line syntax
                if (!isInteger(line[0])) {
                    if (line[0] == '') {
                        obj.type = 'empty';
                    } else if (line[0].charAt(0) == '#') {
                        obj.type = 'comment';
                        obj.comment = line[0];
                    } else {
                        throw new SyntaxError(i, 'Line has to be of the type "#COMMENT", "INT COMMAND", or "EMPTY_LINE"')
                    }
                } else if (hasEnded){
                    throw new SyntaxError(i, 'Encountered command line "' + lineArr[i] + '" after END_SEQUENCE')
                } else if (parseInt(line[0]) != currentlineNum) {
                    throw new SyntaxError(i, 'Incorrect line numbering. Expected ' + currentlineNum + ' but got ' + parseInt(line[0]))
                } else { // Create object from command line
                    currentlineNum ++;
                    obj.type = 'command';
                    obj.command = line[1];
                    obj.args = line.slice(2);
                    try { validateArgs(obj) } catch (err) { throw new SyntaxError(i, err) }
                }
                objArr.push(obj);
            }
        } catch (err) {
            throw Error('Error while parsing line' + err.line + '.\n' + err.message)
        }
        return objArr

        function validateArgs(obj) {
            function checkTrim(obj) {
                for(let i=0; i<obj.args.length; i+=5){
                    if (!IP.includes(obj.args[i])){
                        throw 'Invalid TRIM command. Expected ' + IP + ' but got ' + obj.args[i]
                    }
                    if (!beams.includes(obj.args[i+1])){
                        throw 'Invalid TRIM command. Expected beam in' + beams + ' but got ' + obj.args[i+1]
                    }
                    if (!beams.includes(obj.args[i+2])){
                        throw 'Invalid TRIM command. Expected plane in' + planes + ' but got ' + obj.args[i+2]
                    }
                    if (!isFinite(obj.args[i+3])){
                        throw 'Invalid TRIM command. Amount has to be finite but got ' + obj.args[i+3]
                    }
                    if (!beams.includes(obj.args[i+4])){
                        throw 'Invalid TRIM command. Expected unit in' + units + ' but got ' + obj.args[i+4]
                    }
                }
            }            
            let commandHandler = {
                'INITIALIZE_TRIM': function (obj) {
                    if (currentlineNum != 0){
                        throw 'Invalid INITIALIZE_TRIM command. Must occur on line zero'
                    }
                    function getInnerBracket(str, type){
                        let match = str.match(new RegExp('^' + type + '\\((.*)\\)$'))[1].split(',');
                        if (!match){
                            throw 'Invalid INITIALIZE_TRIM command. Must include ' + type + '(...)'
                        }
                        if (match.length > 2){
                            throw 'Invalid INITIALIZE_TRIM command.' + type + ' can include at most 2 arguments'
                        }
                        return match;
                    }
                    IP = getInnerBracket(obj.args[0], 'IP');
                    beams = getInnerBracket(obj.args[1], 'BEAM');
                    planes = getInnerBracket(obj.args[2], 'PLANE');
                    units = getInnerBracket(obj.args[3], 'UNITS');
                    if (IP.length != 1){
                        throw 'Invalid INITIALIZE_TRIM command. Must include exactly one IP'
                    }
                    if (obj.args.length != 4) {
                        throw 'Invalid INITIALIZE_TRIM command. Too many arguments. Overflow: ' + obj.args.slice(4)
                    }
                },
                'SECONDS_WAIT': function (obj) {
                    if (obj.args.length != 1){
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
                    if (!planes.includes(obj.args[0])){
                        throw 'Invalid START_FIT command. Expected plane in ' + planes + ' but got ' + obj.ars[0]
                    }
                    if (!fitTypes.includes(obj.args[1])) {
                        throw 'Invalid START_FIT command. Expected fit type in ' + fitTypes + ' but got ' + obj.ars[1]
                    }
                    if (obj.args.length != 2) {
                        throw 'Invalid START_FIT command. Too many arguments. Overflow: ' + obj.args.slice(2)
                    }
                    planesContainer = planes;
                    planes = [obj.args[0]];
                },
                'END_FIT': function (obj) {
                    if (obj.args){
                        throw 'Invalid END_FIT command. No arguments allowed but got ' + obj.args
                    }
                    planes = planesContainer;
                },
                'END_SEQUENCE': function (obj) {
                    if (obj.args){
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
                commandHandler[obj.command].apply(obj);
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