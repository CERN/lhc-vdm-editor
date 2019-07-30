// @ts-check
import { css, html } from "./HelperFunctions.js"
import "./RawEditor.js"
import "./CodeEditor.js"
import "./SwitchEditorButtons.js"
import "./CommitElement.js"
import "./FileBrowser.js"
import GitLab from "./GitLab.js"
import { parseVdM, deparseVdM } from "./parser.js"
import './RevertButton.js'

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
    float: right;
}

.container {
    width: calc(100% - 30px);
    height: calc(100% - 8px);
    max-width: 1300px;
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

#file-browser-container {
    width: 218px;
    height: calc(100% - 45px);
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

.resize{
    width: 5px;
    vertical-align: top;
    background-color: gainsboro;
    margin: 0 10px 0 10px;
    cursor: col-resize;

    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    
}

.body{
    display: flex;
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
        this.root.querySelector("switch-editor-buttons").addEventListener("editor-button-press", /** @param {CustomEvent} ev */ev => {
            if(this.filePath === null) return;

            this.switchToEditor(ev.detail)
        });
        this.root.querySelector('revert-button').addEventListener('revert-changes', () => {
            if(this.filePath === null) return;

            if (!this.isCommitted) {
                if (confirm('Changes not committed. Are you sure you want to revert to HEAD? All current changes will be discarded.')) {
                    this.setGitLabFile(this.filePath)
                }
            } else {
                this.setGitLabFile(this.filePath)
            }
        })

        this.root.querySelector("file-browser").addEventListener('open-new-file', /** @param {CustomEvent} event */(event) => {
            if (!this.isCommitted) {
                if (confirm(`Changes not committed. Are you sure you want to open ${event.detail}? All current changes will be discarded.`)) {
                    this.setGitLabFile(event.detail)
                }
            } else {
                this.setGitLabFile(event.detail)
            }
        })

        this.filePath = null;
        this.editorContainer = this.root.getElementById("editor");
        /** @type {any} */
        this.editor = this.root.querySelector("raw-editor");
        this.gitlabInterface = gitlab;
        // @ts-ignore
        this.root.querySelector("file-browser").passInValues(gitlab);

        this.root.querySelector("commit-element").addEventListener("commit-button-press", /** @param {CustomEvent} ev */ev => {
            if(this.filePath === null) return;

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
            // @ts-ignore
            localStorage.setItem('content', ev.detail);
            this.updateFileNameUI(false, this.filePath);
        })

        this.setEditorContent();
        this.setupResize();
    }

    setupResize(){
        /**
         * @param {MouseEvent} event
         */
        function _onMouseMove(event){
            const fileBrowser = this.root.querySelector("#file-browser-container");
            const fileBrowserLeft = fileBrowser.getBoundingClientRect().left;

            const newWidth = event.screenX - fileBrowserLeft - 12;
            // @ts-ignore
            fileBrowser.style.width = newWidth + "px";
        }
        const onMouseMove = _onMouseMove.bind(this);

        this.root.querySelector(".resize").addEventListener("mousedown", () => {
            document.addEventListener("mousemove", onMouseMove);
        });

        this.root.querySelector(".resize").addEventListener("mouseup", () => {
            document.removeEventListener("mousemove", onMouseMove);
        })
    }

    setEditorContent() {
        if (localStorage.getItem('content') !== null) {
            this.editor.value = localStorage.getItem('content');
            this.filePath = localStorage.getItem("open-file");
            this.updateFileNameUI(Boolean(localStorage.getItem("isCommitted") || true), this.filePath);
        }
        else if(localStorage.getItem("open-file") !== null){
            // NOTE: we don't have to wait for this to happen
            (async () => {
                this.editor.value = await this.gitlabInterface.readFile(localStorage.getItem("open-file"));
            })()

            this.filePath = localStorage.getItem("open-file");
            this.updateFileNameUI(Boolean(localStorage.getItem("isCommitted") || true), this.filePath);
        }
        else{
            this.updateFileNameUI(true, null);
            this.filePath = null;
            this.editorContainer.innerHTML = BLANK_EDITOR_HTML;

            return;
        }

        if (localStorage.getItem('open-tab') !== null) {
            const buttonIndex = parseInt(localStorage.getItem('open-tab'));

            this.switchToEditor(buttonIndex);

            // @ts-ignore
            this.root.querySelector("switch-editor-buttons").setActiveButton(buttonIndex);
        }
        else {
            this.switchToEditor(DEFAULT_EDITOR_INDEX);
        }
    }

    /**
     * @param {boolean} isCommitted
     * @param {string | null} fileName NOTE: if this is null, the isCommitted attribute is ignored
     */
    updateFileNameUI(isCommitted, fileName) {
        if(fileName == null){
            // @ts-ignore
            this.root.querySelector("#file-name").innerText = "-- NO FILE LOADED --";
            this.root.querySelector("#file-name").classList.add("uncommitted");
            this.isCommitted = true;

            return;
        }

        localStorage.setItem("isCommitted", isCommitted.toString());
        this.isCommitted = isCommitted;
        if (isCommitted) {
            // @ts-ignore
            this.root.querySelector("#file-name").innerText = "./" + fileName + " (committed)";
            this.root.querySelector("#file-name").classList.remove("uncommitted");
        }
        else {
            // @ts-ignore
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
            // @ts-ignore
            editorElement.value = this.editor.value;
        }

        this.editorContainer.innerHTML = "";
        this.editorContainer.appendChild(editorElement);

        this.editor = editorElement;
        localStorage.setItem('open-tab', index.toString());
    }

    async setGitLabFile(filepath) {
        if(this.filePath === null){
            this.switchToEditor(DEFAULT_EDITOR_INDEX);
        }

        this.value = await this.gitlabInterface.readFile(filepath);

        this.filePath = filepath;
        this.updateFileNameUI(true, filepath);

        localStorage.setItem('open-file', filepath);
        localStorage.setItem('content', this.value);
    }

    template() {
        return html`
        <style>
            ${styling}
        </style>
        <div class="container">
            <div class="header cf">
                <div id="file-name"></div>
                <commit-element></commit-element>
            </div>
            <div class="body">
                <div id="file-browser-container">
                    <file-browser></file-browser>
                </div>
                <div class="resize">&nbsp;</div>
                <div id="editor-container">
                    <div id="editor">
                        <raw-editor></raw-editor>
                    </div>
                    <switch-editor-buttons></switch-editor-buttons>
                    <revert-button></revert-button>
                </div>
            <div>
        </div>`
    }


}
customElements.define('overall-editor', OverallEditor);