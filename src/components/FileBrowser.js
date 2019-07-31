// @ts-check
import { css, html, getFilenameFromPath } from "../HelperFunctions.js";
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

#file-browser .item:nth-of-type(2n) {
    background-color: white;
}

#new-file {
    background-color: white;
    padding: 3px;
}

.folder-name {
    padding-left: 14px;
}

.folder-content{
    margin-left: 15px;
}

* {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

.context-menu {
    position: fixed;
    background-color: #fbfbfb;
    border: #c1c1c1 solid 2px;
    z-index: 100000;
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
        /** @type GitLab */
        this.gitlab = null;

        /** @type {HTMLDivElement} */
        this.myContextMenu = null;

        this.root.querySelector("selection-boxes").addEventListener("change", () => this.reloadFileUI());

        document.body.addEventListener("mousedown", /**@type MouseEvent*/event => {
            if (this.myContextMenu !== null && !(event.composedPath().includes(this.myContextMenu))) {
                console.log("removing")
                this.tryRemoveContextMenu();
            }
        })
    }

    passInValues(gitlab) {
        this.gitlab = gitlab;
        (async () => {
            const campaigns = await this.gitlab.listCampaigns();
            this.setFileUI('IP1', campaigns[0]);
        })();
        this.root.querySelector('selection-boxes').passInValues(gitlab);
    }

    reloadFileUI() {
        const ip = this.root.querySelector('selection-boxes').ip;
        const campaign = this.root.querySelector('selection-boxes').campaign;
        this.setFileUI(ip, campaign);
    }

    /** @type {HTMLDivElement} */
    myContextMenu = null;

    tryRemoveContextMenu() {
        if (this.myContextMenu !== null) {
            this.root.removeChild(this.myContextMenu);
            this.myContextMenu = null;
        }
    }

    /**
     * @param {Element} element
     * @param {string} filePath
     */
    addContextMenuListener(element, filePath) {
        element.addEventListener("contextmenu", /** @param event {MouseEvent}*/event => {
            const container = document.createElement("div");
            container.innerHTML = html`<div style="top: ${event.clientY}px; left: ${event.clientX}px" class="context-menu">
                <div id="delete-button" class="context-menu-item">Delete</div>
                <div id="rename-button" class="context-menu-item">Rename</div>
            </div>`;
            this.root.appendChild(container);

            container.querySelector("#delete-button").addEventListener("click", () => {
                (async () => {
                    if (confirm(`Are you sure you want to delete the file ${filePath}?`)) {
                        await this.gitlab.deleteFile(filePath);
                        this.reloadFileUI();
                    }
                })();

                this.tryRemoveContextMenu();
            })

            container.querySelector("#rename-button").addEventListener("click", () => {
                const newName = prompt(`What do you want to rename ${filePath.split("/").slice(-1)[0]} to?`);
                if (newName !== null) {
                    if (newName.includes(" ")) {
                        alert("Invalid name, file names cannot contain spaces");
                    }
                    else {
                        (async () => {
                            await this.gitlab.renameFile(filePath, newName);
                            this.reloadFileUI();
                        })()
                    }
                }
                this.tryRemoveContextMenu();
            })

            this.myContextMenu = container;

            event.preventDefault();
        })
    }

    async tryCopyFolder(source, ip, campaign) {
        if (!confirm(`Are you sure you want to copy all the files from the campaign "${campaign}" and interaction point "${ip}"?`)) {
            return;
        }

        const fromFolder = campaign + "/" + ip;
        const toFolder = source;

        try {
            const fromFolderContents = await this.gitlab.listFiles(fromFolder, true, false);
            const toFolderContents = new Set(await this.gitlab.listFiles(toFolder, true, false));

            const commonFileNames = fromFolderContents.filter(x => toFolderContents.has(x));
            if (commonFileNames.length != 0) {
                alert(`Note:\n"${commonFileNames.map(getFilenameFromPath).join(", ")}"\nare in common with the source and destination folders, and will not be copied.`)
            }

            await this.gitlab.copyFilesFromFolder(
                fromFolder,
                toFolder // remove the end slash from the folder name
            )
        }
        catch (error) {
            if (error instanceof NoPathExistsError) {
                alert(`The campaign "${campaign}" and interaction point "${ip}" has no files.`);

                return;
            }
            else {
                throw error;
            }
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
                itemEl.addEventListener("dblclick", () => {
                    this.dispatchEvent(new CustomEvent('open-new-file', {
                        detail: prefix + fileName,
                    }))
                });
                this.addContextMenuListener(itemEl, prefix + fileName);

                result.appendChild(itemEl);
            }

            for (let [folderName, folderContent] of _structure.folders.entries()) {
                container.innerHTML = html`
                    <div class="item">
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
                        // @ts-ignore
                        triangle.isOpen = isOpen;
                        folderContentElement.innerHTML = "";
                    }
                    else {
                        isOpen = true;
                        // @ts-ignore
                        triangle.isOpen = isOpen;
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
                    await this.tryCopyFolder(prefix.slice(0, -1), event.detail.ip, event.detail.campaign);
                    this.reloadFileUI();

                    // Succeeded, so remove the root
                    this.root.removeChild(createFileWindow);
                });

                createFileWindow.addEventListener("cancel", () => {
                    this.root.removeChild(createFileWindow);
                });

                createFileWindow.addEventListener("create-empty", async event => {
                    try{
                        await this.gitlab.createFile(prefix + event.detail);
                    }
                    catch(error){
                        if(error instanceof FileAlreadyExistsError){
                            alert(`Cannot create the empty file ${event.detail}, it already exists`);
                            return;
                        }
                        else{
                            throw error;
                        }
                    }
                    this.reloadFileUI();

                    this.root.removeChild(createFileWindow);
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
                fileStructure = { files: ["--- NO FILES ---"], folders: new Map() };
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