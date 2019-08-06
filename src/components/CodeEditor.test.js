import CodeEditor from "./CodeEditor.js"
import { range, wait, asyncMap, addLineNumbers } from "../HelperFunctions.js"

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
    let ce;
    beforeEach(() => {
        ce = new CodeEditor();
        ce.style.visibility = "invisible";
        document.body.append(ce);
    })
    afterEach(() => {
        document.body.removeChild(ce);
    })

    fit("autocompletes correctly", async () => {
        ce.editor.execCommand("startAutocomplete");

        await asyncMap(range(6), async () => {
            ce.editor.onCommandKey(getKeyboardEvent(13/*Enter*/), 0, 13);
            await wait(0);
        })

        expect(ce.value).toBe(
`0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1) PLANE(CROSSING) UNITS(SIGMA)
1 RELATIVE_TRIM IP1 BEAM1 CROSSING 0.0 SIGMA
2 END_SEQUENCE
`
        )

        console.log(ce.value);
    })

    xdescribe("parsing and deparsing", () => {
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