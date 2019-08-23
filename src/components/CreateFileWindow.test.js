import CreateFileWindow from "./CreateFileWindow.js";
import { NO_FILES_TEXT } from "../HelperFunctions.js";

async function getNewCreateFileWindow(gitlabInstance) {
    let cfw = new CreateFileWindow();
    cfw.gitlab = gitlabInstance;
    cfw.campaigns = ["CampaignA"]
    cfw.style.display = "none";
    document.body.appendChild(cfw);

    return cfw;
}

describe("CreateFileWindow", () => {
    /** @type {CreateFileWindow} */
    let cfw;

    beforeEach(async () => {
        // @ts-ignore
        cfw = await getNewCreateFileWindow({
            listFiles: () => Promise.resolve(["fileA", "fileB"])
        });
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
})