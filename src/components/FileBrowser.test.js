import FileBrowser from "./FileBrowser.js";
import GitLab from "../GitLab.js";
import { NO_FILES_TEXT, HTMLHasText, getHTMLElementWithText, wait } from "../HelperFunctions.js";

const TEST_FILE = "201806_VdM/IP8/lhcb_1st_part_MAIN_Jun2018.txt";
const TEST_FILE_CONTENT = "0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1) PLANE(SEPARATION) UNITS(SIGMA)\n1 RELATIVE_TRIM IP1 BEAM1 SEPARATION 0.0 SIGMA\n2 END_SEQUENCE\n";
const TEST_NO_FILE_FOLDER = "201707_ATLAS_DryRun/IP8";

/**
 * @param {GitLab} [gitlab]
 */
async function getNewFileBrowser(gitlab) {
    let fb = new FileBrowser();
    fb.gitlab = gitlab;
    fb.style.display = "none";
    document.body.appendChild(fb);

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

    it("Can set ip and campaign", async () => {
        const [campaign, ip, fileName] = TEST_FILE.split("/");

        await fb.setOpenFile(TEST_FILE);
        await wait(1000);
        // @ts-ignore
        expect(getHTMLElementWithText(fb, ip).selected).toBeTruthy();
        // @ts-ignore
        expect(getHTMLElementWithText(fb, campaign).selected).toBeTruthy();
        expect(HTMLHasText(fb, fileName)).toBeTruthy();
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
})