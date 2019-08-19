function linspace(start, end, num, includeEnd = true) {
    if (!Number.isInteger(num) || num < 1) throw new Error('Number has to be an integer grater than 0');

    const dist = (end - start) / (includeEnd ? num - 1 : num);
    let result = new Array(num);

    result[0] = start;
    for (let i = 1; i < num - 1; i++) {
        result[i] = result[i - 1] + dist
    }
    if (includeEnd) result[num - 1] = end;

    return result
}
export class ArgError extends Error {
    constructor(message, where = undefined) {
        super()
        this.message = message;
        this.where = where;
    }
}


export default class Generator {
    /**
     * @param {string} ip
     */
    constructor(ip) {
        this.ip = ip;

        this.functions = {
            linear: (startPos, endPos, runTime) => (t) => startPos + t * (endPos - startPos) / runTime,
            periodic: (period, amplitude) => (t) => (t % period < period / 2) ? amplitude : 0,
            step: function (startTime, endTime) {
                return (t) => (t >= startTime && t <= endTime) ? 1 : 0
            },
            // These are in fact redundant since numbers are taken to be constant functions but are included for completeness
            zero: (t) => 0,
            constant: (value) => (t) => value,
        };

        this.functionHandler = {
            linear: (argArr, waitTime, stepNum) => {
                if (argArr.length != 2) throw new ArgError('Linear function takes two arguments: linear(startPos,endPos)');
                return this.functions.linear(...argArr, waitTime * stepNum);
            },
            periodic: (argArr, waitTime, stepNum) => {
                if (argArr.length != 2) throw new ArgError('Periodic function takes one argument: periodic(period)');
                return this.functions.periodic(...argArr);
            }
        }


        /* These are all examples of how to efficiently use the generator.
        Functions as well as hardcoded posArrays can easily be added.

        let funcArr
        let func

        funcArr = [this.functions.linear(-5, 5, 100), this.functions.linear(5, -5, 100)]; // no crossing plane functions supplied still works
        this.template1 = this.generateFromFunction(funcArr, 50, 100);

        funcArr = Array(4);
        func = this.prodFunc(this.functions.periodic(6), this.functions.step(40, 60)); // periodic function on the interval [40, 60]
        funcArr[0] = this.sumFunc(-1, func, this.functions.constant(1));
        funcArr[1] = 1;
        this.template2 = this.generateFromFunction(funcArr, 50, 100);

        let arr1 = linspace(3, -3, 5).map(x => Array(3).fill(x)).flat();
        arr1.unshift(0);
        arr1.push(0);
        let arr2 = [0, 4, 3, 1.5, 3, 1.5, 0, 1.5];
        arr2 = arr2.concat([0]).concat(arr2.map(x => -x).reverse());
        this.template3 = this.generateFromArray([arr1, arr2], 30);

        arr1 = linspace(-5, 5, 50);
        arr2 = arr1.slice().reverse();
        this.template4 = this.generateFromArray([, , arr1, arr2], 10);
        */
    }

    sumFunc(...funcs) {
        return (t) => funcs.map(func => {
            if (typeof func == 'number') return func
            else return func(t)
        }).reduce((acc, cur) => acc + cur, 0)
    }
    prodFunc(...funcs) {
        return (t) => funcs.map(func => {
            if (typeof func == 'number') return func
            else return func(t)
        }).reduce((acc, cur) => acc * cur, 1)
    }
    delayFunc(func, startTime) {
        return (t) => (t >= startTime) ? func(t - startTime) : 0
    }

    getFunctionFromString(string, waitTime, stepNum) {
        string = string.replace(' ', '');

        /* if (string.includes('*')) {
            let arr1 = string.match(/(((?=\+)|-)?(\w+)\(([^)]+)\))\*(((?=\+)|-)?\d+)/g);
            let arr2 = string.match(/(((?=\+)|-)?\d+)\*(((?=\+)|-)?(\w+)\(([^)]+)\))/g);
            let arr3 = string.match(/(((?=\+)|-)?\d+)\*(((?=\+)|-)?\d+)/g);
            let arr4 = string.match(/(((?=\+)|-)?(\w+)\(([^)]+)\))\*(((?=\+)|-)?(\w+)\(([^)]+)\))/g);
            
            let
            let arr = arr1.concat(arr2, arr3, arr4).map(x => {
                this.prodFunc(...x.split('*').map(x => this.getFunctionFromString(x)))
            });

            return this.sumFunc(...arr);
        } */

        let tmp = string.match(/(((?=\+)|-)?(\w+)\(([^)]+)\))|(((?=\+)|-)?\d+)/g);
        if (tmp.length > 1) return this.sumFunc(...tmp.map(x => this.getFunctionFromString(x, waitTime, stepNum)));

        tmp = Number(string);
        if (tmp) return tmp;

        tmp = string.replace('-', '');
        if(string[0] == '-') return this.prodFunc(-1, this.getFunctionFromString(tmp, waitTime, stepNum))

        tmp = Array.from(string.matchAll(/(\w+)\(([^)]+)\)/))[0];
        if (tmp.length != 3) throw new ArgError('Unknown syntax error');

        let args = tmp[2].split(',').map(x => Number(x));
        if (args.some(x => isNaN(x))) throw new ArgError('Invalid argument. Function arguments must be numbers');
        
        let handle = tmp[1];
        if (this.functionHandler[handle]) return this.functionHandler[handle](args, waitTime, stepNum);
        else throw new ArgError('Unknown function ' + handle)
    }
    /**
     * @param {function[]} inpFuncArr
     * @param {number} stepNum
     * @param {number} waitTime
     */
    generateFromFunction(inpFuncArr, waitTime, stepNum) {
        /* funcArr is an array with 4 functions as specified in "desciption" in this.generateFromArray.
        Each function will be evaluated from 0 to endTime.
        If a function is undefined it is simply ignored (zero function).
        If a function is a number, it is taken to be the constant function. */
        const funcArr = inpFuncArr.map(x => {
            if (typeof x == 'function') return x
            else if (typeof x == 'number') return this.functions.constant(x)
            else throw new Error('invalid entry')
        });

        let stepTime = (waitTime * stepNum) / (stepNum - 1);
        let arr = Array(4);
        funcArr.forEach((func, index) => {
            let posArr = Array(stepNum);

            for (let i = 0; i < stepNum; i++) {
                posArr[i] = func(stepTime * i)
            }

            arr[index] = posArr;
        })

        //stepTime = parseFloat(stepTime.toFixed(2));
        return this.generateFromArray(arr, waitTime);
    }

    generateFromArray(arr, waitTime) {
        /* arr is an array with 4 position-arrays as specified in "desciption".
        The position arrays are evaluated simultaneously, one entry at a time and spaced waitTime apart
        If an entry is undefined it is taken to be zero.
        (it is thus allowed for the arrays to have different lengths)
        Similarily if an array is undefined. */
        const description = [
            'BEAM1 SEPARATION',
            'BEAM2 SEPARATION',
            'BEAM1 CROSSING',
            'BEAM2 CROSSING'
        ]
        const sequenceLength = arr.reduce((acc, cur) => Math.max(acc, cur.length), 0);

        let lineArr = [];
        let accWaitTime = 0;
        let prevPos = [0, 0, 0, 0]
        
        for (let index = 0; index < sequenceLength; index++) {
            let line = '';

            arr.forEach((posArr, i) => {
                const newPos = Number(posArr[index]);
                if(isNaN(newPos)) throw new ArgError('Array may only contain numbers', i)

                const relStep = newPos - prevPos[i];
                if (relStep != 0) {
                    prevPos[i] = prevPos[i] + parseFloat(relStep.toFixed(2));
                    line += ` ${this.ip} ${description[i]} ${relStep.toFixed(2)} SIGMA`;
                };
            })

            if (line != '') {
                if (accWaitTime > 0) lineArr.push('SECONDS_WAIT ' + accWaitTime);
                lineArr.push('RELATIVE_TRIM' + line);

                accWaitTime = waitTime;
            }
            else accWaitTime += waitTime;
        }
        
        let line = '';
        prevPos.forEach((x, i) => {
            if (x != 0) {
                line += ` ${this.ip} ${description[i]} ${(-prevPos[i]).toFixed(2)} SIGMA`;
            }
        })
        
        if (line) {
            lineArr.push('SECONDS_WAIT ' + accWaitTime);
            lineArr.push('RELATIVE_TRIM' + line);

            accWaitTime = 0;
        }

        if (accWaitTime > 0) lineArr.push('SECONDS_WAIT ' + accWaitTime);
        return lineArr.join('\n');
    }
}