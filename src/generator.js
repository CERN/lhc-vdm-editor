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


export default class Generator {
    /**
     * @param {string} ip
     */
    constructor(ip) {
        this.ip = ip;

        this.functions = {
            linear: function (startPos, endPos, runTime) {
                return (t) => {
                    if (t < runTime) return startPos + t * (endPos - startPos) / runTime;
                    else return 0;
                }
            },
            period: (period) => (t) => (t % period < period / 2) ? 1 : 0,
            step: function (startTime, endTime) {
                return (t) => (t >= startTime && t <= endTime) ? 1 : 0
            },
            // These are in fact redundant since numbers are taken to be constant functions but are included for completeness
            zero: (t) => 0,
            constant: (value) => (t) => value,
        };


        /* These are all examples of how to efficiently use the generator.
        Functions as well as hardcoded posArrays can easily be added.

        let funcArr
        let func

        funcArr = [this.functions.linear(-5, 5, 100), this.functions.linear(5, -5, 100)]; // no crossing plane functions supplied still works
        this.template1 = this.generateFromFunction(funcArr, 50, 100);

        funcArr = Array(4);
        func = this.prodFunc(this.functions.period(6), this.functions.step(40, 60)); // periodic function on the interval [40, 60]
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

    /**
     * @param {function[]} inpFuncArr
     * @param {number} stepNum
     * @param {number} runTime
     */
    generateFromFunction(inpFuncArr, stepNum, runTime) {
        /* funcArr is an array with 4 functions as specified in "desciption".
        Each function will be evaluated from 0 to endTime.
        If a function is undefined it is simply ignored (zero function).
        If a function is a number, it is taken to be the constant function. */
        const funcArr = inpFuncArr.map((x, i) => {
            if (typeof x == 'function') return x
            else if (typeof x == 'number') return this.functions.constant(x)
            else if (Array.isArray(x)) return this.sumFunc(...x)
            else throw new Error('invalid entry')
        });

        const stepTime = runTime/stepNum;
        let arr = Array(4);
        funcArr.forEach((func, index) => {
            let posArr = Array(stepNum);

            for(let i = 0; i < stepNum; i++){
                posArr[i] = func(stepTime * i)
            }

            arr[index] = posArr;
        })

        return this.generateFromArray(arr, stepTime);
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
        let accWaitTime = waitTime;
        let prevPos = [0, 0, 0, 0]

        for (let index = 0; index < sequenceLength; index++) {
            let line = '';

            arr.forEach((posArr, i) => {
                const newPos = posArr[index] || 0;
                const relStep = newPos - prevPos[i];
                if (relStep != 0) {
                    // Maybe add some test if we want to use absolute trim instead
                    prevPos[i] += relStep;
                    line += ` ${this.ip} ${description[i]} ${relStep} SIGMA`;
                };
            })

            if (line != '') {
                lineArr.push('SECONDS_WAIT ' + accWaitTime);
                lineArr.push('RELATIVE_TRIM' + line);
                
                accWaitTime = waitTime;
            }
            else accWaitTime += waitTime;
        }

        if (accWaitTime > waitTime) lineArr.push('SECONDS_WAIT ' + accWaitTime)

        prevPos.forEach((x, i) => {
            if (x != 0) {
                lineArr.push(`ABSOLUTE_TRIM ${this.ip} ${description[i]} 0.0 SIGMA`);
                lineArr.push('SECONDS_WAIT ' + waitTime);
            }
        })

        return lineArr.join('\n');
    }
}