// @ts-check
import { css, html, getFilenameFromPath, preventResizeCSS, NO_FILES_TEXT, getRelativePath } from "../HelperFunctions.js";
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
        this.root.innerHTML = this.template();
        this.openFile = null;
        /** @type GitLab */
        this.gitlab = null;

        /** @type {HTMLDivElement} */
        this.myContextMenu = null;

        this.isCommitted = true;

        this.selectionBoxes = this.root.querySelector("selection-boxes");

        this.selectionBoxes.addEventListener("change", () => this.reloadFileUI());

        document.body.addEventListener("mousedown", /**@type MouseEvent*/event => {
            if (this.myContextMenu !== null && !(event.composedPath().includes(this.myContextMenu))) {
                this.tryRemoveContextMenu();
            }
        });
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

        await this.reloadFileUI();
    }

    get ip() {
        return this.selectionBoxes.ip;
    }

    get campaign() {
        return this.selectionBoxes.campaign;
    }


    async reloadFileUI() {
        await this.setFileUI(this.ip, this.campaign);
    }

    tryRemoveContextMenu() {
        console.log("try remove", this.myContextMenu);
        if (this.myContextMenu !== null) {
            this.root.removeChild(this.myContextMenu);
            this.myContextMenu = null;
        }
    }

    /**
     * @param {Element} element
     * @param {string} filePath This is the full filepath to the file.
     */
    addContextMenuListener(element, filePath) {
        element.addEventListener("contextmenu", /** @param event {MouseEvent}*/event => {
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
                        if (confirm(`Are you sure you want to delete the file ${filePath}?`)) {
                            deleteButton.innerText = "Deleting...";

                            deleteButton.classList.add("disabled");
                            renameButton.classList.add("disabled");

                            if (element.classList.contains('folder')) {
                                await this.gitlab.deleteFolder(filePath);
                            } else {
                                await this.gitlab.deleteFile(filePath);
                            }
                        }

                        if (this.openFile == filePath) {
                            this.dispatchEvent(new CustomEvent("open-file", {
                                detail: null
                            }));

                            this.openFile = null;
                        }

                        this.reloadFileUI();
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

                    const newName = prompt(`What do you want to rename ${filePath.split("/").slice(2).join('/')} to? (including sub-folder path)`);
                    if (newName !== null) {
                        if (newName.includes(" ")) {
                            alert("Invalid name, paths cannot contain spaces");
                        }
                        else {
                            (async () => {
                                container.querySelector("#delete-button").innerText = "Renaming ...";

                                deleteButton.classList.add("disabled");
                                renameButton.classList.add("disabled");

                                if (element.classList.contains('folder')) {
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

                                this.reloadFileUI();
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
        })
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
     * @param {string} ip
     * @param {string} campaign
     */
    async setFileUI(ip, campaign) {
        /**
         * @param {{ files: string[]; folders: Map<string, any> }} _structure
         */
        const getElementFromStructure = (_structure, prefix = "") => {
            const result = document.createElement('div');

            let container = document.createElement("div");
            for (let fileName of _structure.files) {
                container.innerHTML = html`<div class="item">${fileName}</div>`;
                const itemEl = container.querySelector(".item");
                if (`${campaign}/${ip}/${fileName}` == this.openFile) { itemEl.classList.add('item-open') };

                if (fileName !== NO_FILES_TEXT) {
                    const fullFileName = prefix + fileName;

                    itemEl.addEventListener("click", () => {
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

                        this.root.querySelectorAll('.item-open').forEach(x => x.classList.remove('item-open'));
                        itemEl.classList.add('item-open');
                        this.openFile = fullFileName;
                    });

                    this.addContextMenuListener(itemEl, fullFileName);
                }
                else {
                    itemEl.classList.add("no-files-item")
                }

                result.appendChild(itemEl);
            }

            for (let [folderName, folderContent] of _structure.folders.entries()) {
                container.innerHTML = html`
                    <div class="item folder">
                        <folder-triangle></folder-triangle>
                        <span class="folder-name">${folderName}</span>
                    </div>
                    <span style="display:block" class="folder-content">
                    </span>
                `;

                const folderContentElement = container.querySelector(".folder-content");
                const triangle = container.querySelector("folder-triangle");
                const itemEl = container.querySelector(".item");

                this.addContextMenuListener(itemEl, prefix + folderName);

                let isOpen = false;
                itemEl.addEventListener("click", async () => {
                    if (isOpen) {
                        isOpen = false;
                        triangle.isOpen = isOpen;
                        folderContentElement.innerHTML = "";
                    }
                    else {
                        isOpen = true;
                        triangle.isOpen = true;
                        folderContentElement.appendChild(getElementFromStructure(folderContent, prefix + folderName + "/"));
                    }
                });

                for (let containerChild of Array.from(container.children)) {
                    result.appendChild(containerChild);
                }
            }

            let item = document.createElement('div');
            item.setAttribute('style', 'font-weight: bold');
            item.className = 'item';
            item.innerHTML = html`
                <span style="font-size: 20px; vertical-align: middle; padding: 0px 0px 0px 0px;">
                    +
                </span>
                <span>
                    New file(s)
                </span>`;

            item.addEventListener('click', () => {
                const createFileWindow = document.createElement("create-file-window");
                createFileWindow.passInValues(this.gitlab);

                createFileWindow.addEventListener("submit", async (event) => {
                    try {
                        await this.tryCopyFolder(prefix.slice(0, -1), event.detail.ip, event.detail.campaign, event.detail.filePaths);
                    }
                    finally {
                        this.root.removeChild(createFileWindow);
                    }

                    this.reloadFileUI();
                });

                createFileWindow.addEventListener("cancel", () => {
                    this.root.removeChild(createFileWindow);
                });

                createFileWindow.addEventListener("create-empty", async event => {
                    try {
                        await this.gitlab.createFile(prefix + event.detail);
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

                    this.reloadFileUI();
                });

                this.root.appendChild(createFileWindow);
            })

            result.appendChild(item);

            return result;
        }

        let fileStructure;
        try {
            fileStructure = await this.gitlab.listFiles(`${campaign}/${ip}`);
        }
        catch (error) {
            if (error instanceof NoPathExistsError) {
                fileStructure = { files: [NO_FILES_TEXT], folders: new Map() };
            }
            else {
                throw error;
            }
        }

        let browser = this.root.querySelector("#file-browser");
        browser.innerHTML = "";

        let header = document.createElement('div');
        header.setAttribute('id', 'folder-name');
        header.innerHTML = `${campaign}/${ip}`;
        browser.appendChild(header);

        browser.appendChild(getElementFromStructure(fileStructure, `${campaign}/${ip}/`));
    }

    template() {
        return html`
        <style>
            ${styling}
        </style>
        <selection-boxes>
        </selection-boxes>
        <hr />
        <div id="file-browser">
        </div>
        `
    }
}
customElements.define('file-browser', FileBrowser);