import { css, html } from "./HelperFunctions.js"
import "./SwitchEditorButtons.js"

const styling = css`
textarea {
    resize: none;
    display: inline-block;
    /*border-width: 0px;*/
    height: 100%;
    width: 100%;
    padding: 5px;
}
.container {
    width: inherit;
    height: inherit;
    position: relative;
}
.buttons-container {
    position: absolute;
    top: 5px;
    right: 5px;
}
button {
    background-color: #dcdcdc;
    padding: 6px;
    font-size: 16px;
    padding-left: 10px;
    padding-right: 10px;
    border: none;
    color: #6f6f6f;
    border-radius: 4px;
    margin: 1px;
    font-weight: bold;
    outline: none;
}
button:hover {
    background-color: #bfbfbf;
}
button.active{
    border-style: solid;
    border-width: 2px;
}
`

export default class RawEditor extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.appendChild(this.template())
        this.textarea = this.root.querySelector("textarea");
        $(this.textarea).change(() => {
            this.dispatchEvent(new CustomEvent("editor-content-change", { bubbles: true }))
        })
    }

    get value() {
        return this.textarea.innerHTML;
    }

    set value(newValue) {
        this.textarea.innerHTML = newValue;
    }

    template() {
        return html`
        <div class="container">
            <style>
                ${styling}
            </style>
            <textarea autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
        </div>
        `
    }
}
customElements.define('raw-editor', RawEditor);