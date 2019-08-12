// @ts-check
import { html, css, joinFilePaths, preventSelectCSS, NO_FILES_TEXT, getRelativePath } from "../HelperFunctions.js";
import { NoPathExistsError, default as GitLab, FileAlreadyExistsError } from "../GitLab.js";
import './IPCampaignSelectors.js';
import "./CreateFileWindow.js";
import './Triangle.js';
import "./ContextMenu.js"

const styling = css`
* {
    font-family: sans-serif;
}
#file-browser {
    border: 1px solid #a2a2a2;
    padding: 3px;
    background-color: #d6d6d6;
    overflow: hidden;
}
#folder-name {
    font-weight: bold;
    padding: 3px;
}

.item {
    background-color: #ededed;
    padding: 3px;
    font-size: 14px;
    cursor: pointer;
    overflow: hidden;
    white-space: nowrap;
}

.no-files-item {
    cursor: default;
}

.item-open {
    font-weight: bold;
}

#file-browser .item:nth-of-type(2n) {
    background-color: white;
}

.folder-name {
    padding-left: 14px;
}

.folder-content{
    margin-left: 15px;
}

* {
    ${preventSelectCSS}
}

.folder-content > div {
    border-bottom: 1px solid grey;
}
`

export default class FileBrowser extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.openFile = null;
        /** @type GitLab */
        this.gitlab = null;
        /** @type {HTMLDivElement} */
        this.myContextMenu = null;
        this.isCommitted = true;
        this.fileStructure = {
            files: [],
            folders: new Map()
        };

        document.body.addEventListener("mousedown", /**@type MouseEvent*/event => {
            if (this.myContextMenu !== null && !(event.composedPath().includes(this.myContextMenu))) {
                this.myContextMenu = null;
                this.render();
            }
        });
    }

    /**
     * @param {GitLab} gitlab
     * @param {string} openFile The current open file, as path relative to the current explored folder
     */
    async passInValues(gitlab, openFile) {
        this.gitlab = gitlab;
        this.openFile = openFile;

        this.campaigns = await this.gitlab.listCampaigns();
        this.ip = "IP1";
        this.campaign = this.campaigns[0];

        await this.refreshFileList();
        this.render();
    }

    async refreshFileList() {
        try {
            this.fileStructure = await this.gitlab.listFiles(`${this.campaign}/${this.ip}`);
        }
        catch (error) {
            if (error instanceof NoPathExistsError) {
                this.fileStructure = { files: [NO_FILES_TEXT], folders: new Map() };
            }
            else {
                throw error;
            }
        }

        this.render();
    }

    async onDeleteButtonPressed(filePath, isFolder, markAsPending){
        try{
            if (!confirm(`Are you sure you want to delete the file ${filePath}?`)) return;

            markAsPending();

            if (isFolder) {
                await this.gitlab.deleteFolder(filePath);
            } else {
                await this.gitlab.deleteFile(filePath);
            }
    
            if (this.openFile == filePath) {
                this.dispatchEvent(new CustomEvent("open-file", {
                    detail: null
                }));
    
                this.openFile = null;
            }
        }
        finally{
            this.myContextMenu = null;
            this.render();
        }
    }

    async onRenameButtonPressed(filePath, isFolder, markAsPending){
        try{
            if(!this.isCommitted){
                alert("Cannot rename a file without committing the current changes");
                return;
            }

            const newName = prompt(`What do you want to rename ${filePath.split("/").slice(2).join('/')} to? (including sub-folder path)`);
            if(newName == null) return;

            if (newName.includes(" ")) {
                alert("Invalid name, paths cannot contain spaces");
                return;
            }

            markAsPending();

            if (isFolder) {
                await this.gitlab.renameFolder(filePath, newName);
            } else {
                await this.gitlab.renameFile(filePath, newName);
            }

            if(this.openFile == filePath){
                const fullNewName = `${this.campaign}/${this.ip}/${newName}`;

                this.dispatchEvent(new CustomEvent("open-file", {
                    detail: fullNewName
                }));

                this.openFile = fullNewName;
            }
        }
        finally{
            this.myContextMenu = null;
            this.render();
        }
    }

    /**
     * @param {MouseEvent} event
     * @param {string} filePath This is the full filepath to the file.
     * @param {boolean} isFolder
     */
    onContextMenu(event, filePath, isFolder) {
        this.myContextMenu = wire()`
            <context-menu 
                x=${event.clientX}
                y=${event.clientY}
                buttons=${[
                    {
                        name: "Delete",
                        pendingMessage: "Deleting ...",
                        onActivate: (markAsPending) => this.onDeleteButtonPressed(filePath, isFolder, markAsPending)
                    },
                    {
                        name: "Rename",
                        pendingMessage: "Renaming ...",
                        onActivate: (markAsPending) => this.onRenameButtonPressed(filePath, isFolder, markAsPending)
                    },
                ]}
            ></context-menu>
        `
        this.render();

        event.preventDefault();
    }

    /**
     * @param {string} source
     * @param {string} ip
     * @param {string} campaign
     * @param {string[]} files
     */
    async tryCopyFolder(source, ip, campaign, files = []) {
        if (!confirm(`Are you sure you want to copy files from the campaign "${campaign}" and interaction point "${ip}"?`)) {
            return;
        }

        const fromFolder = campaign + "/" + ip;
        const toFolder = source;

        let toFolderContents
        let fromFolderContents

        try {
            toFolderContents = (await this.gitlab.listFiles(toFolder, true, false)).map(x => getRelativePath(x, fromFolder));
        } catch (error) {
            if (error instanceof NoPathExistsError) toFolderContents = []
            else throw error
        }
        try {
            fromFolderContents = (await this.gitlab.listFiles(fromFolder, true, false)).map(x => getRelativePath(x, fromFolder));
            const commonFileNames = fromFolderContents.filter(x => toFolderContents.includes(x));
            if (commonFileNames.length != 0) {
                alert(`Note:\n"${commonFileNames.join(", ")}"\nare in common with the source and destination folders, and will not be copied.`)
            }
            await this.gitlab.copyFilesFromFolder(
                fromFolder,
                toFolder, // remove the end slash from the folder name
                files
            )
        }
        catch (error) {
            if (error instanceof NoPathExistsError) {
                alert(`The campaign "${campaign}" and interaction point "${ip}" has no files.`);
                return;
            }
            else throw error;
        }
    }

    /**
     * @param {{ files: string[]; folders: Map<string, any>, isFolderOpen?: boolean }} fileStructure
     * @param {string} ip
     * @param {string} campaign
     */
    async getFileUI(fileStructure, ip, campaign) {
        /**
         * @param {{ files: string[]; folders: Map<string, any>, isFolderOpen?: boolean }} _structure
         */
        const getElementFromStructure = (_structure, prefix="") => {
            return wire([fileStructure, ip, campaign])`
                <div>
                    ${_structure.files.map(fileName => {
                        const fullFilePath = joinFilePaths(prefix, fileName);
                        const isOpenFile = fullFilePath == this.openFile;

                        return wire()`<div
                            onclick=${() => {
                                if(fullFilePath == NO_FILES_TEXT) return;
                                this.onFileClick(fullFilePath);
                                this.render();
                            }}
                            oncontextmenu=${event => {
                                if(fullFilePath == NO_FILES_TEXT) return; 
                                this.onContextMenu(event, fullFilePath, false)
                            }}
                            class="${isOpenFile?"item-open":""} item ${fileName == NO_FILES_TEXT?"no-files-item":""}">
                                ${fileName}</div>`

                    })}
                    ${Array.from(_structure.folders.entries()).map((folderParts) => {
                        const [folderName, folderContent] = folderParts;
                        const isFolderOpen = _structure.isFolderOpen;

                        return wire()`
                            <div onclick=${() => {_structure.isFolderOpen = !_structure.isFolderOpen; this.render()}} class="item folder">
                                <folder-triangle open=${isFolderOpen}></folder-triangle>
                                <span class="folder-name">${folderName}</span>
                            </div>
                            <span style="display:block" class="folder-content">
                                ${
                                    isFolderOpen?getElementFromStructure(folderContent, joinFilePaths(prefix,  folderName)):undefined
                                }
                            </span>
                        `
                    })}
                    <div onclick=${() => this.clickNewFile()} class="item" style="font-weight: bold">
                        <span style="font-size: 20px; vertical-align: middle; padding: 0px 0px 0px 0px;">
                            +
                        </span>
                        <span>
                            New file(s)
                        </span>
                    </div>
                </div>
            `
        }

        return getElementFromStructure(fileStructure, joinFilePaths(campaign, ip));
    }

    clickNewFile(containingFolder) {
        this.createFileWindow = wire()`
            <create-file-window
                onsubmit=${async event => {
                    try {
                        await this.tryCopyFolder(containingFolder, event.detail.ip, event.detail.campaign, event.detail.filePaths);
                    }
                    finally {
                        this.createFileWindow = undefined;
                        this.render();
                    }

                    this.render();
                }}
                oncancel=${
                    () => {
                        this.createFileWindow = undefined;
                        this.render();
                    }
                }
                oncreateEmpty=${async event => {
                    try {
                        await this.gitlab.createFile(containingFolder + event.detail);
                    }
                    catch (error) {
                        if (error instanceof FileAlreadyExistsError) {
                            alert(`Cannot create the empty file ${event.detail}, it already exists`);
                            return;
                        }
                        else {
                            throw error;
                        }
                    }
                    finally {
                        this.createFileWindow = undefined;
                        this.render();
                    }
                }}
            />`
            
        this.render();
    }

    /**
     * @param {string} fullFileName
     */
    onFileClick(fullFileName) {
        if (!this.isCommitted) {
            if (confirm(`Changes not committed. Are you sure you want to open ${fullFileName}? All current changes will be discarded.`)) {
                this.dispatchEvent(new CustomEvent('open-file', {
                    detail: fullFileName,
                }))
            }
            else {
                return;
            }
        }
        else {
            this.dispatchEvent(new CustomEvent('open-file', {
                detail: fullFileName,
            }))
        }

        this.openFile = fullFileName;
    }

    /**
     * @param {MouseEvent} event
     */
    handleEvent(event){
        this[event.currentTarget.name] = event.currentTarget.value;
        this.dispatchEvent(new CustomEvent("change"));
        this.render();
    }

    render() {
        hyper(this.root)`
        <style>
            ${styling}
        </style>
        <selection-boxes allCampaigns=${this.campaigns} onchange=${this}>
        </selection-boxes>
        <hr />
        <div id="file-browser">
            ${this.getFileUI(this.fileStructure, this.ip, this.campaign)}
        </div>
        ${this.myContextMenu}
        ${this.createFileWindow}
        `
    }
}
customElements.define('file-browser', FileBrowser);