import { parseVdM, deparseVdM, MySyntaxError } from "./parser.js"

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
20 END_SEQUENCE
`
let faultyFile = `0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM3) PLANE(SEPARATION) UNITS(SIGMA)
1 SECONDS_WAIT 10.0
1 START_FIT SEPARATION GAUSSIAN
3 RELATIVE_TRIM IP1 BEAM1 SEPARATION -3.0 sigma 
4 SECONDS_WAIT ten
5 RELATIVE_TRIM IP2 BEAM1 SEPARATION 1.0 SIGMA
6 SECONDS_WAIT 10.0 seconds
7 SECONDS_WAIT 10.0`

// Tests on the parser and deparser functions
describe("Parser", () => {
    it("File parse", () => {
        expect(parseVdM(file)).toEqual(jasmine.any(Array))
    })
    it("Simple parse ", () => {
        expect(parseVdM('0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA) \n 1 END_SEQUENCE'))
            .toEqual(JSON.parse('[{"type":"command","command":"INITIALIZE_TRIM","args":["IP(IP1)","BEAM(BEAM1,BEAM2)","PLANE(SEPARATION)","UNITS(SIGMA)"],"realTime":0,"sequenceTime":0,"pos":{"BEAM1":{"SEPARATION":0,"CROSSING":0},"BEAM2":{"SEPARATION":0,"CROSSING":0}}},{"type":"command","command":"END_SEQUENCE","args":[],"realTime":0,"sequenceTime":0,"pos":{"BEAM1":{"SEPARATION":0,"CROSSING":0},"BEAM2":{"SEPARATION":0,"CROSSING":0}}}]'))
    })
    it("Empty line parse", () => {
        expect(parseVdM('0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA) \n \n 1 END_SEQUENCE'))
            .toEqual(JSON.parse('[{"type":"command","command":"INITIALIZE_TRIM","args":["IP(IP1)","BEAM(BEAM1,BEAM2)","PLANE(SEPARATION)","UNITS(SIGMA)"],"realTime":0,"sequenceTime":0,"pos":{"BEAM1":{"SEPARATION":0,"CROSSING":0},"BEAM2":{"SEPARATION":0,"CROSSING":0}}},{"type":"empty"},{"type":"command","command":"END_SEQUENCE","args":[],"realTime":0,"sequenceTime":0,"pos":{"BEAM1":{"SEPARATION":0,"CROSSING":0},"BEAM2":{"SEPARATION":0,"CROSSING":0}}}]'))
    })
    it("Comment line parse", () => {
        expect(parseVdM('0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA) \n # \n 1 END_SEQUENCE'))
            .toEqual(JSON.parse('[{"type":"command","command":"INITIALIZE_TRIM","args":["IP(IP1)","BEAM(BEAM1,BEAM2)","PLANE(SEPARATION)","UNITS(SIGMA)"],"realTime":0,"sequenceTime":0,"pos":{"BEAM1":{"SEPARATION":0,"CROSSING":0},"BEAM2":{"SEPARATION":0,"CROSSING":0}}},{"type":"comment","comment":""},{"type":"command","command":"END_SEQUENCE","args":[],"realTime":0,"sequenceTime":0,"pos":{"BEAM1":{"SEPARATION":0,"CROSSING":0},"BEAM2":{"SEPARATION":0,"CROSSING":0}}}]'))
    })
    it('File parse and then deparse', () => {
        expect(deparseVdM(parseVdM(file))).toEqual(file)
    })
    it('Simple parse and then deparse', () => {
        expect(deparseVdM(parseVdM('0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA)\n1 END_SEQUENCE')))
            .toEqual('0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA)\n1 END_SEQUENCE\n')
    })
    it('Generate headers parse', () => {
        expect(deparseVdM(parseVdM('1 RELATIVE_TRIM IP1 BEAM1 SEPARATION -3.0 SIGMA\n2 RELATIVE_TRIM IP1 BEAM2 CROSSING -1.0 MM', true)))
            .toEqual('0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION,CROSSING) UNITS(SIGMA,MM)\n1 RELATIVE_TRIM IP1 BEAM1 SEPARATION -3.0 SIGMA\n2 RELATIVE_TRIM IP1 BEAM2 CROSSING -1.0 MM\n3 END_SEQUENCE\n')
    })
    it('Faulty INITIALIZE_TRIM', () => {
        expect(function () { parseVdM('0 INITIALIZE_TRIM \n 1 END_SEQUENCE') })
            .toThrow(jasmine.any(Array))
    })
    it('Faulty INITIALIZE_TRIM', () => {
        expect(function () { parseVdM('0 INITIALIZE_TRIM \n 1 END_SEQUENCE') })
            .toThrow(jasmine.any(Array))
    })
    it('Faulty INITIALIZE_TRIM', () => {
        expect(function () { parseVdM('0 INITIALIZE_TRIM \n 1 END_SEQUENCE') })
            .toThrow(jasmine.arrayContaining([jasmine.any(MySyntaxError)]))
    })
    it('Faulty file parse', () => {
        expect(function () { parseVdM(faultyFile) })
            .toThrow(jasmine.arrayWithExactContents(new Array(8).fill(jasmine.any(MySyntaxError))))
    }) 
})