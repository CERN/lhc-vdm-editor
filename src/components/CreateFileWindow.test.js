import CreateFileWindow from "./CreateFileWindow.js";
import { NO_FILES_TEXT, getHTMLElementWithText, waitRnd, wait } from "../HelperFunctions.js";

async function getNewCreateFileWindow(gitlab) {
    let cfw = new CreateFileWindow();
    cfw.gitlab = gitlab;
    cfw.campaigns = (async () => {
        await waitRnd();
        return ["CampaignA", "CampaignB"];
    })();
    cfw.style.display = "none";
    document.body.appendChild(cfw);

    return cfw;
}

describe("CreateFileWindow", () => {
    /** @type {CreateFileWindow} */
    let cfw;

    beforeEach(async () => {
        cfw = await getNewCreateFileWindow({
            listFiles: async () => {
                await waitRnd();
                return ["my_new_fileA", "my_new_fileB"];
            }
        });
        await cfw.campaigns;
    });

    afterEach(() => {
        document.body.removeChild(cfw);
    });

    it("can setFileUI of no files", () => {
        cfw.setFileUI([NO_FILES_TEXT]);
        expect().nothing();
    });

    it("Dispatches copy event", () => {
        let copySpy = jasmine.createSpy("copySpy");
        cfw.addEventListener("submit", copySpy);

        cfw.shadowRoot.querySelector("#copy-button").click();
        expect(copySpy).toHaveBeenCalled();
    });

    it("Dispatches empty create event", () => {
        let createSpy = jasmine.createSpy("createSpy");
        cfw.addEventListener("create-empty", createSpy);

        cfw.shadowRoot.querySelector("#create-empty").click();
        expect(createSpy).toHaveBeenCalled();
    });
});
