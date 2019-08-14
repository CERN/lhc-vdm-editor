export default class Generator {
    /**
     * @param {string} ip
     */
    constructor(ip) {
        this.ip = ip;

        this.functions = {
            linear: function (startPos, endPos, runtime, t) {
                return t <= runtime ? startPos + t * (endPos - startPos) / runtime : 0
            },
            zero: () => 0,
        };

        let func1 = [(t) => this.functions.linear(5, -5, 750, t), this.functions.zero];
        let func2 = [(t) => this.functions.linear(-5, 5, 750, t), this.functions.zero];
        this.test = this.generate(func1, func2, 30, 1000);
    }

    /**
     * @param {any} funcArrBeam1
     * @param {any} funcArrBeam2
     * @param {number} stepTime
     * @param {number} totTime
     */
    generate(funcArrBeam1, funcArrBeam2, stepTime, totTime) {
        // beam-N-func is an array with [funcSep, funcCross] that takes time t and returns absolute position
        let funcArr = funcArrBeam1.concat(funcArrBeam2);
        let description = [
            'BEAM1 SEPARATION',
            'BEAM1 CROSSING',
            'BEAM2 SEPARATION',
            'BEAM2 CROSSING'
        ]

        let lineArr = [];
        lineArr.push(`0 INITIALIZE_TRIM IP(${this.ip}) BEAM(BEAM1,BEAM2) PLANE(SEPARATION,CROSSING) UNITS(SIGMA)`);
        lineArr.push(`1 SECONDS_WAIT ${stepTime}`);

        let lineNum = 2;
        let time = 0;
        let pos = [0, 0, 0, 0]
        while (time <= totTime) {
            let line = `${lineNum} RELATIVE_TRIM`;
            let addLine = false;

            for (let i = 0; i < description.length; i++) {
                let relStep = (funcArr[i](time + stepTime) - pos[i]).toFixed(2);
                if (parseFloat(relStep) != 0) {
                    // Maybe add some test if we want to use absolute trim instead
                    pos[i] += parseFloat(relStep);
                    line += ` ${this.ip} ${description[i]} ${relStep} SIGMA`;
                    addLine = true;
                };
            };

            if (addLine) lineArr.push(line);
            lineArr.push(`${lineNum + 1} SECONDS_WAIT ${stepTime}`);

            lineNum += 2;
            time += stepTime;
        };

        lineArr.push(`${lineNum + 1} END_SEQUENCE`);

        return lineArr.join('\n');
    }
}