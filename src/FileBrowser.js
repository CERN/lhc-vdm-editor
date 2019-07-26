// @ts-check
import { css, html } from "./HelperFunctions.js";
import {NoPathExistsError, default as GitLab} from "./GitLab.js";

const styling = css`
* {
    font-family: sans-serif;
}
#file-browser {
    border-style: solid;
    border-width: 1px;
    padding: 3px;
    border-color: #dadada;
}

.item {
    background-color: #ededed;
    padding: 3px;
    font-size: 14px;
    cursor: pointer;
    word-wrap: break-word;
}

.item:nth-child(2n) {
    background-color: #f7f7f7;
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

.selection-box{
    padding-top: 5px;
    padding-bottom: 5px;
}

.selection-box select {
    padding: 2px;
}

.selection-name {
    padding-bottom: 3px;
}

* {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}
`

export default class FileBrowser extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();

        this.gitlab = null;

        Array.from(this.root.querySelectorAll("#ip-select, #campain-select")).map(x => x.addEventListener("change", async () => {
            this.setFileUI(
                // @ts-ignore
                this.root.querySelector("#ip-select").value,
                // @ts-ignore
                this.root.querySelector("#campain-select").value,
            )
        }))
    }

    /**
     * @param {GitLab} gitlab
     */
    passInValues(gitlab){
        this.gitlab = gitlab;
        (async () => {
            const campains = await this.gitlab.listCampains();
            this.root.getElementById("campain-select").innerHTML = campains.map(campainName => {
                return html`<option value=${campainName}>${campainName}</option>`
            }).join("\n");

            this.setFileUI("IP1", campains[0]);
        })();
    }

    /**
     * @param {Element} element
     * @param {string} filePath
     */
    addContextMenuListener(element, filePath){
        element.addEventListener("contextmenu", event => {
            console.log(filePath);
            event.preventDefault();
        })
    }

    /**
     * @param {string} ip
     * @param {string} campain
     */
    async setFileUI(ip, campain){
        /**
         * @param {{ files: string[]; folders: Map<string, any> }} _structure
         */
        const getElementFromStructure = (_structure, prefix="") => {
            const result = document.createDocumentFragment();
            let container =  document.createElement("div");
            for(let fileName of _structure.files){
                container.innerHTML = html`<div class="item">${fileName}</div>`;
                const itemEl = container.querySelector(".item");
                itemEl.addEventListener("click", () => {
                    // emit event
                });
                this.addContextMenuListener(itemEl, prefix + fileName);

                result.appendChild(itemEl);
            }

            for(let [folderName, folderContent] of _structure.folders.entries()){
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
                    if(isOpen){
                        triangle.classList.remove("triangle-open");
                        triangle.classList.add("triangle-closed");

                        folderContentElement.innerHTML = "";
                        isOpen = false;
                    }
                    else{
                        triangle.classList.remove("triangle-closed");
                        triangle.classList.add("triangle-open");

                        folderContentElement.appendChild(getElementFromStructure(folderContent, prefix + folderName + "/"));
                        isOpen = true;
                    }
                });

                for(let containerChild of Array.from(container.children)){
                    result.appendChild(containerChild);
                }
            }
            return result;
        }

        let fileStructure;
        try{
            fileStructure = await this.gitlab.listFiles(`${campain}/${ip}`);
        }
        catch(error){
            if(error instanceof NoPathExistsError){
                fileStructure = {files: ["--- NO FILES ---"], folders: new Map()};
            }
            else{
                throw error;
            }
        }

        this.root.querySelector("#file-browser").innerHTML = "";
        this.root.querySelector("#file-browser").appendChild(getElementFromStructure(fileStructure));
    }

    template() {
        return html`
        <style>
            ${styling}
        </style>
        <div class="selection-box">
            <div class="selection-name">IP:</div>
            <div>
                <select id="ip-select">
                    <option value="IP1">IP1</option>
                    <option value="IP2">IP2</option>
                    <option value="IP5">IP5</option>
                    <option value="IP8">IP8</option>
                </select>
            </div>
        </div>
        <div class="selection-box">
            <div class="selection-name">Campain:</div>
            <div>
                <select id="campain-select">
                </select>
            </div>
        </div>
        <hr />
        <div id="file-browser">
        </div>
        `
    }
}
customElements.define('file-browser', FileBrowser);