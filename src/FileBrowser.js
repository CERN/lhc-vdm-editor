// @ts-check
import { css, html } from "./HelperFunctions.js";
import { NoPathExistsError, default as GitLab } from "./GitLab.js";
import './IPCampainSelectors.js'

const styling = css`
* {
    font-family: sans-serif;
}
#file-browser {
    border: 1px solid #a2a2a2;
    padding: 3px;
    background-color: #d6d6d6;
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
    word-wrap: break-word;
}

#file-browser .item:nth-of-type(2n) {
    background-color: white;
}

#new-file {
    background-color: white;
    padding: 3px;
}

.triangle {
    width: 0px;
    height: 0px;
    position: relative;
    display: inline-block;
}

.triangle-closed {
    border-left: 8px solid grey;
    border-bottom: 5px solid transparent;
    border-top: 5px solid transparent;
    top: 0px;
    left: 0px;
}

.triangle-open {
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 8px solid grey;
    top: -1px;
    left: 0px;
}

.triangle-container {
    height: 0px;
    width: 0px;
}

.folder-name {
    padding-left: 14px;
}

.folder-content{
    margin-left: 15px;
    border-left: 1px solid grey;
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
`

export default class FileBrowser extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();
        this.gitlab = null;

        /** @type {HTMLDivElement} */
        this.myContextMenu = null;

        Array.from(this.root.querySelectorAll("#ip-select, #campain-select")).map(x => x.addEventListener("change", async () => {
            this.reloadFileUI();
        }));

        document.body.addEventListener("mouseup", /**@type MouseEvent*/event => {
            if (this.contextMenu !== null && !(event.composedPath().includes(this.contextMenu))) {
                this.tryRemoveContextMenu();
            }
        })
    }
    
    passInValues(gitlab) {
        this.gitlab = gitlab;
        (async () => {
            const campains = await this.gitlab.listCampains();
            this.setFileUI('IP1', campains[0]);
        })();
        // @ts-ignore
        this.root.querySelector('selection-boxes').passInValues(gitlab);
    }

    reloadFileUI() {
        this.setFileUI(
            // @ts-ignore
            this.root.querySelector("#ip-select").value,
            // @ts-ignore
            this.root.querySelector("#campain-select").value,
        )
    }

    /** @type {HTMLDivElement} */
    contextMenu = null;

    tryRemoveContextMenu() {
        if (this.contextMenu !== null) {
            this.root.removeChild(this.contextMenu);
            this.contextMenu = null;
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

    /**
     * @param {string} ip
     * @param {string} campain
     */
    async setFileUI(ip, campain) {
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
                        <div class="triangle-container"><span class="triangle triangle-closed"></span></div>
                        <span class="folder-name">${folderName}</span>
                    </div>
                    <div class="folder-content">
                    </div>
                `;

                const folderContentElement = container.querySelector(".folder-content");
                const triangle = container.querySelector(".triangle");
                const itemEl = container.querySelector(".item");

                this.addContextMenuListener(itemEl, prefix + folderName);

                let isOpen = false;
                itemEl.addEventListener("click", async () => {
                    if (isOpen) {
                        triangle.classList.remove("triangle-open");
                        triangle.classList.add("triangle-closed");

                        folderContentElement.innerHTML = "";
                        isOpen = false;
                    }
                    else {
                        triangle.classList.remove("triangle-closed");
                        triangle.classList.add("triangle-open");

                        folderContentElement.appendChild(getElementFromStructure(folderContent, prefix + folderName + "/"));
                        isOpen = true;
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
                <span style="font-size: 20px; vertical-align: middle; padding: 0px 8px 0px 8px;">
                    +
                </span>
                <span>
                    New file
                </span>`;

            item.addEventListener('click', async () => {
                this.dispatchEvent(new CustomEvent('create-new-file', { detail: prefix }))
            })

            result.appendChild(item);

            return result;
        }

        let fileStructure;
        try {
            fileStructure = await this.gitlab.listFiles(`${campain}/${ip}`);
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
        header.innerHTML = `${campain}/${ip}`;
        browser.appendChild(header);

        browser.appendChild(getElementFromStructure(fileStructure, `${campain}/${ip}/`));
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