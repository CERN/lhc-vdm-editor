import { css, NO_FILES_TEXT } from "../HelperFunctions.js";
import "./IPCampaignSelectors.js";
import { NoPathExistsError } from "../GitLab.js";
import './FolderTriangle.js';
import './ModelWindow.js';

const styling = css`        
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

label {
    display: block;
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
        this.dropdownOpen = false;
    }

    connectedCallback() {
        this.render();

        this.selectionBoxes = this.root.querySelector("ip-campaign-selectors");

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
                    filePaths: this.root.querySelector('folder-triangle').open ? this.chosenFiles : []
                }
            }));
        });

        function _onEmptySubmit() {
            const fileName = (/**@type HTMLInputElement*/(this.root.querySelector("#file-name"))).value;
            if(fileName == null){
                alert("Cannot create a file without a file name");
                return;
            }

            createEmptyButton.innerText = "Creating...";

            copyButton.disabled = true;
            createEmptyButton.disabled = true;

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

        this.fileListContent = this.root.querySelector('#file-list-content');
        this.root.querySelector('#dropdown').addEventListener('click', () => this.onDropdownClick())
        this.selectionBoxes.addEventListener('change', () => {
            if (this.dropdownOpen) {
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

    async onDropdownClick(){
        const triangle = this.root.querySelector('folder-triangle');
        if (this.dropdownOpen) {
            this.dropdownOpen = false;
            triangle.open = this.dropdownOpen;
            this.fileListContent.innerHTML = "";
            this.root.querySelector('#list-options').innerHTML = "";
        }
        else {
            this.dropdownOpen = true;
            triangle.open = this.dropdownOpen;
            await this.setFilesFromPath(this.selectionBoxes.path);
            this.setCheckboxSelector();
        }
    }

    get chosenFiles() {
        let arr = [];
        this.root.querySelector('#file-list-content').querySelectorAll('input').forEach(x => {
            if (x.checked) arr.push(x.value)
        })
        return arr;
    }

    /**
     * @param {string} path
     */
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
        let element = wire()`
            <label>
                <input type='checkbox'/>
                <span>select all</span>
            </label>
        `;

        this.root.querySelector('#list-options').appendChild(element);

        element.querySelector('input').onchange = (event) => this.selectAll(event);
    }

    /**
     * @param {any} changeEvent
     */
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
                line = wire()`
                    <span>${NO_FILES_TEXT}</span>
                `;
            } else {
                line = wire()`
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

    render() {
        hyper(this.root)`
        <style>
            ${styling}
        </style>
        <model-window>
            <div>Create an empty file</div>
            <div class="slightly-indented">
                <input id="file-name" type="text" placeholder="New File Name" />
            </div>
            <button id="create-empty">Create</button>
            <hr>
            Copy items from folder
            <div class="slightly-indented">
                <ip-campaign-selectors allCampaigns=${this.campaigns}></ip-campaign-selectors>
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
        </model-window>
        `
    }
}
customElements.define('create-file-window', CreateFileWindow);