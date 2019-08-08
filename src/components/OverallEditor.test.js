import OverallEditor from "./OverallEditor.js";
import GitLab from "../GitLab.js";

const TEST_FILE = "201806_VdM/IP8/lhcb_1st_part_MAIN_Jun2018.txt";
const TEST_FILE_CONTENT = "0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA)\n 1 END_SEQUENCE\n";

async function getNewOverallEditor(){
    const token = (await (await fetch("../secrets.json")).json()).token;
    const gitlab = new GitLab(
        token,
        // NOTE: we need to commit to the test branch so we don't mess up master
        "vdm-editor-test" 
    );
    let oe = new OverallEditor(gitlab);
    oe.style.visibility = "hidden";
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

        spyOn(localStorage, "removeItem").and.callFake(key =>  {
            delete fakeLocalStorage[key];
        });

        spyOn(localStorage, "setItem").and.callFake((key, value) =>  {
            return fakeLocalStorage[key] = value;
        });

        spyOn(localStorage, "clear").and.callFake(() =>  {
            fakeLocalStorage = {};
        });
    });

    beforeEach(async () => {
        oe = await getNewOverallEditor();
    })

    afterEach(() => {
        document.body.removeChild(oe);
    })

    describe("Initial state (without localStorage)", () => {
        it("doesn't do anything when pressing buttons on default view", () => {
            expect(() => {
                spyOn(window, "alert").and.stub();

                oe.tryToRevert();
                oe.onSwitchEditorButtonPress(1);
                oe.onSwitchEditorButtonPress(0);
                oe.chartsComponent.timeType = "sequence";
            }).not.toThrow();
        })

        it("can load a file from no local storage", () => {
            expect(() => {
                oe.setCurrentEditorContent(TEST_FILE);
            }).not.toThrow();
        })

        it("can load a file from no local storage", () => {
            expect(() => {
                oe.setCurrentEditorContent(TEST_FILE);
            }).not.toThrow();
        })
    })

    describe("Local storage loading", () => {
        it("loads the same file from local storage", async () => {
            oe.setCurrentEditorContent(TEST_FILE);

            oe = await getNewOverallEditor();
            console.log(fakeLocalStorage)
            expect(oe.filePath).toBe(TEST_FILE);
        })

        it("loads the same content from local storage", async () => {
            oe.setCurrentEditorContent(TEST_FILE, TEST_FILE_CONTENT);

            oe = await getNewOverallEditor();
            expect(oe.value).toBe(TEST_FILE_CONTENT);
        })

        it("saves the current open editor index", async () => {
            oe.setCurrentEditorContent(TEST_FILE);
            const editorToSwitchTo = Math.floor(Math.random() * 2);
            oe.switchToEditor(editorToSwitchTo);

            oe = await getNewOverallEditor();
            expect(oe.currentEditorIndex).toBe(editorToSwitchTo);
        })
    })

    describe("Reverting and committing works", () => {
        it("commits to gitlab", async () => {
            oe.setCurrentEditorContent(TEST_FILE);
            oe.switchToEditor(1/** The code editor */);
            oe.editor.rawValue += " ";

            oe.tryToCommit("Test message");
            expect(oe.isCommitted).toBe(true);
        })

        it("commits to gitlab", async () => {
            oe.setCurrentEditorContent(TEST_FILE, TEST_FILE_CONTENT);
            oe.switchToEditor(1/** The code editor */);
            oe.editor.rawValue += " ";
            oe.tryToRevert();

            expect(oe.value).toBe(TEST_FILE_CONTENT);
            expect(oe.isCommitted).toBe(true);
        })
    })
})