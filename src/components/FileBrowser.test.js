import FileBrowser from "./FileBrowser.js";
import {InMemoryGitLab} from "../GitLab.js"
import { NO_FILES_TEXT, HTMLHasText, getHTMLElementWithText, wait, joinFilePaths, isAFolderOf } from "../HelperFunctions.js";

const TEST_FILE = "CampaignA/IP1/my_file";
const TEST_FILE2 = "CampaignB/IP1/my_file";
const TEST_NO_FILE_FOLDER = "201707_ATLAS_DryRun/IP8";
const TEST_FOLDER_FILE = "201606_muscan/IP1/fallback/muScan_x_stdrd.txt";
const TEST_FOLDER = "201908_Test_Campaign/IP1";

async function getNewFileBrowser(gitlab) {
    let fb = new FileBrowser();
    fb.gitlab = gitlab;
    //fb.style.display = "none";
    document.body.appendChild(fb);
    await fb.loadedPromise;

    return fb;
}

describe("FileBrowser", () => {
    /** @type {FileBrowser} */
    let fb;
    const testGitLab = new InMemoryGitLab([
        {name: "CampaignA", path: "CampaignA", type: "tree"},
        {name: "IP1", path: "CampaignA/IP1", type: "tree"},
        {name: "my_file", path: "CampaignA/IP1/my_file", type: "blob"},
        {name: "CampaignB", path: "CampaignB", type: "tree"},
        {name: "IP1", path: "CampaignB/IP1", type: "tree"},
        {name: "my_file", path: "CampaignB/IP1/my_file", type: "blob"}
    ])

    beforeEach(async () => {
        // @ts-ignore
        fb = await getNewFileBrowser(testGitLab);
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

        getHTMLElementWithText(fb, folderName).click();
        await wait(1); // wait for async to resolve
        const hasFile1 = HTMLHasText(fb, fileName);
        getHTMLElementWithText(fb, folderName).click();
        await wait(1);
        const hasFile2 = HTMLHasText(fb, fileName);

        expect(hasFile1).not.toBe(hasFile2);
    })

    it("Can open the create-file-window window", async () => {
        const newFileButton = getHTMLElementWithText(fb, "New file");
        newFileButton.click();
        expect(fb.shadowRoot.querySelector("create-file-window")).not.toBeNull();
    })

    xit("Can create, rename and delete in one", async () => {
        await fb.setOpenFile(TEST_FOLDER);
        const TEST_FILENAME = "my_file.txt";
        const RENAMED_FILENAME = "my_new_file.txt";
        const FULL_FILEPATH = joinFilePaths(TEST_FOLDER, TEST_FILENAME);
        const FULL_NEW_FILEPATH = joinFilePaths(TEST_FOLDER, RENAMED_FILENAME);
        
        await fb.tryCreateEmptyFile(TEST_FOLDER, TEST_FILENAME);
        await wait(1);
        expect(HTMLHasText(fb, TEST_FILENAME)).toBeTruthy();
        
        const renameChangeSpy = jasmine.createSpy("renameChangeSpy");
        spyOn(window, "prompt").and.callFake(() => RENAMED_FILENAME);
        await fb.onRenameButtonPressed(FULL_FILEPATH, false, renameChangeSpy);
        await wait(1);
        expect(renameChangeSpy).toHaveBeenCalled();
        expect(HTMLHasText(fb, TEST_FILENAME)).not.toBeTruthy();
        expect(HTMLHasText(fb, RENAMED_FILENAME)).toBeTruthy();

        const deleteChangeSpy = jasmine.createSpy("deleteChangeSpy");
        spyOn(window, "confirm").and.callFake(() => true);
        await fb.onDeleteButtonPressed(FULL_NEW_FILEPATH, false, deleteChangeSpy);
        await wait(1);
        expect(deleteChangeSpy).toHaveBeenCalled();
        expect(HTMLHasText(fb, RENAMED_FILENAME)).not.toBeTruthy();
    })
})