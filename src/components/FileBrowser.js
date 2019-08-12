// @ts-check
import { html, css, joinFilePaths, preventResizeCSS, NO_FILES_TEXT, getRelativePath } from "../HelperFunctions.js";
import { NoPathExistsError, default as GitLab, FileAlreadyExistsError } from "../GitLab.js";
import './IPCampaignSelectors.js';
import "./CreateFileWindow.js";
import './Triangle.js';

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
    ${preventResizeCSS}
}

.context-menu {
    position: fixed;
    background-color: #fbfbfb;
    border: #c1c1c1 solid 2px;
    z-index: 100000;
}

.context-menu-item.disabled {
    color: #949494;
    background-color: #f1f1f1;
    cursor: not-allowed;
}

.context-menu-item {
    padding: 8px;
    padding-right: 11px;
    border-top: #c1c1c1 solid 1px;
}

.context-menu-item:first-child {
    border-top: none;
}

.context-menu-item:hover{
    background-color: #e6e6e6;
}

.context-menu-item:active{
    background-color: #cccccc;
}

.folder-content > div {
    border-bottom: 1px solid grey;
}
`

export default class FileBrowser extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this._openFile = null;
        /** @type GitLab */
        this.gitlab = null;
        /** @type {HTMLDivElement} */
        this.myContextMenu = null;
        this.isCommitted = true;
        this.fileStructure = {
            files: [],
            folders: new Map()
        }

        this.render();

        this.selectionBoxes.addEventListener("change", () => this.refreshFileList());

        document.body.addEventListener("mousedown", /**@type MouseEvent*/event => {
            if (this.myContextMenu !== null && !(event.composedPath().includes(this.myContextMenu))) {
                this.tryRemoveContextMenu();
            }
        });
    }

    set openFile(newValue){
        this._openFile = newValue;
    }

    get openFile(){
        return this._openFile;
    }

    /**
     * @param {GitLab} gitlab
     * @param {string} openFile The current open file, as path relative to the current explored folder
     */
    async passInValues(gitlab, openFile) {
        this.gitlab = gitlab;

        // NOTE: we need to await this to make sure the campaign list is populated
        // TODO: make this nicer
        await this.selectionBoxes.passInValues(
            gitlab,
        );

        await this.setOpenFile(openFile);
        await this.refreshFileList();
    }

    /**
     * @param {string} newOpenFile
     */
    async setOpenFile(newOpenFile) {
        this.openFile = newOpenFile;
        if (this.openFile != null) {
            this.selectionBoxes.campaign = this.openFile.split("/")[0];
            this.selectionBoxes.ip = this.openFile.split("/")[1];
        }
    }

    get selectionBoxes(){
        return this.root.querySelector("selection-boxes");
    }

    get ip() {
        if(this.selectionBoxes == null) return "";
        return this.selectionBoxes.ip;
    }

    get campaign() {
        if(this.selectionBoxes == null) return "";
        return this.selectionBoxes.campaign;
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

    tryRemoveContextMenu() {
        if (this.myContextMenu !== null) {
            this.root.removeChild(this.myContextMenu);
            this.myContextMenu = null;
        }
    }

    /**
     * @param {MouseEvent} event
     * @param {string} fullFilePath This is the full filepath to the file.
     * @param {boolean} isFolder
     */
    onContextMenu(event, fullFilePath, isFolder) {
        const container = document.createElement("div");
        container.innerHTML = html`<div style="top: ${event.clientY}px; left: ${event.clientX}px" class="context-menu">
            <div id="delete-button" class="context-menu-item">Delete</div>
            <div id="rename-button" class="context-menu-item">Rename</div>
        </div>`;
        this.root.appendChild(container);

        const deleteButton = container.querySelector("#delete-button");
        const renameButton = container.querySelector("#rename-button");

        deleteButton.addEventListener("click", () => {
            (async () => {
                try{
                    if (confirm(`Are you sure you want to delete the file ${fullFilePath}?`)) {
                        deleteButton.innerText = "Deleting...";

                        deleteButton.classList.add("disabled");
                        renameButton.classList.add("disabled");

                        if (isFolder) {
                            await this.gitlab.deleteFolder(fullFilePath);
                        } else {
                            await this.gitlab.deleteFile(fullFilePath);
                        }
                    }

                    if (this.openFile == fullFilePath) {
                        this.dispatchEvent(new CustomEvent("open-file", {
                            detail: null
                        }));

                        this.openFile = null;
                    }

                    this.refreshFileList();
                }
                finally{
                    this.tryRemoveContextMenu();
                }
            })();

        })

        container.querySelector("#rename-button").addEventListener("click", () => {
            try{
                if(!this.isCommitted){
                    alert("Cannot rename a file without committing the current changes");
                    return;
                }

                const newName = prompt(`What do you want to rename ${fullFilePath.split("/").slice(2).join('/')} to? (including sub-folder path)`);
                if (newName !== null) {
                    if (newName.includes(" ")) {
                        alert("Invalid name, paths cannot contain spaces");
                    }
                    else {
                        (async () => {
                            container.querySelector("#delete-button").innerText = "Renaming ...";

                            deleteButton.classList.add("disabled");
                            renameButton.classList.add("disabled");

                            if (isFolder) {
                                await this.gitlab.renameFolder(fullFilePath, newName);
                            } else {
                                await this.gitlab.renameFile(fullFilePath, newName);
                            }

                            if(this.openFile == fullFilePath){
                                const fullNewName = `${this.campaign}/${this.ip}/${newName}`;

                                this.dispatchEvent(new CustomEvent("open-file", {
                                    detail: fullNewName
                                }));
    
                                this.openFile = fullNewName;
                            }

                            this.refreshFileList();
                        })()
                    }
                }
            }
            finally{
                this.tryRemoveContextMenu();
            }
        })

        this.myContextMenu = container;

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
            return wire()`
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
        const createFileWindow = (wire()`
            <create-file-window
                onsubmit=${async event => {
                    try {
                        await this.tryCopyFolder(containingFolder, event.detail.ip, event.detail.campaign, event.detail.filePaths);
                    }
                    finally {
                        this.root.removeChild(createFileWindow);
                    }

                    this.render();
                }}
                oncancel=${
                    () => this.root.removeChild(createFileWindow)
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
                        this.root.removeChild(createFileWindow);
                    }

                    this.render();
                }}

            ></create-file-window>
        `)

        this.root.appendChild(createFileWindow);
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

    render() {
        hyper(this.root)`
        <style>
            ${styling}
        </style>
        <selection-boxes>
        </selection-boxes>
        <hr />
        <div id="file-browser">
            ${this.getFileUI(this.fileStructure, this.ip, this.campaign)}
        </div>
        `
    }
}
customElements.define('file-browser', FileBrowser);