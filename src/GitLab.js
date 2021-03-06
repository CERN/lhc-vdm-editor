import { gFetch, getRelativePath, mergeMaps, awaitArray } from "./HelperFunctions.js";

export class NoPathExistsError extends Error {
    constructor(message = "No Path exists") {
        super(message);
    }
}
export class FileAlreadyExistsError extends Error {
    constructor(message = "File already exists") {
        super(message);
    }
}

export default class GitLab {
    /**
     *
     * @param {string} token
     */
    constructor(token, branch="master", oauth=false, urlStart="https://gitlab.cern.ch/api/v4/projects/72000") {
        if (oauth) {
            this.authHeader = {
                "Authorization": `Bearer ${token}`
            };
        }
        else {
            this.authHeader = {
                "Private-Token": token
            };
        }
        /** @private */
        this.token = token;
        /** @private */
        this.branch = branch;
        /** @private */
        this.urlStart = urlStart;
    }

    /**
     * Returns the plaintext of the given file
     *
     * @param {string} filePath
     */

    async readFile(filePath) {
        try {
            return await (
                await gFetch(
                    `${this.urlStart}/repository/files/${
                    encodeURIComponent(filePath)
                    }/raw?ref=${this.branch}`,
                    { headers: new Headers(this.authHeader) }
                )
            ).text();
        }
        catch (error) {
            if (error instanceof Response && (await error.json()).message == "404 File Not Found") {
                throw new NoPathExistsError(`${filePath} does not exist`);
            }
            else throw error;
        }
    }

    /**
     *
     * @param {string} filePath
     * @param {string} commitMessage
     * @param {string} fileText
     */
    async writeFile(filePath, commitMessage, fileText) {
        await gFetch(
            `${this.urlStart}/repository/commits`,
            {
                headers: new Headers({
                    ...this.authHeader,
                    "Content-Type": "application/json"
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
        );
    }

    /**
     *
     * @param {string} filePath
     */
    async createFile(filePath) {
        try {
            await gFetch(
                `${this.urlStart}/repository/commits`,
                {
                    headers: new Headers({
                        ...this.authHeader,
                        "Content-Type": "application/json"
                    }),
                    method: "POST",
                    body: JSON.stringify({
                        branch: this.branch,
                        commit_message: `Create file ${filePath}`,
                        actions: [{
                            action: "create",
                            file_path: filePath,
                            content: ""
                        }]
                    })
                }
            );
        }
        catch (error) {
            if (error instanceof Response && (await error.clone().json()).message == "A file with this name already exists") {
                throw new FileAlreadyExistsError();
            }
            else {
                throw error;
            }
        }
    }

    async listCampaigns() {
        return Array.from((await this.listFiles("/", false)).folders.keys());
    }

    /**
     * @param {string} campaign
     */
    async listIPs(campaign) {
        return Array.from((await this.listFiles(campaign, false)).folders.keys());
    }

    /**
     * @param {string} path
     * @param {boolean} recursive
     * @param {boolean} returnStructure whether to return a structure of type
     *  {files: string[], folders: Map<string, Structure>}. Note, if this is false,
     *  only file paths are returned, not folders
     */
    async listFiles(path, recursive = true, returnStructure = true) {
        const perPage = 100;
        const page = await gFetch(
            `${this.urlStart}/repository/tree?ref=${this.branch}&per_page=${perPage}&page=1&path=${
            path}&recursive=${recursive}`,
            {
                headers: new Headers(this.authHeader)
            }
        );

        function getStructureFolder(filePath, root) {
            let currentFolder = root;

            for (let folder of filePath.split("/").filter(x => x != "").slice(0, -1)) {
                currentFolder = currentFolder.folders.get(folder);
            }

            return currentFolder;
        }

        /**
         * @param {object[]} fileList
         */
        function getGitLabFileStructure(fileList) {
            let structure = { files: [], folders: new Map() };

            for (let item of fileList) {
                const relativeFilePath = getRelativePath(item.path, path);

                if (item.type == "blob") {
                    getStructureFolder(relativeFilePath, structure).files.push(item.name);
                }
                else if (item.type == "tree") {
                    getStructureFolder(relativeFilePath, structure).folders.set(item.name, { files: [], folders: new Map() });
                }
                else {
                    throw Error(`Unknown type ${item.type}`);
                }
            }

            return structure;
        }

        let fileList = await page.json();

        if (fileList.length == 0) {
            throw new NoPathExistsError(`Invalid path ${path} (GitLab request returned no information)`);
        }

        let lastPage = Math.ceil(parseInt(page.headers.get("X-Total")) / perPage);

        for (let i = 2; i <= lastPage; i++) {
            const page = await gFetch(
                `${this.urlStart}/repository/tree?ref=${this.branch}&per_page=${perPage}&page=${i}&path=${
                path}&recursive=${recursive}`,
                {
                    headers: new Headers(this.authHeader)
                }
            );

            fileList = fileList.concat(await page.json());
        }

        if (returnStructure) {
            return getGitLabFileStructure(fileList);
        }
        else {
            return fileList.filter(x => x.type == "blob")
                .map(x => x.path);
        }
    }

    /**
     * @param {string} fromFolder
     * @param {string} toFolder
     * @param {string[]} fileArr
     */
    async copyFilesFromFolder(fromFolder, toFolder, fileArr = []) {
        const fromFolderContents = (fileArr.length > 0 ? fileArr : await this.listFiles(fromFolder, true, false)).map(x => getRelativePath(x, fromFolder));
        let toFolderContents;
        try { toFolderContents = (await this.listFiles(toFolder, true, false)).map(x => getRelativePath(x, toFolder)); }
        catch (error) {
            if (error instanceof NoPathExistsError) {
                toFolderContents = [];
            }
            else {
                throw error;
            }
        }

        const actions = (await awaitArray(fromFolderContents.filter(x => !toFolderContents.includes(x))
            .map(async filePath => ({
                action: "create",
                file_path: toFolder + "/" + filePath,
                content: await this.readFile(fromFolder + "/" + filePath)
            }))
        ));

        await gFetch(
            `${this.urlStart}/repository/commits`,
            {
                headers: new Headers({
                    ...this.authHeader,
                    "Content-Type": "application/json"
                }),
                method: "POST",
                body: JSON.stringify({
                    branch: this.branch,
                    commit_message: `Copy files from ${fromFolder} to ${toFolder}`,
                    actions: actions
                })
            }
        );
    }

    /**
     * @param {string} filePath
     */
    async deleteFile(filePath) {
        await gFetch(
            `${this.urlStart}/repository/commits`,
            {
                headers: new Headers({
                    ...this.authHeader,
                    "Content-Type": "application/json"
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
        );
    }

    async deleteFolder(path) {
        const filePaths = await this.listFiles(path, true, false);
        for (let file of filePaths) {
            await this.deleteFile(file);
        }
    }

    /**
     * @param {string} filePath
     * @param {string} newName
     */
    async renameFile(filePath, newName) {
        const newFilePath = filePath.split("/").slice(0, 2).
            concat([newName]).join("/");

        await gFetch(
            `${this.urlStart}/repository/commits`,
            {
                headers: new Headers({
                    ...this.authHeader,
                    "Content-Type": "application/json"
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
        );
    }

    async renameFolder(path, newName) {
        const filePaths = await this.listFiles(path, true, false);
        for (let file of filePaths) {
            await this.renameFile(file, `${newName}/${file.split(path + "/").pop()}`);
        }
    }
}

window.GitLab = GitLab;
