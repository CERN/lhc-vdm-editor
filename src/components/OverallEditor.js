// @ts-check
import { css, html, addLineNumbers, getSigmaToMMFactor, DEFAULT_BEAM_PARAMS, deepCopy } from "../HelperFunctions.js"
import "./RawEditor.js"
import "./CodeEditor.js"
import "./SwitchEditorButtons.js"
import "./CommitElement.js"
import "./FileBrowser.js"
import "./ResizeablePanel.js"
import GitLab, { NoPathExistsError } from "../GitLab.js"
import { parseVdM, deparseVdM, VdMSyntaxError } from "../parser.js"
import './RevertButton.js'
import "./ChartsComponent.js"

const styling = css`
#editor-container {
    position: relative;
    height: calc(100% - 55px);
    flex-grow: 1;
}

.header {
    margin: 20px 0 20px 0;
}

commit-element {
    display: inline-block;
}
revert-button {
    display: inline-block;
}
#header-buttons{
    display: inline-block;
    float: right;
}

.container {
    width: calc(100% - 30px);
    height: calc(100% - 8px);
    margin: 0 auto;
}

#file-name {
    display: inline-block;
    float: left;
    padding: 7px;
    font: 14px/normal 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
}

#editor {
    height: 100%;
}

raw-editor{
    height: 100%
}

.uncommitted {
    color: orange;
}

/* Clearfix to make floats take up space */
.cf:before,
.cf:after {
  content: " ";
  display: table;
}

.cf:after {
  clear: both;
}

.blank-editor {
    text-align: center;
    padding-top: 50px;
    font-size: xx-large;
    font-family: sans-serif;
    color: #b5b5b5;
}

.body{
    display: flex;
}

.vr {
    border-left: 1px solid #cccccc;
    display: inline;
    margin: 0px 2px 0px 4px;
}
`

const BLANK_EDITOR_HTML = html`<div class="blank-editor">No File Selected</div>`;
const EDITOR_TAG_NAMES = [
    "raw-editor",
    "code-editor",
]
const DEFAULT_EDITOR_INDEX = 1;

const beamJSONCache = new Map();

export default class OverallEditor extends HTMLElement {
    /**
     * @param {GitLab} gitlab
     */
    constructor(gitlab) {
        super();
        this.isCommitted = true;
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template()

        this.filePath = null;
        this.editorContainer = this.root.getElementById("editor");
        /** @type {any} */
        this.editor = this.root.querySelector("raw-editor");
        this.gitlabInterface = gitlab;
        this.errorWebWorker = new Worker("./src/worker-vdm.js");
        this.errorWebWorker.addEventListener("message", message => this.onWebWorkerMessage(message));
        this.lastEditorChangeTimeout = null;

        this.addListeners();
        this.loadDataFromLocalStorage();
    }
    
    get ip(){
        if(this.filePath == null) return null
        else return this.filePath.split("/")[1];
    }
    
    get campaign(){
        if(this.filePath == null) return null
        else return this.filePath.split("/")[0];
    }

    async getCurrentBeamJSON(){
        // Caching this as we may be getting this multiple times
        if(beamJSONCache.has(this.campaign)) return beamJSONCache.get(this.campaign);
        else {
            let beamJSONFile;

            try{
                beamJSONFile = JSON.parse(await this.gitlabInterface.readFile(`${this.campaign}/beam.json`));
            }
            catch(error){
                if(error instanceof NoPathExistsError){
                    // TODO: actually display proper beams.json file here
                    alert(`Campaign ${this.campaign} has no beams.json file, using the default file.`)
                    beamJSONFile = deepCopy(DEFAULT_BEAM_PARAMS);
                } else throw error;
            }

            beamJSONCache.set(this.campaign, beamJSONFile);
            return beamJSONFile;
        }
        
    }

    onWebWorkerMessage(message){
        if (message.data.type == "lint") {
            if(typeof this.editor.setCurrentParsedResult == "function"){
                this.editor.setCurrentParsedResult(message.data)
            }

            const sigmaToMMFactor = getSigmaToMMFactor(this.beamJSON, this.ip);
            this.root.querySelector("charts-component").sigmaToMMFactor = sigmaToMMFactor;

            this.root.querySelector("charts-component").updateData(
                message.data.beamSeparationData,
                message.data.beamCrossingData,
                message.data.luminosityData,
                this.beamJSON.scan_limits[this.ip]
            )
        }
    }

    /**
     * Post a message to tell the web to parse the current editor text.
     */
    makeWebWorkerParse() {
        this.errorWebWorker.postMessage({
            type: "text_change",
            parseHeader: this.editor.headerlessParse || false,
            text: this.editor.headerlessParse ? addLineNumbers(this.editor.rawValue) : this.editor.value,
            beamParams: this.beamJSON
        })
    }

    onEditorContentChange(newValue){
        localStorage.setItem('content', newValue);
        this.updateFileNameUI(false, this.filePath);

        const TIMEOUT = 1000;
        clearTimeout(this.lastEditorChangeTimeout);
        this.lastEditorChangeTimeout = setTimeout(() => {
            if (Date.now() - this.lastEditorChange >= TIMEOUT) {
                this.makeWebWorkerParse();
            }
        }, TIMEOUT + 100);

        this.lastEditorChange = Date.now();
    }

    /**
     * Adds event listeners for all the elements 
     * @private
     */
    addListeners(){
        this.root.querySelector("commit-element").addEventListener("commit-button-press", /** @param {CustomEvent} ev */ev => {
            if (this.filePath === null) return;

            try {
                this.gitlabInterface.writeFile(
                    this.filePath,
                    ev.detail,
                    deparseVdM(parseVdM(this.value, false, this.beamJSON))
                );

                this.updateFileNameUI(true, this.filePath);
            } catch (errArr) {
                if (errArr instanceof VdMSyntaxError) {
                    alert('Commit failed! Following errors encountered:\n\n' + errArr.errors.map(x => x.message).join('\n'))
                } else throw errArr
            }
        })

        this.editorContainer.addEventListener('editor-content-change', ev => {
            this.onEditorContentChange(ev.detail)
        })

        this.root.querySelector("switch-editor-buttons").addEventListener("editor-button-press", /** @param {CustomEvent} ev */ev => {
            if (this.filePath === null) return;

            this.switchToEditor(ev.detail)
        });

        this.root.querySelector('revert-button').addEventListener('revert-changes', () => {
            if (this.filePath === null) return;

            if (!this.isCommitted) {
                if (confirm('Changes not committed. Are you sure you want to revert to repository version? All current changes will be discarded.')) {
                    this.setCurrentEditorContent(this.filePath)
                }
            } else {
                this.setCurrentEditorContent(this.filePath)
            }
        })

        this.root.querySelector("file-browser").addEventListener('open-file', /** @param {CustomEvent} event */(event) => {
            this.setCurrentEditorContent(event.detail)
        })

    }

    /**
     * @private
     */
    async loadDataFromLocalStorage() {
        try{
            await this.setCurrentEditorContent(
                localStorage.getItem("open-file"),
                localStorage.getItem("content")
            )
        }
        catch(error){
            if(error instanceof NoPathExistsError){
                alert(`Last edited file deleted in the repository, please recreate if required. The locally stored file was: \n${
                    localStorage.getItem("content")
                }`)
                await this.setCurrentEditorContent(
                    null,
                    null
                )
            }
            else throw error;
        }
        // TODO: file path passing in here is messy, this should be done in setCurrentEditorContent (but can't as we 
        // want to only call passInValues once)
        this.root.querySelector("file-browser").passInValues(this.gitlabInterface, this.filePath);

        if(this.filePath != null){
            if (localStorage.getItem('open-tab') !== null) {
                const buttonIndex = parseInt(localStorage.getItem('open-tab'));
                
                this.switchToEditor(buttonIndex);
                
                this.root.querySelector("switch-editor-buttons").setActiveButton(buttonIndex);
            }
            else {
                this.switchToEditor(DEFAULT_EDITOR_INDEX);
            }
        }
    }
    
    /**
     * Function to set the file the editor is editing.
     * 
     * @param {string | null} filePath If filepath is null, this means no file is to be loaded.
     * @param {string | null} localFileChanges If set, set the editor content to this values, for 
     * loading from local storage
     */
    async setCurrentEditorContent(filePath, localFileChanges=null) {
        if(filePath == null){
            this.editorContainer.innerHTML = BLANK_EDITOR_HTML;
            this.filePath = null;
            this.beamJSON = null;

            this.updateFileNameUI(true, null);
            return;
        }

        if (this.filePath == null) {
            // The filepath has been null and now isn't, so switch to the default editor.
            this.switchToEditor(DEFAULT_EDITOR_INDEX, false);
        }

        const fileContent = await this.gitlabInterface.readFile(filePath);
        // NOTE: we trim below to remove a new line as the last line
        if (localFileChanges != null && fileContent.trim() != localFileChanges.trim()){
            this.value = localFileChanges;

            this.updateFileNameUI(false, filePath);
        }
        else{
            this.value = fileContent;

            this.updateFileNameUI(true, filePath);
        }
        this.filePath = filePath;
        this.beamJSON = await this.getCurrentBeamJSON();

        this.makeWebWorkerParse();


        localStorage.setItem('open-file', filePath);
        localStorage.setItem('content', this.value);
    }

    /**
     * @param {boolean} isCommitted
     * @param {string | null} fileName NOTE: if this is null, the isCommitted attribute is ignored
     */
    updateFileNameUI(isCommitted, fileName) {
        if(fileName == null){
            this.root.querySelector("#file-name").innerText = "-- NO FILE LOADED --";
            this.root.querySelector("#file-name").classList.add("uncommitted");
            this.isCommitted = true;

            return;
        }

        localStorage.setItem("isCommitted", isCommitted.toString());
        this.isCommitted = isCommitted;
        if (isCommitted) {
            this.root.querySelector("#file-name").innerText = "./" + fileName + " (committed)";
            this.root.querySelector("#file-name").classList.remove("uncommitted");
        }
        else {
            this.root.querySelector("#file-name").innerText = "./" + fileName + " (uncommitted)";
            this.root.querySelector("#file-name").classList.add("uncommitted");
        }
    }

    get value() {
        return this.editor.value;
    }

    set value(newValue) {
        this.editor.value = newValue;
    }

    /**
     * @param {number} index
     */
    switchToEditor(index, setValue = true) {
        const previousEditor = this.editor;

        this.editor = document.createElement(EDITOR_TAG_NAMES[index]);

        if (setValue) {
            this.editor.value = previousEditor.value;
        }

        this.editorContainer.innerHTML = "";
        this.editorContainer.appendChild(this.editor);

        localStorage.setItem('open-tab', index.toString());
    }

    template() {
        return html`
        <style>
            ${styling}
        </style>
        <div class="container">
            <div class="header cf">
                <div id="file-name"></div>
                <div id='header-buttons'>
                    <commit-element></commit-element>
                    <div class="vr">&nbsp;</div>
                    <revert-button></revert-button>
                </div>
            </div>
            <div class="body">
                <resizeable-panel>
                    <file-browser></file-browser>
                </resizeable-panel>
                <div id="editor-container">
                    <div id="editor">
                        <raw-editor></raw-editor>
                    </div>
                    <switch-editor-buttons></switch-editor-buttons>
                </div>
                <resizeable-panel default-width="300px" side="right">
                    <charts-component></charts-component>
                </resizeable-panel>
            <div>
        </div>`
    }


}
customElements.define('overall-editor', OverallEditor);