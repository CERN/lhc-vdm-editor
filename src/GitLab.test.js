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
            "201605_VdM/IP5/HobbitCrossing.txt",
        )).toEqual(jasmine.any(String))
    })

    it("doesn't get incorrect files", async () => {
        expect(await gitlab.readFile(
            "KJSNDKJASDK_not_a_file.txt",
        ).catch(() => -1)).toBe(-1)
    })

    it("can commit something", async () => {
        expect(await gitlab.writeFile(
            "201605_VdM/IP5/TestFile.txt",
            "Test commit",
            Math.random().toString()
        )).toBeUndefined()
    })

    it('listing campaigns', async () => {
        expect(await gitlab.listCampaigns()).toEqual(jasmine.any(Array))
    })

    it("listing IPs", async () => {
        expect(await gitlab.listIPs('201605_VdM')).toEqual(jasmine.any(Array))
    })

    it("can create and delete something", async () => {
        const fileName = `201605_VdM/IP5/${Math.random()}`;

        expect(await gitlab.createFile(
            fileName
        )).toBeUndefined()

        expect(await gitlab.deleteFile(
            fileName
        )).toBeUndefined()
    })

    it("can copy a folder then delete it", async () => {
        await gitlab.copyFilesFromFolder(
            "201610_CrossingAngleScan/IP1/backup",
            "201610_CrossingAngleScan/IP2"
        );

        await gitlab.readFile("201610_CrossingAngleScan/IP2/ATLAS_SEP_4.9sigma_15steps.txt");

        await gitlab.deleteFolder("201610_CrossingAngleScan/IP2");

        let thrown = false;
        try{
            await gitlab.readFile("201610_CrossingAngleScan/IP2/backup/ATLAS_SEP_4.9sigma_15steps.txt");
        } catch {thrown = true}

        expect(thrown).toBeTruthy();
    })
})