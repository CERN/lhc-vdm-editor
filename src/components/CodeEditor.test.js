import CodeEditor from "./CodeEditor.js"

const simpleFile = '0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA)\n1 SECONDS_WAIT 1.0\n2 END_SEQUENCE';
const simpleFileWithComments = '#start\n0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA)\n#middle\n1 SECONDS_WAIT 1.0\n2 END_SEQUENCE';


function getKeyboardEvent(keyCode){
    var keyboardEvent = document.createEvent("KeyboardEvent");
    var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";

    keyboardEvent[initMethod](
        "keydown",
        true,
        true,
        window,
        false,
        false,
        false,
        false,
        keyCode,
        0
    );

    return keyboardEvent;
}

describe("CodeEditor", () => {
    /** @type CodeEditor */
    let editor;
    xit("autocompletes correctly", () => {
        editor.editor.execCommand("startAutocomplete");
        editor.editor.onCommandKey(getKeyboardEvent(13/*Enter*/), 0, 13)
    })

    describe("parsing and deparsing", () => {
        /** @type {CodeEditor}  */
        let ce;

        beforeEach(() => {
            ce = new CodeEditor();
        })

        it("parses and deparses a simple file", () => {
            ce.value = simpleFile;

            expect(ce.value).toBe(simpleFile)
        })

        it("parses and deparses a file with comments", () => {
            ce.value = simpleFileWithComments;

            expect(ce.value).toBe(simpleFileWithComments)
        })
    })
})