import * as script from "./parser.js";
import VdM from "./parser.js";

function randomItem(arr) {
    let keys = Object.keys(arr);
    let index = Math.floor(Math.random() * keys.length);
    let key = keys[index];
    return [key, arr[key]];
}
function checkCausality(item, index, array) {
    if (index == 0) {
        return (item.sequenceTime == 0 && item.realTime == 0);
    }
    else return !(item.sequenceTime < array[index - 1].sequenceTime || item.realTime < array[index - 1].realTime);
}

const file = `0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA)
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
11 ABSOLUTE_TRIM IP1 BEAM1 SEPARATION -4.0 SIGMA IP1 BEAM2 SEPARATION 4.0 SIGMA
# this is a comment
12 SECONDS_WAIT 10.0
13 RELATIVE_TRIM IP1 BEAM1 SEPARATION 3.0 SIGMA IP1 BEAM2 SEPARATION -3.0 SIGMA
14 SECONDS_WAIT 10.0

15 ABSOLUTE_TRIM IP1 BEAM1 SEPARATION 0.5 SIGMA IP1 BEAM2 SEPARATION -0.5 SIGMA
16 SECONDS_WAIT 10.0
17 RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.0 SIGMA IP1 BEAM2 SEPARATION -1.0 SIGMA
18 SECONDS_WAIT 10.0
19 END_FIT
20 RELATIVE_TRIM IP1 BEAM1 SEPARATION -1.0 SIGMA
21 RELATIVE_TRIM IP1 BEAM2 SEPARATION 1.0 SIGMA
22 END_SEQUENCE
`;
const simpleHead = "0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1) PLANE(SEPARATION) UNITS(SIGMA) \n 1 RELATIVE_TRIM IP1 BEAM1 SEPARATION 0.0 SIGMA \n 2 END_SEQUENCE";
const noHeader = "1 RELATIVE_TRIM IP1 BEAM1 SEPARATION 0.0 SIGMA";
const empty = "0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1) PLANE(SEPARATION) UNITS(SIGMA) \n \n 1 RELATIVE_TRIM IP1 BEAM1 SEPARATION 0.0 SIGMA \n 2 END_SEQUENCE";
const comment = "0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1) PLANE(SEPARATION) UNITS(SIGMA) \n # \n 1 RELATIVE_TRIM IP1 BEAM1 SEPARATION 0.0 SIGMA \n 2 END_SEQUENCE";
const largeTrim = `1 RELATIVE_TRIM IP1 BEAM1 SEPARATION 10 SIGMA
2 SECONDS_WAIT 10
3 RELATIVE_TRIM IP1 BEAM1 SEPARATION -20 SIGMA
4 ABSOLUTE_TRIM IP1 BEAM2 SEPARATION 10 SIGMA
5 SECONDS_WAIT 10
6 ABSOLUTE_TRIM IP1 BEAM2 SEPARATION -10 SIGMA`;
const faultyFile = `0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM3) PLANE(SEPARATION) UNITS(SIGMA)
1 SECONDS_WAIT 10.0
1 START_FIT SEPARATION GAUSSIAN
3 RELATIVE_TRIM IP1 BEAM1 SEPARATION -3.0 sigma
4 SECONDS_WAIT ten
5 RELATIVE_TRIM IP2 BEAM1 SEPARATION 1.0 SIGMA
6 SECONDS_WAIT 10.0 seconds
8 SECONDS_WAIT 10.0
9 command ...
`;

// Tests on the parser and deparser functions
describe("Parser", () => {
    let inst = new VdM();

    describe("Utility functions", () => {
        // Tests on isSubsetOf()
        it("returns of isSubsetOf", () => {
            let arr1 = ["1", "2", "4", "4"];
            let arr2 = ["1", "2", "3"];
            let set = new Set(arr1);
            let str1 = "2";
            let str2 = "3";

            function f(in1, in2) { return script.isSubsetOf(in1, in2); }
            expect(f(arr1, set) && f(set, arr1) && f(str1, arr1) && !f(arr1, str1) && !f(arr1, arr2) && f(str1, str1) && !f(str2, arr1) && f(1, [1, 2])).toBeTruthy();
        });

        // Tests on Luminocity
        it("Luminocity test calculation", () => {
            expect(inst.luminosity(0, 0).toPrecision(2)).toEqual("4.4e+30");
        });

        // Tests on getInnerBracket
        it("Returns of getInnerBrracket", () => {
            expect(script.getInnerBracket("PLANE(SEPARATION,CROSSING)", "PLANE")).toEqual(["SEPARATION", "CROSSING"]);
            expect(() => script.getInnerBracket("PLANE(SEPARATION,CROSSING)", "BEAM")).toThrow(jasmine.any(String));
        });

        // Test arguments are valid
        it("test argument validity", () => {
            expect(script.checkTrimArgs(["IP1", "BEAM2", "SEPARATION", "0", "SIGMA"])).toBeTruthy();
        });
        it("test argument validity", () => {
            expect(() => script.testArgs({ IP: ["IP3"] })).toThrow(jasmine.any(String));
        });
    });

    describe("Position manipulations", () => {
        it("Position adding", () => {
            let obj = new script.VdMcommandObject("SECONDS_WAIT 0.00");
            let pos = {
                "BEAM1": {
                    "SEPARATION": 1,
                    "CROSSING": 2,
                },
                "BEAM2": {
                    "SEPARATION": 3,
                    "CROSSING": 4,
                }
            };
            let pos2 = {
                "BEAM1": {
                    "SEPARATION": 2,
                    "CROSSING": 4,
                },
                "BEAM2": {
                    "SEPARATION": 6,
                    "CROSSING": 8,
                }
            };
            obj.addPos(pos);
            expect(obj.position).toEqual(pos);
            obj.addPos(pos);
            expect(obj.position).toEqual(pos2);
        });
        it("Position boundary test", () => {
            let obj = new script.VdMcommandObject("SECONDS_WAIT 0.00");
            let pos = {
                "BEAM1": {
                    "SEPARATION": 1,
                    "CROSSING": 2,
                },
                "BEAM2": {
                    "SEPARATION": 3,
                    "CROSSING": 4,
                }
            };
            obj.addPos(pos);
            expect(() => obj.checkLimit(2, 1)).toThrow(jasmine.any(String));
            expect(obj.checkLimit(5, 1)).toBeTruthy();
        });
    });

    describe("Parse and deparse", () => {
        it("Parsing template files", () => {
            expect(() => {
                inst.parse(simpleHead, true).checkSyntax();
                inst.parse(noHeader).checkSyntax();
            }).not.toThrow();
            expect(
                inst.parse(empty, true).structure[1].type
            ).toEqual("empty");
            expect(
                inst.parse(comment, true).structure[1].type
            ).toEqual("comment");
        });
        it("Parsing large file", () => {
            expect(() => {
                inst.parse(file, true).checkSyntax();
            }).not.toThrow();
        });
        it("Parse and deparse", () => {
            expect(inst.parse(file, true).deparse()).toEqual(file);
        });
        it("Parsing faulty files", () => {
            expect(() => inst.parse(faultyFile, true).checkSyntax()).toThrow();
            expect(inst.errors.length).toEqual(9);
            expect(inst.errors.every(x => x instanceof script.VdMSyntaxError)).toBeTruthy();
            expect(inst.errors[1].line).toEqual(2);

            expect(() => inst.parse(largeTrim).checkSyntax()).toThrow();
            expect(inst.structure.every(x => x.isValid)).toBeTruthy();
        });
    });

    describe("Simulation", () => {
        it("Test on out of bounds beam", () => {
            expect(() => inst.parse(largeTrim).checkSyntax()).toThrow();
        });
        it("Test causality (simulated times)", () => {
            let commandArray = inst.parse(file, true).structure.filter(x => x.type == "command");
            expect(commandArray.every(checkCausality)).toBeTruthy();

            commandArray = inst.parse(largeTrim).structure.filter(x => x.type == "command");
            expect(commandArray.every(checkCausality)).toBeTruthy();
        });
        it("Test beam position simulation", () => {
            let lastpos = inst.parse(largeTrim).structure.slice(-1)[0].position;
            expect(lastpos.BEAM1).toEqual(lastpos.BEAM2);
        });
    });

    describe("toChart methods", () => {
        inst.parse(file, true);
        const beamGraph = inst.toBeamGraph(1,"CROSSING");
        const lumiGraph = inst.toLumiGraph();

        it("Can generate position graph", () => {
            expect(beamGraph.length).toEqual(23);
            expect(beamGraph.every((x, i, arr) => {
                let [...boo] = Array(2).fill(true);
                boo[0] = x.length == 2;

                const prevElem = arr[i-1];
                if (prevElem){
                    boo[1] = prevElem[0].realTime <= x[0].realTime;
                    boo[2] = prevElem[0].sequenceTime <= x[0].sequenceTime;
                    boo[3] = !isNaN(Number(prevElem[1].mm));
                    boo[4] = !isNaN(Number(prevElem[1].sigma));
                }

                return boo.reduce((curr, acc) => curr && acc, true);
            })).toBeTruthy();
        });

        it("Can generate lumi graph", () => {
            expect(lumiGraph.every(x =>
                x[0].realTime && x[0].sequenceTime && isFinite(Number(x[1]))
            )).toBeTruthy();
        });
    });
});
