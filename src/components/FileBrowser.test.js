import FileBrowser from "./FileBrowser.js";
import GitLab from "../GitLab.js";
import { wait } from "../HelperFunctions.js";

const TEST_FILE = "201806_VdM/IP8/lhcb_1st_part_MAIN_Jun2018.txt";
const TEST_FILE_CONTENT = "0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1) PLANE(SEPARATION) UNITS(SIGMA)\n1 RELATIVE_TRIM IP1 BEAM1 SEPARATION 0.0 SIGMA\n2 END_SEQUENCE\n";

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
    let fakeLocalStorage;
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
})