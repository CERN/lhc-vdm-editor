import OverallEditor from "./OverallEditor.js";
import {NoPathExistsError} from "../GitLab.js";
import { DEFAULT_BEAM_PARAMS, waitRnd } from "../HelperFunctions.js";

const TEST_FILE = "TestCampaign/IP1/my_test_file.txt";
const TEST_FILE_CONTENT = "0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1) PLANE(SEPARATION) UNITS(SIGMA)\n1 RELATIVE_TRIM IP1 BEAM1 SEPARATION 0.0 SIGMA\n2 END_SEQUENCE\n";

async function getNewOverallEditor(gitlab) {
    let oe = new OverallEditor(gitlab);
    oe.style.display = "none";
    document.body.appendChild(oe);
    await oe.loadedPromise;

    return oe;
}

describe("OverallEditor", () => {
    /** @type {OverallEditor} */
    let oe;
    let fakeLocalStorage;

    beforeEach(() => {
        fakeLocalStorage = {};

        spyOn(localStorage, "getItem").and.callFake(key => {
            return fakeLocalStorage[key] || null;
        });

        spyOn(localStorage, "removeItem").and.callFake(key => {
            delete fakeLocalStorage[key];
        });

        spyOn(localStorage, "setItem").and.callFake((key, value) => {
            return fakeLocalStorage[key] = value;
        });

        spyOn(localStorage, "clear").and.callFake(() => {
            fakeLocalStorage = {};
        });
    });

    let fileContents = TEST_FILE_CONTENT;
    beforeEach(async () => {
        oe = await getNewOverallEditor({
            writeFile: async (filePath, commitMessage, fileText) => {
                await waitRnd();
                if(filePath === TEST_FILE) fileContents = fileText;
                else throw new NoPathExistsError();
            },
            readFile: async (filePath) => {
                await waitRnd();
                if(filePath === TEST_FILE) return fileContents;
                else if(filePath.endsWith("beam.json")) return JSON.stringify(DEFAULT_BEAM_PARAMS);
                else throw new NoPathExistsError();
            },
            listFiles: async (path, rec, returnStructure=true) => {
                await waitRnd();
                if(path === "TestCampaign/IP1"){
                    if(returnStructure) return { files: ["TestCampaign/IP1/my_test_file.txt"], folders: new Map() };
                    else return ["TestCampaign/IP1/my_test_file.txt"];
                }
                else throw Error(`stub listFiles not implemented for ${path}`);
            },
            listCampaigns: async () => {
                await waitRnd();
                return ["TestCampaign"];
            }
        });
    });

    afterEach(() => {
        document.body.removeChild(oe);
    });

    describe("Initial state (without localStorage)", () => {
        it("doesn't do anything when pressing buttons on default view", () => {
            spyOn(window, "alert").and.stub();

            oe.tryToRevert();
            oe.onSwitchEditorButtonPress(1);
            oe.onSwitchEditorButtonPress(0);
            oe.chartsComponent.timeType = "sequence";
            expect().nothing();
        });

        it("can load a file from no local storage", async () => {
            await oe.setCurrentEditorContent(TEST_FILE);
            expect().nothing();
        });

        it("can load a file from no local storage", async () => {
            await oe.setCurrentEditorContent(TEST_FILE);
            expect().nothing();
        });
    });

    describe("Local storage loading", () => {
        it("loads the same file from local storage", async () => {
            await oe.setCurrentEditorContent(TEST_FILE);

            expect(oe.filePath).toBe(TEST_FILE);
        });

        it("loads the same content from local storage", async () => {
            await oe.setCurrentEditorContent(TEST_FILE, TEST_FILE_CONTENT);

            expect(oe.value).toBe(TEST_FILE_CONTENT);
        });

        it("saves the current open editor index", async () => {
            await oe.setCurrentEditorContent(TEST_FILE);

            const editorToSwitchTo = 0;
            oe.onSwitchEditorButtonPress(editorToSwitchTo);

            expect(oe.currentEditorIndex).toBe(editorToSwitchTo);
        });
    });

    describe("Reverting and committing works", () => {
        it("commits to gitlab", async () => {
            await oe.setCurrentEditorContent(TEST_FILE);
            oe.onSwitchEditorButtonPress(1/** The code editor */);
            oe.editor.rawValue += " ";

            await oe.tryToCommit("Test message");
            expect(oe.isCommitted).toBe(true);
        });

        it("reverts the current file", async () => {
            await oe.setCurrentEditorContent(TEST_FILE, "test");
            oe.onSwitchEditorButtonPress(1/** The code editor */);
            oe.editor.rawValue += " ";
            spyOn(window, "confirm").and.callFake(_ => true);
            await oe.tryToRevert();

            expect(oe.value).toBe(TEST_FILE_CONTENT);
            expect(oe.isCommitted).toBe(true);
        });
    });
});
