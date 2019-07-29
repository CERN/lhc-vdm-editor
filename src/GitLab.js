import { gFetch, getRelativePath, mergeMaps } from "./HelperFunctions.js"

const URL_START = "https://gitlab.cern.ch/api/v4/projects/72000"

export class NoPathExistsError extends Error {}

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
     */
    async createFile(filePath) {
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
                    commit_message: `Create file ${filePath}`,
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
        return Array.from((await this.listFiles('/', false)).folders.keys());
    }

    /**
     * @param {string} campain
     */
    async listIPs(campain) {
        return Array.from((await this.listFiles(campain, false)).folders.keys());
    }

    /**
     * @param {string} path
     * @param {boolean} recursive
     * @returns {Promise<{files: string[], folders: Map<string, any>}>}
     */
    async listFiles(path, recursive=true) {
        const perPage = 100;
        const page = await gFetch(
            `${URL_START}/repository/tree?ref=${this.branch}&per_page=${perPage}&page=1&path=${
                    path}&recursive=${recursive}`,
            {
                headers: new Headers(this.authHeader)
            }
        )

        
        function getStructureFolder(filePath, root){
            let currentFolder = root;

            for(let folder of filePath.split("/").filter(x => x != "").slice(0, -1)){
                currentFolder = currentFolder.folders.get(folder);
            }

            return currentFolder;
        }

        /**
         * @param {object[]} fileList
         */
        function addFilesFromGitLab(fileList){
            let structure = { files: [], folders: new Map() };

            for(let item of fileList){
                const relativeFilePath = getRelativePath(item.path, path);
                
                if(item.type == "blob"){
                    getStructureFolder(relativeFilePath, structure).files.push(item.name);
                }
                else if(item.type == "tree"){
                    getStructureFolder(relativeFilePath, structure).folders.set(item.name, {files: [], folders: new Map()});
                }
                else {
                    throw Error(`Unknown type ${item.type}`)
                }
            }

            return structure;
        }

        let fileStructure = addFilesFromGitLab(await page.json());
        let lastPage = Math.ceil(parseInt(page.headers.get('X-Total')) / perPage);

        for (let i = 2; i <= lastPage; i++) {
            const page = await gFetch(
                `${URL_START}/repository/tree?ref=${this.branch}&per_page=${perPage}&page=${i}&path=${
                    path}&recursive=${recursive}`,
                {
                    headers: new Headers(this.authHeader)
                }
            );

            const newFS = addFilesFromGitLab(await page.json());

            fileStructure = {
                files: fileStructure.files.concat(newFS.files),
                folders: mergeMaps(fileStructure.folders, newFS.folders)
            }
        }

        if(fileStructure.files.length == 0 && Array.from(fileStructure.folders.entries()).length == 0){
            throw new NoPathExistsError(`Invalid path ${path} (GitLab request returned no information)`)
        }

        return fileStructure;
    }

    /**
     * @param {string} filePath
     */
    async deleteFile(filePath){
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
                    commit_message: `Delete file ${filePath}`,
                    actions: [{
                        action: "delete",
                        file_path: filePath
                    }]
                })
            }
        )
    }

    /**
     * @param {string} filePath
     * @param {string} newName
     */
    async renameFile(filePath, newName){
        const newFilePath = filePath.split("/").slice(0, -1).
            concat([newName]).join("/");

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
                    commit_message: `Rename ${filePath} to ${newName}`,
                    actions: [{
                        action: "move",
                        previous_path: filePath,
                        file_path: newFilePath
                    }]
                })
            }
        )
    }
}

window.GitLab = GitLab;