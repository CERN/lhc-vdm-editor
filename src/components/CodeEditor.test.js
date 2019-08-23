import CodeEditor from "./CodeEditor.js";
import { range, wait, asyncMap, DEFAULT_BEAM_PARAMS, getHTMLElementWithText, HTMLHasText } from "../HelperFunctions.js";
import VdM from "../parser.js";

const simpleFile = "0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA)\n1 SECONDS_WAIT 1.0\n2 END_SEQUENCE\n";
const simpleFileWithComments = "#start\n0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA)\n#middle\n1 SECONDS_WAIT 1.0\n2 END_SEQUENCE\n";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000000000;

function getKeyboardEvent(keyCode) {
    return new KeyboardEvent("keydown", {
        code: keyCode,
        bubbles: true,
        cancelable: true
    });
}

describe("CodeEditor", () => {
    beforeAll(() => {
        const makeInvisibleStyle = document.createElement("style");
        makeInvisibleStyle.innerText = ".ace_autocomplete{visibility: hidden !important}";
        document.body.appendChild(makeInvisibleStyle);
    });
    /** @type CodeEditor */
    let ce;
    beforeEach(() => {
        ce = new CodeEditor();
        ce.VdM = new VdM(DEFAULT_BEAM_PARAMS, "IP1");
        ce.ip = "IP1";
        ce.style.visibility = "hidden";

        document.body.append(ce);
    });
    afterEach(() => {
        document.body.removeChild(ce);
    });

    it("autocompletes correctly", async () => {
        ce.editor.execCommand("startAutocomplete");

        await asyncMap(range(6), async () => {
            ce.editor.onCommandKey(new KeyboardEvent("keydown", {
                code: "13",
                key: "Enter",
                bubbles: true,
                cancelable: true
            }), 0, 13);
            await wait(0);
        });

        expect(ce.rawValue).toBe("RELATIVE_TRIM IP1 BEAM1 CROSSING 0.0 SIGMA");
    });

    it("adds header and footers to blank file", () => {
        expect(ce.value).toBe("0 INITIALIZE_TRIM IP() BEAM() PLANE() UNITS()\n1 END_SEQUENCE\n");
    });

    describe("parsing and deparsing", () => {
        it("parses and deparses a simple file", () => {
            ce.value = simpleFile;

            expect(ce.value).toBe(simpleFile);
        });

        it("parses and deparses a file with comments", () => {
            ce.value = simpleFileWithComments;

            expect(ce.value).toBe(simpleFileWithComments);
        });
    });

    it("can show a tooltip on hover", async () => {
        ce.value = simpleFile;
        await wait(1);
        const element = getHTMLElementWithText(ce, "SECONDS_WAIT");
        const rect = element.getClientRects();
        element.dispatchEvent(new MouseEvent("mousemove", {
            bubbles: true,
            cancelable: true,
            clientX: rect[0].left + 2,
            clientY: rect[0].top + 2,
        }));
        // the token tooltip appears after 100 milliseconds, so wait for 110
        await wait(110);
        expect(HTMLHasText(ce, "<NUMBER>")).toBeTruthy();
    });
});
