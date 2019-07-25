import { gFetch } from "./HelperFunctions.js"

const URL_START = "https://gitlab.cern.ch/api/v4/projects/72000"

export default class GitLab {
    /**
     * 
     * @param {string} token 
     */
    constructor(token, branch = "master", oauth = false) {
        if (oauth) {
            this.authHeader = {
                "Authorization": `Bearer ${token}`
            }
        }
        else {
            this.authHeader = {
                'Private-Token': token
            }
        }
        /** @private */
        this.token = token;
        /** @private */
        this.branch = branch;
    }

    /**
     * Returns the plaintext of the given file
     * 
     * @param {string} filePath
     */

    async readFile(filePath) {
        return await (
            await gFetch(
                `${URL_START}/repository/files/${
                encodeURIComponent(filePath)
                }/raw?ref=${this.branch}`,
                { headers: new Headers(this.authHeader) }
            )
        ).text();
    };

    /**
     * 
     * @param {string} filePath
     * @param {string} commitMessage 
     * @param {string} fileText 
     */
    async writeFile(filePath, commitMessage, fileText) {
        await gFetch(
            `${URL_START}/repository/commits`,
            {
                headers: new Headers({
                    ...this.authHeader,
                    'Content-Type': 'application/json'
                }),
                method: "POST",
                body: JSON.stringify({
                    branch: this.branch,
                    commit_message: commitMessage,
                    actions: [{
                        action: "update",
                        file_path: filePath,
                        content: fileText
                    }]
                })
            }
        )
    }

    /**
     * 
     * @param {string} filePath
     * @param {string} commitMessage 
     */
    async createFile(filePath, commitMessage) {
        await gFetch(
            `${URL_START}/repository/commits`,
            {
                headers: new Headers({
                    ...this.authHeader,
                    'Content-Type': 'application/json'
                }),
                method: "POST",
                body: JSON.stringify({
                    branch: this.branch,
                    commit_message: commitMessage,
                    actions: [{
                        action: "create",
                        file_path: filePath,
                        content: ''
                    }]
                })
            }
        )
    }

    async listCampains() {
        return await this.listFiles('/');
    }

    /**
     * @param {string} campain
     */
    async listIPs(campain) {
        return await this.listFiles(campain);
    }

    /**
     * 
     * @param {string} path 
     */
    async listFiles(path) {
        const perPage = 100;
        const page = await gFetch(
            `${URL_START}/repository/tree?ref=${this.branch}&per_page=${perPage}&page=1&path=${path}`,
            {
                headers: new Headers(this.authHeader)
            }
        )
        let fileList = (await page.json()).map(x => x.name);
        let lastPage = Math.ceil(parseInt(page.headers.get('X-Total')) / perPage);
        for (let i = 2; i <= lastPage; i++) {
            const page = await gFetch(
                `${URL_START}/repository/tree?ref=${this.branch}&per_page=${perPage}&page=${i}&path=${path}`,
                {
                    headers: new Headers(this.authHeader)
                }
            );
            fileList = fileList.concat((await page.json()).map(x => x.name));
        }
        /**
         * @param {string} x
         */
        return fileList.filter(x => x != 'readme.md')
    }
}