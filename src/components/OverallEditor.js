// @ts-check
import { css, html } from "../HelperFunctions.js"
import "./RawEditor.js"
import "./CodeEditor.js"
import "./SwitchEditorButtons.js"
import "./CommitElement.js"
import "./FileBrowser.js"
import "./ResizeablePanel.js"
import GitLab, { NoPathExistsError } from "../GitLab.js"
import { parseVdM, deparseVdM } from "../parser.js"
import './RevertButton.js'
import "./BeamPositionChart.js"

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

        this.addListeners();
        this.loadDataFromLocalStorage();
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
                    deparseVdM(parseVdM(this.value))
                );

                this.updateFileNameUI(true, this.filePath);
            } catch (errArr) {
                if (Array.isArray(errArr)) {
                    alert('Commit failed! Following errors encountered:\n\n' + errArr.map(x => x.message).join('\n'))
                } else throw errArr
            }
        })

        this.editorContainer.addEventListener('editor-content-change', ev => {
            localStorage.setItem('content', ev.detail);
            this.updateFileNameUI(false, this.filePath);
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

            this.updateFileNameUI(true, null);
            return;
        }

        if (this.filePath == null) {
            // The filepath has been null and now isn't, so switch to the default editor.
            this.switchToEditor(DEFAULT_EDITOR_INDEX);
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
        const editorElement = document.createElement(EDITOR_TAG_NAMES[index]);
        if (setValue) {
            editorElement.value = this.editor.value;
        }

        this.editorContainer.innerHTML = "";
        this.editorContainer.appendChild(editorElement);

        this.editor = editorElement;
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
                    <beam-position-chart></beam-position-chart>
                </resizeable-panel>
            <div>
        </div>`
    }


}
customElements.define('overall-editor', OverallEditor);