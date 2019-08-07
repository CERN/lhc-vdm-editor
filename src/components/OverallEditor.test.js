import OverallEditor from "./OverallEditor.js";
import GitLab from "../GitLab.js";

const TEST_FILE = "201806_VdM/IP8/lhcb_1st_part_MAIN_Jun2018.txt";

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
        const token = (await (await fetch("../secrets.json")).json()).token;
        const gitlab = new GitLab(
            token,
            // NOTE: we need to commit to the test branch so we don't mess up master
            "vdm-editor-test" 
        );
        oe = new OverallEditor(gitlab);
        oe.style.visibility = "hidden";
        document.body.appendChild(oe);
    })

    afterEach(() => {
        document.body.removeChild(oe);
    })

    describe("Initial state (without localStorage)", () => {
        it("doesn't do anything when pressing buttons on default view", () => {
            expect(() => {
                spyOn(window, "alert").and.stub();

                oe.onRevertButtonPress();
                oe.onTrySwitchEditor(1);
                oe.onTrySwitchEditor(0);
                oe.chartsComponent.timeType = "sequence";
                oe.chartsComponent.scale = "log";
            }).not.toThrow();
        })

        it("can load a file from no local storage", () => {
            expect(() => {
                oe.setCurrentEditorContent(TEST_FILE);
            }).not.toThrow();
        })
    })
})