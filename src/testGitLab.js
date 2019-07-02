import GitLab from "./GitLab.js"

describe("GitLab", () => {
    /** @type {GitLab} */
    let gitlab;
    beforeEach(async () => {
        const token = (await (await fetch("../secrets.json")).json()).token;
        gitlab = new GitLab(token, "vdm-editor-test");
    })

    it("can get files", async () => {
        expect(await gitlab.getFile(
            "201605_VdM",
            5,
            "HobbitCrossing.txt"
        )).toEqual(jasmine.any(String))
    })

    it("doesn't get incorrect files", async () => {
        expect(await gitlab.getFile(
            "no_file",
            -9,
            "DoesntExist.txt"
        ).catch(() => -1)).toBe(-1)
    })
})