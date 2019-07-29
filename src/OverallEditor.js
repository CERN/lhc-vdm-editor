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
    width: calc(100% - 270px);
    float: right
}

.header {
    margin-top: 5px;
    margin-bottom: 10px;
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
    width: 260px;
    display: inline-block;
    height: calc(100% - 45px);
    margin-right: 5px;
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
`

const EDITOR_TAG_NAMES = [
    "raw-editor",
    "code-editor",
]


export default class OverallEditor extends HTMLElement {
    /**
     * @param {GitLab} gitlab
     * @param {string} filePath
     */
    constructor(gitlab, filePath, initContent = '') {
        super();
        this.isCommitted = true;
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template()
        this.root.querySelector("switch-editor-buttons").addEventListener("editor-button-press", /** @param {CustomEvent} ev */ev => {
            this.switchToEditor(ev.detail)
        });
        this.root.querySelector('revert-button').addEventListener('revert-changes', () => {
            if (!this.isCommitted) {
                if (confirm('Changes not committed. Are you sure you want to revert to HEAD? All current changes will be discarded.')) {
                    this.setGitLabFile(localStorage.getItem('open-file'))
                }
            } else {
                this.setGitLabFile(localStorage.getItem('open-file'))
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

        this.editorContainer = this.root.getElementById("editor");
        /** @type {any} */
        this.editor = this.root.querySelector("raw-editor");
        this.gitlabInterface = gitlab;
        // @ts-ignore
        this.root.querySelector("file-browser").passInValues(gitlab);

        this.root.querySelector("commit-element").addEventListener("commit-button-press", /** @param {CustomEvent} ev */ev => {
            try {
                this.gitlabInterface.writeFile(
                    filePath,
                    ev.detail,
                    deparseVdM(parseVdM(this.value))
                );

                this.setCommittedStatus(true);
            } catch (errArr) {
                if (Array.isArray(errArr)) {
                    alert('Commit failed! Following errors encountered:\n\n' + errArr.map(x => x.message).join('\n'))
                } else throw errArr
            }
        })
        this.filePath = filePath;

        this.editorContainer.addEventListener('editor-content-change', ev => {
            // @ts-ignore
            localStorage.setItem('content', ev.detail);
            this.setCommittedStatus(false);
        })

        const isLocallyStored = this.setUpAutoSave(initContent);
        if (isLocallyStored) {
            this.setCommittedStatus(false);
        }
        else {
            this.setCommittedStatus(true);
        }
    }

    /**
     * @param {string} initContent
     * @returns {boolean} - returns whether we have restored the value from local storage
     */
    setUpAutoSave(initContent) {
        if (localStorage.getItem('open-tab') !== null) {
            const buttonIndex = parseInt(localStorage.getItem('open-tab'));

            this.switchToEditor(buttonIndex);

            // @ts-ignore
            this.root.querySelector("switch-editor-buttons").setActiveButton(buttonIndex);
        }
        else {
            this.switchToEditor(1); // the default editor is the code editor
        }

        if (localStorage.getItem('content') !== null) {
            this.editor.value = localStorage.getItem('content')

            return true;
        } else {
            this.editor.value = initContent;

            return false;
        }
    }

    /**
     * @param {boolean} isCommitted
     */
    setCommittedStatus(isCommitted) {
        this.isCommitted = isCommitted;
        if (isCommitted) {
            // @ts-ignore
            this.root.querySelector("#file-name").innerText = "./" + this.filePath + " (committed)";
            this.root.querySelector("#file-name").classList.remove("uncommitted");
        }
        else {
            // @ts-ignore
            this.root.querySelector("#file-name").innerText = "./" + this.filePath + " (uncommitted)";
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
        this.value = await this.gitlabInterface.readFile(filepath);
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
            <div id="file-browser-container">
                <file-browser></file-browser>
            </div>
            <div id="editor-container">
                <div id="editor">
                    <raw-editor></raw-editor>
                </div>
                <switch-editor-buttons></switch-editor-buttons>
                <revert-button></revert-button>
            </div>
        </div>`
    }


}
customElements.define('overall-editor', OverallEditor);