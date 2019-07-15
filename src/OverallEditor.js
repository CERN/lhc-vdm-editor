// @ts-check
import {css, html} from "./HelperFunctions.js"
import "./RawEditor.js"
import "./TextEditor-ace.js"
import "./SwitchEditorButtons.js"
import "./CommitElement.js"

const styling = css`
#editor-container {
    height: inherit;
    position: relative;
    height: calc(100% - 17px);
}
.header {
    margin-top: 5px;
    margin-bottom: 5px;
    text-align: right;
}
.container {
    width: calc(100% - 30px);
    height: calc(100% - 8px);
    max-width: 1300px;
    margin: 0 auto;
}
`

const EDITOR_TAG_NAMES = [
    "text-editor",
    "raw-editor",
    "raw-editor"
]


export default class OverallEditor extends HTMLElement {
    constructor(){
        super();
        this.root = this.attachShadow({mode: "open"});
        this.root.appendChild(this.template())
        this.root.querySelector("switch-editor-buttons").addEventListener("editor-button-press", ev => {
            // @ts-ignore
            this.switchToEditor(ev.detail)
        });
        this.editorContainer = this.root.getElementById("editor");
        /** @type {any} */
        this.editor = this.root.querySelector("text-editor");
    }

    
    get value(){
        return this.editor.value;
    }

    set value(newValue){
        this.editor.value = newValue;
    }

    /**
     * @param {number} index
     */
    switchToEditor(index){
        const editorElement = document.createElement(EDITOR_TAG_NAMES[index]);
        // @ts-ignore
        editorElement.value = this.editor.value;

        this.editorContainer.innerHTML = "";
        this.editorContainer.appendChild(editorElement);

        this.editor = editorElement;
    }

    template(){
        return html`
        <style>
            ${styling}
        </style>
        <div class="container">
            <div class="header">
                <commit-element></commit-element>
            </div>
            <div id="editor-container">
                <div id="editor">
                    <text-editor></text-editor>
                </div>
                <switch-editor-buttons></switch-editor-buttons>
            </div>
        </div>
        `
    }
}
customElements.define('overall-editor', OverallEditor);