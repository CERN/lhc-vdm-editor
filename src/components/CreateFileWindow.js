import { css, html } from "../HelperFunctions.js";
import "./IPCampaignSelectors.js";
import { NoPathExistsError } from "../GitLab.js";
import './Triangle.js';

const styling = css`
.cover{
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    background-color: #00000075;
    z-index: 1000;
}

.window-container {
    left: 0;
    right: 0;
    position: fixed;
    z-index: 10000;
    text-align: center;
    top: 15px;
}

.window {
    background-color: #f1f1f1;
    display: inline-block;
    padding: 10px;
    border: solid 5px #444444;
    font-family: sans-serif;
    border-radius: 2px;
    box-shadow: grey 0 0 8px 3px;
    text-align: left;
    position: relative;
}

#create-empty {
    display: block;
    margin-top: 6px;
}

button {
    background-color: #f1f1f1;
    border: solid #656565 2px;
    margin: 3px;
    padding: 6px;
    padding-left: 15px;
    padding-right: 15px;
    border-radius: 3px;
    box-shadow: #c1c1c1 0px 0px 0px 1px;
}

#exit-button {
    width: 34px;
    height: 20px;
    background-color: #ff8484;
    border: 1px solid #ff8484;
    text-align: center;
    border-radius: 30px;
    font-family: monospace;
    font-size: 15px;
    position: absolute;
    right: -19px;
    top: -13px;
    color: white;
    cursor: pointer;
}
#exit-button:hover {
    background-color: #ca5151;
}

button:hover {
    background-color: #d6d6d6;
    cursor: pointer;
}

button:active {
    background-color: #a2a2a2;
}

.slightly-indented{
    margin-left: 7px;
    margin-top: 7px;
}

input[type=text]{
    padding: 7px;
    border-radius: 3px;
    border: solid 1px grey;
}

#file-list-button {
    font-size: 8pt;
    border: 1px solid black;
    padding: 0 5px 0 13px;
    margin: 5px 0 5px 0;
}
`

export default class CreateFileWindow extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();
        this.root.querySelector(".cover").addEventListener("click", () => {
            this.cancel();
        })
        this.gitlab = null;
        this.selectionBoxes = this.root.querySelector("selection-boxes");

        /**
         * @param event {KeyboardEvent}
         */
        function onKeyUp(event) {
            if (event.keyCode == 27/*esc*/) {
                this.cancel();
            }
        }

        this.onKeyUp = onKeyUp.bind(this);
        this.root.addEventListener("keyup", this.onKeyUp);
        this.root.querySelector("#exit-button").addEventListener("click", () => {
            this.cancel();
        });

        this.root.querySelector("#copy-button").addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("submit", {
                detail: {
                    // @ts-ignore
                    ip: this.selectionBoxes.ip,
                    // @ts-ignore
                    campaign: this.selectionBoxes.campaign
                }
            }));
        });

        function _onEmptySubmit() {
            const fileName = (/**@type HTMLInputElement*/(this.root.querySelector("#file-name"))).value;

            this.dispatchEvent(new CustomEvent("create-empty", {
                detail: fileName
            }));
        }
        const onEmptySubmit = _onEmptySubmit.bind(this);


        this.root.querySelector("#create-empty").addEventListener("click", onEmptySubmit);
        this.root.querySelector("#file-name").addEventListener("keydown", /**@param {KeyboardEvent} event */event => {
            if (event.key == "Enter") {
                onEmptySubmit();
            }
        });


        let isOpen = false;
        this.root.querySelector('#file-list-button').addEventListener('click', () => {
            const triangle = this.root.querySelector('folder-triangle')
            if (isOpen) {
                isOpen = false;
                // @ts-ignore
                triangle.isOpen = isOpen;
                this.root.querySelector('#file-list-content').innerHTML = "";
            }
            else {
                isOpen = true;
                // @ts-ignore
                triangle.isOpen = isOpen;
                // @ts-ignore
                this.setFilesFromPath(this.selectionBoxes.path);
            }
        })
        this.selectionBoxes.addEventListener('change', () => {
            if (isOpen) {
                // @ts-ignore
                this.setFilesFromPath(this.selectionBoxes.path);
            }
        })
    }

    async setFilesFromPath(path) {
        let files = ["--- NO FILES ---"];
        try {
            files = await this.gitlab.listFiles(path, true, false)
        }
        catch (error) {
            if (error instanceof NoPathExistsError) {

            } else {
                throw error;
            }
        }
        finally {
            this.setFileUI(files);
        }
    }

    setFileUI(files) {
        let list = document.createDocumentFragment();
        for (let file of files) {
            let line = document.createElement('div');
            line.innerHTML = html`
                <input type='checkbox' checked>
                ${file}
            `;
            list.appendChild(line);
        }

        this.root.querySelector('#file-list-content').innerHTML = '';
        this.root.querySelector('#file-list-content').appendChild(list);
    }

    disconnectedCallback() {
        document.removeEventListener("keyup", this.onKeyUp);
    }

    cancel() {
        this.dispatchEvent(new CustomEvent("cancel"));
    }

    passInValues(gitlab) {
        this.gitlab = gitlab;
        // @ts-ignore
        this.root.querySelector("selection-boxes").passInValues(this.gitlab);
    }

    template() {
        return html`
        <style>
            ${styling}
        </style>
        <div class="window-container">
            <div class="window">
                <div id="exit-button">x</div>
                <div>Create an empty file</div>
                <div class="slightly-indented">
                    <input id="file-name" type="text" placeholder="New File Name" />
                </div>
                <button id="create-empty">Create</button>
                <hr>
                Copy items from folder
                <div class="slightly-indented">
                    <selection-boxes></selection-boxes>
                </div>
                <div>
                    <button id="copy-button">Copy files</button>
                </div>
                <div id='file-list'>
                    <div id='file-list-button'>
                        <folder-triangle></folder-triangle>
                        <div>choose files</div>
                    </div>
                    <div id='file-list-content'></div>
                </div>
            </div>
        </div>
        <div class="cover">&nbsp;</div>
        `
    }
}
customElements.define('create-file-window', CreateFileWindow);