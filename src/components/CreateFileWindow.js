import { css, html, NO_FILES_TEXT } from "../HelperFunctions.js";
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
    padding: 15px;
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
    margin: 5px 3px 5px 3px;
    padding: 6px;
    padding-left: 15px;
    padding-right: 15px;
    border-radius: 3px;
    box-shadow: #c1c1c1 0px 0px 0px 1px;
}

button[disabled] {
    box-shadow: none;
    cursor: not-allowed;
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

button:hover:not(disabled) {
    background-color: #d6d6d6;
    cursor: pointer;
}

button:active:not(disabled) {
    background-color: #a2a2a2;
}

.slightly-indented{
    margin-left: 10px;
}

input[type=text]{
    padding: 7px;
    border-radius: 3px;
    border: solid 1px grey;
    margin: 10px 0 10px 0;
}

#file-list-button {
    font-size: 8pt;
    border: 1px solid black;
    padding: 2px 5px 2px 5px;
    margin: 5px 0 5px 0;
}

#list-options div{
    margin: 5px 0 5px 0;
}

label *{
    vertical-align: middle;
}
`

export default class CreateFileWindow extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.campaigns = null;
        this.gitlab = null;
    }

    connectedCallback() {
        this.render();

        this.root.querySelector(".cover").addEventListener("click", () => {
            this.cancel();
        })
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

        const copyButton = this.root.querySelector("#copy-button");
        const createEmptyButton = this.root.querySelector("#create-empty");

        copyButton.addEventListener("click", () => {
            copyButton.innerText = "Copying...";

            copyButton.disabled = true;
            createEmptyButton.disabled = true;

            this.dispatchEvent(new CustomEvent("submit", {
                detail: {
                    ip: this.selectionBoxes.ip,
                    campaign: this.selectionBoxes.campaign,
                    filePaths: this.root.querySelector('folder-triangle').isOpen ? this.chosenFiles : []
                }
            }));
        });

        function _onEmptySubmit() {
            createEmptyButton.innerText = "Creating...";

            copyButton.disabled = true;
            createEmptyButton.disabled = true;

            const fileName = (/**@type HTMLInputElement*/(this.root.querySelector("#file-name"))).value;

            this.dispatchEvent(new CustomEvent("create-empty", {
                detail: fileName
            }));
        }
        const onEmptySubmit = _onEmptySubmit.bind(this);


        createEmptyButton.addEventListener("click", onEmptySubmit);
        this.root.querySelector("#file-name").addEventListener("keydown", /**@param {KeyboardEvent} event */event => {
            if (event.key == "Enter") {
                onEmptySubmit();
            }
        });


        let isOpen = false;
        this.fileListContent = this.root.querySelector('#file-list-content');
        this.root.querySelector('#dropdown').addEventListener('click', () => {
            const triangle = this.root.querySelector('folder-triangle')
            if (isOpen) {
                isOpen = false;
                triangle.isOpen = isOpen;
                this.fileListContent.innerHTML = "";
                this.root.querySelector('#list-options').innerHTML = "";
            }
            else {
                isOpen = true;
                triangle.isOpen = isOpen;
                this.setFilesFromPath(this.selectionBoxes.path);
                this.setCheckboxSelector();
            }
        })
        this.selectionBoxes.addEventListener('change', () => {
            if (isOpen) {
                this.setFilesFromPath(this.selectionBoxes.path);
            }
        })

        this.fileListContent.onchange = () => {
            let truthArr = Array.from(this.fileListContent.querySelectorAll('input')).map(x => x.checked);
            let checkboxSelector = this.root.querySelector('#list-options').querySelector('input');

            checkboxSelector.indeterminate = false;
            if (truthArr.every(x => x)) checkboxSelector.checked = true
            else if (truthArr.every(x => !x)) checkboxSelector.checked = false
            else checkboxSelector.indeterminate = true;
        }
    }

    get chosenFiles() {
        let arr = [];
        this.root.querySelector('#file-list-content').querySelectorAll('input').forEach(x => {
            if (x.checked) arr.push(x.value)
        })
        return arr;
    }

    async setFilesFromPath(path) {
        let files = [NO_FILES_TEXT];
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

    setCheckboxSelector() {
        let element = document.createElement('div');
        element.innerHTML = html`
            <label>
                <input type='checkbox'/>
                <span>select all</span>
            </label>
        `;

        this.root.querySelector('#list-options').appendChild(element);

        element.querySelector('input').onchange = (event) => this.selectAll(event);
    }

    selectAll(changeEvent) {
        this.root.querySelector('#file-list-content').querySelectorAll('input').forEach(x => {
            x.checked = changeEvent.target.checked;
        })
    }
    /**
     * @param {string[]} files
     */
    setFileUI(files) {
        let list = document.createDocumentFragment();
        for (let file of files) {
            let line = document.createElement('div');
            if (file == NO_FILES_TEXT) {
                line.innerHTML = html`
                    ${NO_FILES_TEXT}
                `;
            } else {
                line.innerHTML = html`
                    <label>
                        <input type='checkbox' value=${file} />
                        <span>${file}</span>
                    </label>
                `;
            }
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

    render() {
        hyper(this.root)`
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
                    <selection-boxes allCampaigns=${this.campaigns}></selection-boxes>
                </div>
                <div>
                    <button id="copy-button">Copy files</button>
                </div>
                <div id='file-list'>
                    <div id='file-list-button'>
                        <span id="dropdown">
                            <folder-triangle></folder-triangle>
                            <div class="slightly-indented">choose files</div>
                        </span>
                        <div id='list-options'></div>
                        <div id='file-list-content'></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="cover">&nbsp;</div>
        `
    }
}
customElements.define('create-file-window', CreateFileWindow);