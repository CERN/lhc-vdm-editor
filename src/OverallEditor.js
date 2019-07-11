// @ts-check
import {css, html} from "./HelperFunctions.js"
import "./RawEditor.js"
import "./TextEditor.js"
import "./SwitchEditorButtons.js"

const styling = css`
#container {
    width: calc(100% - 30px);
    height: calc(100% - 8px);
    position: relative;
}
`

const EDITOR_TAG_NAMES = [
    "raw-editor",
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
        this.editorContainer = this.root.getElementById("editor-container");
        /** @type {any} */
        this.editor = this.root.querySelector("raw-editor");
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
        <div id="container">
            <div id="editor-container">
                <raw-editor></raw-editor>
            </div>
            <switch-editor-buttons></switch-editor-buttons>
        </div>
        `
    }
}
customElements.define('overall-editor', OverallEditor);