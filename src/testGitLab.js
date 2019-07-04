import GitLab from "./GitLab.js"

describe("GitLab", () => {
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

    it("can get files", async () => {
        expect(await gitlab.readFile(
            "201605_VdM",
            5,
            "HobbitCrossing.txt"
        )).toEqual(jasmine.any(String))
    })

    it("doesn't get incorrect files", async () => {
        expect(await gitlab.readFile(
            "no_file",
            -9,
            "DoesntExist.txt"
        ).catch(() => -1)).toBe(-1)
    })

    it("can commit something", async () => {
        expect(await gitlab.writeFile(
            "201605_VdM",
            5,
            "TestFile.txt",
            "Test commit",
            Math.random().toString()
        )).toBeUndefined()
    })

    it('listing campains', async () => {
        expect(await gitlab.listCampains()).toEqual(jasmine.any(Array))
    })

    it("listing IPs", async () => {
        expect(await gitlab.listIPs('201605_VdM')).toEqual(jasmine.any(Array))
    })

    xit("can create something", async () => {
        expect(await gitlab.createFile(
            "201605_VdM",
            5,
            Math.random().toString(),
            "Test create",
        )).toBeUndefined()
    })
})