import CodeEditor from "./CodeEditor.js"

const simpleFile = '0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA)\n1 SECONDS_WAIT 1.0\n2 END_SEQUENCE';
const simpleFileWithComments = '#start\n0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA)\n#middle\n1 SECONDS_WAIT 1.0\n2 END_SEQUENCE';


fdescribe("CodeEditor", () => {
    describe("parsing and deparsing", () => {
        /** @type {CodeEditor}  */
        let ce;

        beforeEach(() => {
            ce = new CodeEditor();
        })

        it("parses and deparses a simple file", async () => {
            ce.value = simpleFile;

            expect(ce.value).toBe(simpleFile)
        })

        it("parses and deparses a file with comments", async () => {
            ce.value = simpleFileWithComments;

            expect(ce.value).toBe(simpleFileWithComments)
        })
    })
})