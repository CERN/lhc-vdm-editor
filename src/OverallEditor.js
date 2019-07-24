// @ts-check
import { css, html } from "./HelperFunctions.js"
import "./RawEditor.js"
import "./CodeEditor.js"
import "./SwitchEditorButtons.js"
import "./CommitElement.js"
import GitLab from "./GitLab.js"
import { parseVdM, deparseVdM } from "./parser.js"

const styling = css`
#editor-container {
    position: relative;
    height: calc(100% - 45px);
}
.header {
    margin-top: 5px;
    margin-bottom: 5px;
    text-align: right;
}
commit-element {
    display: inline-block;
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
    font: 16px/normal 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
}
#editor {
    height: 100%;
}
raw-editor{
    height: 100%
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
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template()
        this.root.querySelector("switch-editor-buttons").addEventListener("editor-button-press", /** @param {CustomEvent} ev */ev => {
            this.switchToEditor(ev.detail)
        });
        this.editorContainer = this.root.getElementById("editor");
        /** @type {any} */
        this.editor = this.root.querySelector("raw-editor");
        this.gitlabInterface = gitlab;
        this.root.querySelector("commit-element").addEventListener("commit-button-press", /** @param {CustomEvent} ev */ev => {
            try {
                this.gitlabInterface.writeFile(
                    filePath,
                    ev.detail,
                    deparseVdM(parseVdM(this.value))
                );
            } catch (errArr) {
                if (Array.isArray(errArr)) {
                    alert('Commit failed! Following errors encountered:\n\n' + errArr.map(x => x.message).join('\n'))
                } else throw errArr
            }
        })
        // @ts-ignore
        this.root.querySelector("#file-name").innerText = filePath;

        this.setUpAutoSave(initContent);
    }

    /**
     * @param {string} initContent
     */
    setUpAutoSave(initContent) {
        this.editorContainer.addEventListener('editor-content-change', ev => {
            // @ts-ignore
            localStorage.setItem('content', ev.detail);
        })

        if (localStorage.getItem('open-tab') !== null) {
            const buttonIndex = parseInt(localStorage.getItem('open-tab'));

            this.switchToEditor(buttonIndex);
            
            // @ts-ignore
            this.root.querySelector("switch-editor-buttons").setActiveButton(buttonIndex);
        }

        if (localStorage.getItem('content') !== null) {
            this.editor.value = localStorage.getItem('content')
        } else {
            this.editor.value = initContent
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
    switchToEditor(index, setValue=true) {
        const editorElement = document.createElement(EDITOR_TAG_NAMES[index]);
        if(setValue){
            // @ts-ignore
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
            <div class="header">
                <div id="file-name"></div>
                <commit-element></commit-element>
            </div>
            <div id="editor-container">
                <div id="editor">
                    <raw-editor></raw-editor>
                </div>
                <switch-editor-buttons></switch-editor-buttons>
            </div>
        </div>
        `
    }


}
customElements.define('overall-editor', OverallEditor);