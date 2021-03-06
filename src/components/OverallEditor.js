// @ts-check
import { css, html, addLineNumbers, DEFAULT_BEAM_PARAMS, deepCopy } from "../HelperFunctions.js";
import "./RawEditor.js";
import "./CodeEditor.js";
import "./SwitchEditorButtons.js";
import "./CommitElement.js";
import "./FileBrowser.js";
import "./ResizeablePanel.js";
import GitLab, { NoPathExistsError } from "../GitLab.js";
import VdM from "../parser.js";
import "./RevertButton.js";
import "./ChartsComponent.js";
import "./GenerateUI.js";
import EasterEgg from "../EasterEgg.js";

const styling = css`
#editor-container {
    position: relative;
    height: calc(100% - 55px);
    flex-grow: 1;
    min-width: 0px;
}

#editor-button-container{
    position: absolute;
    top: 46px;
    right: -1px;
}

.header {
    margin: 10px 0;
    padding: 10px;
    border: 1px solid lightgray;
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
    padding: 10px;
    font: 14px/normal 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
    width: 100%;
    font-weight: bold;
    word-wrap: break-word;
    background-color: #e7e9fd;
    margin-bottom: 10px;
    box-sizing: border-box;
    border-radius: 2px;
    cursor: default;
}
#github{
    box-sizing: border-box;
    width: 100%;
    margin: 20px 0;
    padding: 10px;
    text-align: center;
    word-wrap: break-word;
    font-size: small;
    border: 1px solid lightgray;
}

#editor {
    height: 100%;
}

raw-editor{
    height: 100%
}

resizeable-panel{
    flex-shrink: 0;
}

.uncommitted {
    color: orange;
    background-color: hsl(30, 85%, 95%) !important;
    border-radius: 2px;
}

#loading-indicator {
    position: fixed;
    top: 0px;
    left: calc(50% - 52px);
    font-family: sans-serif;
    background-color: #ffcdbd;
    padding: 5px 10px 5px 10px;
    border-radius: 3px;
    font-size: 16px;
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
    border: 1px solid lightgray;
    padding: 10px;
}

.vr {
    border-left: 1px solid #cccccc;
    display: inline;
    margin: 0px 2px 0px 4px;
}
`;

const beamJSONCache = new Map();

/**
 * @param {string} campaignName
 * @param {GitLab} [gitlab]
 */
async function getBeamJSON(campaignName, gitlab) {
    // Caching this as we may be getting this multiple times
    if (beamJSONCache.has(campaignName)) return beamJSONCache.get(campaignName);
    else {
        let beamJSONFile;

        try {
            beamJSONFile = JSON.parse(await gitlab.readFile(`${campaignName}/beam.json`));
        }
        catch (error) {
            if (error instanceof NoPathExistsError) {
                // TODO: actually display proper beam.json file here
                alert(`Campaign ${campaignName} has no beam.json file, using the default file.`);
                beamJSONFile = deepCopy(DEFAULT_BEAM_PARAMS);
            } else throw error;
        }

        beamJSONCache.set(campaignName, beamJSONFile);
        return beamJSONFile;
    }
}

const BLANK_EDITOR_HTML = html`<div class="blank-editor">No File Selected</div>`;
const EDITOR_TAG_NAMES = [
    "raw-editor",
    "code-editor",
];
const DEFAULT_EDITOR_INDEX = 1;

export default class OverallEditor extends HTMLElement {
    /**
     * @param {GitLab} gitlab
     */
    constructor(gitlab) {
        super();
        this._isCommitted = true;
        this.root = this.attachShadow({ mode: "open" });
        this.gitlabInterface = gitlab;
        this.render();

        this.filePath = null;
        this.editorContainer = this.root.getElementById("editor");
        /** @type {any} */
        this.editor = null;
        this.errorWebWorker = new Worker("./src/worker-vdm.js");
        this.errorWebWorker.addEventListener("message", message => this.onWebWorkerMessage(message));
        this.lastEditorChangeTimeout = null;
        this.initEditorContent = "";
        this.loadingIndicator = this.root.querySelector("#loading-indicator");

        this.chartsComponent = this.root.querySelector("charts-component");
        this.fileBrowser = this.root.querySelector("file-browser");
        this.currentEditorIndex = null;

        this.addListeners();
        this.loadedPromise = this.asyncConstrutor();
    }

    async asyncConstrutor() {
        try {
            await this.loadDataFromLocalStorage();
        }
        finally {
            this.loadingIndicator.style.display = "none";
        }
    }

    set isCommitted(newValue) {
        if (this._isCommitted != newValue) {
            this._isCommitted = newValue;
            this.fileBrowser.isCommitted = newValue;

            this.updateFileNameUI(this.filePath);
        }
    }

    get isCommitted() {
        return this._isCommitted;
    }

    get ip() {
        if (this.filePath == null) return null;
        else return this.filePath.split("/")[1];
    }

    get campaign() {
        if (this.filePath == null) return null;
        else return this.filePath.split("/")[0];
    }

    onWebWorkerMessage(message) {
        if (message.data.type == "lint") {
            if (typeof this.editor.setCurrentParsedResult == "function") {
                this.editor.setCurrentParsedResult(message.data);
            }
            const sigmaInMM = this.VdM.sigma * 1e3;
            this.chartsComponent.sigmaInMM = sigmaInMM;
            this.chartsComponent.data = {
                beamSeparation: message.data.beamSeparationData,
                beamCrossing: message.data.beamCrossingData,
                luminosity: message.data.luminosityData,
            };
            this.chartsComponent.limit = this.beamJSON.scan_limits[this.ip];
        }
    }

    /**
     * Post a message to tell the web to parse the current editor text.
     */
    makeWebWorkerParse() {
        this.errorWebWorker.postMessage({
            type: "text_change",
            hasHeaders: !(this.editor.headerlessParse || false),
            text: this.editor.headerlessParse ? addLineNumbers(this.editor.rawValue) : this.editor.value,
            beamParams: this.beamJSON,
            ip: this.ip
        });
    }

    onEditorContentChange(newValue) {
        localStorage.setItem("content", newValue);
        if ((this.editor.isChangedFrom !== undefined && !this.editor.isChangedFrom(this.initEditorContent))
             || newValue == this.initEditorContent) {
            this.isCommitted = true;
        }
        else {
            this.isCommitted = false;
        }

        const TIMEOUT = 1000;
        clearTimeout(this.lastEditorChangeTimeout);
        this.lastEditorChangeTimeout = setTimeout(() => {
            if (Date.now() - this.lastEditorChange >= TIMEOUT && this.filePath !== null) {
                this.makeWebWorkerParse();
            }
        }, TIMEOUT + 100);

        this.lastEditorChange = Date.now();
    }

    /**
     * @param {string} commitMessage
     */
    tryToCommit(commitMessage) {
        if (this.filePath === null) return;

        this.VdM.parse(this.value, true);
        if (this.VdM.isValid) {
            return (async () => {
                this.showLoadingIndicator();

                try{
                    await this.gitlabInterface.writeFile(
                        this.filePath,
                        commitMessage,
                        this.VdM.deparse()
                    );

                    this.isCommitted = true;
                }
                finally{
                    this.hideLoadingIndicator();
                }
            })();
        }
        else {
            alert("Commit failed! Following errors encountered:\n\n" + this.VdM.errors.map(x => x.message).join("\n"));
            return false;
        }
    }

    /**
     * Adds event listeners for all the elements
     * @private
     */
    addListeners() {
        this.root.querySelector("commit-element").addEventListener("commit-button-press", ev => {
            if(!this.tryToCommit(ev.detail)) ev.preventDefault();
        });
        this.editorContainer.addEventListener("editor-content-change", ev => this.onEditorContentChange(ev.detail));
        this.root.querySelector("revert-button").addEventListener("revert-changes", () => this.tryToRevert());
        this.root.querySelector("switch-editor-buttons").addEventListener("editor-button-press", ev => this.onSwitchEditorButtonPress(ev.detail));
        this.fileBrowser.addEventListener("open-file", event => this.setCurrentEditorContent(event.detail));
        this.editorContainer.addEventListener("change-row-selected", event => this.chartsComponent.showTooltips(event.detail));
        this.root.querySelector("generate-button").addEventListener("generated", ev => {
            if(this.filePath != null) this.editor.insertGeneratedContent(ev.detail);
        });
        this.root.querySelector("#file-name").addEventListener("dblclick", EasterEgg);
    }

    onSwitchEditorButtonPress(editorIndex) {
        if (this.filePath === null) return;

        this.switchToEditor(editorIndex);
        localStorage.setItem("open-tab", editorIndex.toString());
    }

    async tryToRevert() {
        if (this.filePath === null) return;
        this.showLoadingIndicator();

        try{
            if (!this.isCommitted) {
                if (confirm("Changes not committed. Are you sure you want to revert to repository version? All current changes will be discarded.")) {
                    await this.setCurrentEditorContent(this.filePath);
                }
            } else {
                await this.setCurrentEditorContent(this.filePath);
            }
        } finally {this.hideLoadingIndicator();}
    }

    /**
     * @private
     */
    async loadDataFromLocalStorage() {
        if (localStorage.getItem("open-file") != null) {
            if (localStorage.getItem("open-tab") !== null) {
                const buttonIndex = parseInt(localStorage.getItem("open-tab"));

                this.switchToEditor(buttonIndex);
            }
            else {
                this.switchToEditor(DEFAULT_EDITOR_INDEX);
            }
        }

        try {
            await this.setCurrentEditorContent(
                localStorage.getItem("open-file"),
                localStorage.getItem("content"),
                false,
                false
            );
        }
        catch (error) {
            if (error instanceof NoPathExistsError) {
                alert(`Last edited file deleted in the repository, please recreate if required. The locally stored file was: \n${
                    localStorage.getItem("content")
                    }`);
                await this.setCurrentEditorContent(
                    null,
                    null
                );
            }
            else throw error;
        }
        await this.fileBrowser.setOpenFile(this.filePath);
    }

    showLoadingIndicator(){
        this.loadingIndicator.style.display = "block";
    }

    hideLoadingIndicator(){
        this.loadingIndicator.style.display = "none";
    }

    /**
     * Function to set the file the editor is editing.
     *
     * @param {string | null} filePath If filepath is null, this means no file is to be loaded.
     * @param {string | null} localFileChanges If set, set the editor content to this values, for
     * loading from local storage
     */
    async setCurrentEditorContent(filePath, localFileChanges=null, showLoadingIndicator=true, switchEditor=true) {
        if (filePath == null) {
            this.editorContainer.innerHTML = BLANK_EDITOR_HTML;
            this.editor = null;
            this.filePath = null;
            this.updateFileNameUI(null);
            this.beamJSON = null;
            this.VdM = null;
            this.currentEditorIndex = null;

            this.isCommitted = true;
            return;
        }

        if (showLoadingIndicator) {
            this.showLoadingIndicator();
        }

        try{
            if (this.filePath == null && switchEditor) {
                // The filepath has been null and now isn't, so switch to the default editor.
                this.switchToEditor(DEFAULT_EDITOR_INDEX);
            }

            const fileContent = await this.gitlabInterface.readFile(filePath);
            this.initEditorContent = fileContent;
            // NOTE: we trim below to remove a new line as the last line
            if (localFileChanges != null && fileContent.trim() != localFileChanges.trim()) {
                this.value = localFileChanges;

                this.isCommitted = false;
            }
            else {
                this.value = fileContent;

                this.isCommitted = true;
            }
            this.filePath = filePath;
            this.beamJSON = await getBeamJSON(this.campaign, this.gitlabInterface);
            this.VdM = new VdM(this.beamJSON, this.ip);

            this.editor.VdM = this.VdM;
            this.editor.ip = this.ip;

            this.root.querySelector("generate-button").ip = this.ip;

            this.onEditorContentChange(this.value);
            this.updateFileNameUI(filePath);

            this.makeWebWorkerParse();

            localStorage.setItem("open-file", filePath);
            localStorage.setItem("content", this.value);
        }
        finally{
            if (showLoadingIndicator) {
                this.loadingIndicator.style.display = "none";
            }
        }
    }

    /**
     * @param {string | null} fileName NOTE: if this is null, the isCommitted attribute is ignored
     */
    updateFileNameUI(fileName) {
        if (fileName == null) {
            this.root.querySelector("#file-name").innerText = "-- NO FILE LOADED --";
            this.root.querySelector("#file-name").classList.add("uncommitted");
            this.isCommitted = true;

            return;
        }

        if (this.isCommitted) {
            this.root.querySelector("#file-name").innerText = fileName + " (committed)";
            this.root.querySelector("#file-name").classList.remove("uncommitted");
        }
        else {
            this.root.querySelector("#file-name").innerText = fileName + " (uncommitted)";
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
    switchToEditor(index) {
        const previousEditor = this.editor;
        this.currentEditorIndex = index;

        this.root.querySelector("switch-editor-buttons").setActiveButton(index);
        this.editor = document.createElement(EDITOR_TAG_NAMES[index]);
        this.editor.VdM = this.VdM;
        this.editor.ip = this.ip;

        if (previousEditor) {
            this.editor.value = previousEditor.value;
        }

        this.editorContainer.innerHTML = "";
        this.editorContainer.appendChild(this.editor);
    }

    render() {
        hyper(this.root)`
        <style>
            ${styling}
        </style>
        <div class="container">
            <div id="loading-indicator">Loading ...</div>
            <div class="header cf">
                <div id='header-buttons'>
                    <commit-element></commit-element>
                    <div class="vr">&nbsp;</div>
                    <revert-button></revert-button>
                </div>
            </div>
            <div class="body">
                <resizeable-panel>
                    <file-browser gitlab=${this.gitlabInterface}></file-browser>
                </resizeable-panel>
                <div id="editor-container">
                    <div id="file-name"></div>
                    <div id="editor">
                    </div>
                    <div id='editor-button-container'>
                        <switch-editor-buttons></switch-editor-buttons>
                        <generate-button></generate-button>
                    </div>
                </div>
                <resizeable-panel default-width="300px" side="right">
                    <charts-component></charts-component>
                </resizeable-panel>
            </div>
        
            <div id="github">
                Maintained by <a href="mailto:michi.hostettler@cern.ch">Michi Hostettler</a>
                <br>
                GitHub source: <a href="url">https://github.com/CERN/lhc-vdm-editor</a>
            </div>
        </div>`;
    }

}
customElements.define("overall-editor", OverallEditor);
