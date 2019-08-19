import FileBrowser from "./FileBrowser.js";
import GitLab from "../GitLab.js";
import { NO_FILES_TEXT, HTMLHasText, getHTMLElementWithText, wait } from "../HelperFunctions.js";

const TEST_FILE = "201806_VdM/IP8/lhcb_1st_part_MAIN_Jun2018.txt";
const TEST_FILE2 = "201806_VdM/IP1/IP1_LSC_B1X_12Nov17.txt";
const TEST_NO_FILE_FOLDER = "201707_ATLAS_DryRun/IP8";
const TEST_FOLDER_FILE = "201811_VdM_PbPb/IP8/spare/lhcb_Diag_Nov2018.txt";

/**
 * @param {GitLab} [gitlab]
 */
async function getNewFileBrowser(gitlab) {
    let fb = new FileBrowser();
    fb.gitlab = gitlab;
    fb.style.display = "none";
    document.body.appendChild(fb);
    await fb.loadedPromise;

    return fb;
}

describe("FileBrowser", () => {
    /** @type {FileBrowser} */
    let fb;
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
        fb = await getNewFileBrowser(gitlab);
    })

    afterEach(() => {
        document.body.removeChild(fb);
    })

    it("gets the FileUIHTML", () => {
        expect(() => {
            fb.getFileUI({
                files: ["test1", "test2"],
                folders: new Map([
                    ["folder1", [
                        "file1",
                        "file2"
                    ]]
                ])
            }, "ip", "campaign")
        }).not.toThrow();
    })

    it("Loads correctly", async () => {
        const [campaign, ip, fileName] = TEST_FILE.split("/");

        await fb.setOpenFile(TEST_FILE);
        // @ts-ignore
        expect(getHTMLElementWithText(fb, ip).selected).toBeTruthy();
        // @ts-ignore
        expect(getHTMLElementWithText(fb, campaign).selected).toBeTruthy();
        expect(getComputedStyle(getHTMLElementWithText(fb, fileName)).fontWeight).not.toBe("400");
    })

    it("Can load an ip and campaign", async () => {
        await fb.setOpenFile(TEST_FILE);

        const [T2Campaign, T2IP, T2FileName] = TEST_FILE2.split("/");
        await fb.setSelection({
            ip: T2IP, 
            campaign: T2Campaign
        });
        await wait(1);

        expect(HTMLHasText(fb, T2FileName)).toBeTruthy();
    })

    it("Handles no files correctly", async () => {
        await fb.setOpenFile(TEST_NO_FILE_FOLDER);

        const openFileSpy = jasmine.createSpy();
        fb.addEventListener("open-file", openFileSpy);

        let noFilesElement = getHTMLElementWithText(fb, NO_FILES_TEXT);

        expect(noFilesElement).not.toBeNull();
        noFilesElement.click();
        expect(openFileSpy).not.toHaveBeenCalled();
    })

    it("Handles no files correctly", async () => {
        await fb.setOpenFile(TEST_NO_FILE_FOLDER);

        const openFileSpy = jasmine.createSpy();
        fb.addEventListener("open-file", openFileSpy);

        let noFilesElement = getHTMLElementWithText(fb, NO_FILES_TEXT);

        expect(noFilesElement).not.toBeNull();
        noFilesElement.click();
        expect(openFileSpy).not.toHaveBeenCalled();
    })

    it("Can open and close a folder", async () => {
        const [campaign, ip, folderName, fileName] = TEST_FOLDER_FILE.split("/");
        await fb.setOpenFile(`${campaign}/${ip}`);

        const folderElement = getHTMLElementWithText(fb, folderName);

        folderElement.click();
        await wait(1); // wait for async to resolve
        const hasFile1 = HTMLHasText(fb, fileName);
        folderElement.click();
        await wait(1);
        const hasFile2 = HTMLHasText(fb, fileName);

        expect(hasFile1).not.toBe(hasFile2);
    })

    it("Can open the create-file-window window", async () => {
        const newFileButton = getHTMLElementWithText(fb, "New file");
        newFileButton.click();
        expect(fb.shadowRoot.querySelector("create-file-window")).not.toBeNull();
    })
})