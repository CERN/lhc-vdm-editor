import CreateFileWindow from "./CreateFileWindow.js";
import GitLab from "../GitLab.js";
import { NO_FILES_TEXT, getHTMLElementWithText } from "../HelperFunctions.js";

/**
 * @param {GitLab} [gitlab]
 */
async function getNewCreateFileWindow(gitlab) {
    let cfw = new CreateFileWindow();
    cfw.gitlab = gitlab;
    cfw.campaigns = (await gitlab.listCampaigns()).reverse()
    cfw.style.display = "none";
    document.body.appendChild(cfw);

    return cfw;
}

describe("CreateFileWindow", () => {
    /** @type {CreateFileWindow} */
    let cfw;
    /** @type {GitLab} */
    let gitlab;

    beforeAll(async () => {
        const token = (await (await fetch("../secrets.json")).json()).token;
        gitlab = new GitLab(
            token,
            // NOTE: we need to commit to the test branch so we don't mess up master
            "vdm-editor-test"
        );
    })

    beforeEach(async () => {
        cfw = await getNewCreateFileWindow(gitlab);
    })

    afterEach(() => {
        document.body.removeChild(cfw);
    })

    it("can click on the dropdown", async () => {
        await cfw.onDropdownClick();
        expect().nothing();
    })

    it("can setFileUI of no files", () => {
        cfw.setFileUI([NO_FILES_TEXT]);
        expect().nothing();
    })

    it("Dispatches copy event", async () => {
        let copySpy = jasmine.createSpy('copySpy');
        cfw.addEventListener('submit', copySpy);

        cfw.shadowRoot.querySelector('#copy-button').click();
        expect(copySpy).toHaveBeenCalled()
    })

    it("Dispatches empty create event", async () => {
        let createSpy = jasmine.createSpy('createSpy');
        cfw.addEventListener('create-empty', createSpy);

        cfw.shadowRoot.querySelector('#create-empty').click();
        expect(createSpy).toHaveBeenCalled()
    })
})