import CreateFileWindow from "./CreateFileWindow.js";
import { NO_FILES_TEXT, getHTMLElementWithText, wait } from "../HelperFunctions.js";

async function getNewCreateFileWindow(gitlab) {
    let cfw = new CreateFileWindow();
    cfw.gitlab = gitlab;
    cfw.campaigns = Promise.resolve(["CampaignA", "CampaignB"])
    cfw.style.display = "none";
    document.body.appendChild(cfw);

    return cfw;
}

describe("CreateFileWindow", () => {
    /** @type {CreateFileWindow} */
    let cfw;

    beforeEach(async () => {
        cfw = await getNewCreateFileWindow({
            listFiles: () => Promise.resolve(["my_new_fileA", "my_new_fileB"])
        });
    })

    afterEach(() => {
        document.body.removeChild(cfw);
    })

    it("can click on the dropdown, select a file and copy", async (done) => {
        await cfw.onDropdownClick();
        await wait(1);
        getHTMLElementWithText(cfw, "my_new_fileA").click();

        cfw.addEventListener("submit", event => {
            expect(event.detail).toEqual({
                ip: "IP1",
                campaign: "CampaignA",
                filePaths: ["my_new_fileA"]
            })

            done();
        })

        getHTMLElementWithText(cfw, "Copy files").click();
    })

    it("can setFileUI of no files", () => {
        cfw.setFileUI([NO_FILES_TEXT]);
        expect().nothing();
    })
})