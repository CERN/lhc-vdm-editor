import { css, removeLineNumbers, addLineNumbers } from "../HelperFunctions.js"
import "./SwitchEditorButtons.js"

const styling = css`
textarea {
    resize: none;
    display: inline-block;
    width: calc(100% - 10px);
    min-height: 40px;
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
        this.render()
        this.textarea = this.root.querySelector("textarea");
        this.textarea.addEventListener('input',
            () => {
                this.dispatchEvent(new CustomEvent("editor-content-change", {
                    bubbles: true,
                    detail: this.value
                }));

                this.resizeTextArea();
            }
        );
        // Is needed as a placeholder
        this.VdM = null;
    }

    connectedCallback() {
        // When we are attached to the DOM, we know the scroll height
        this.resizeTextArea();
    }

    resizeTextArea() {
        // Hack to make sure that the textarea always has the height of the content
        this.textarea.style.height = "0px";
        this.textarea.style.height = this.textarea.scrollHeight + 'px';
    }

    get rawValue() {
        return this.value;
    }

    set rawValue(newRawValue) {
        this.value = newRawValue;
    }

    get value() {
        return this.textarea.value;
    }

    set value(newValue) {
        this.textarea.value = newValue;

        this.resizeTextArea();
    }

    /**
     * Inserts generated content at the cursor, putting it on a new blank line after the current cursor
     * @param {any} newContent
     */
    insertGeneratedContent(newContent){
        const cursorPos = this.textarea.selectionEnd;
        const nextNewLine = this.value.slice(cursorPos).search("\n") + cursorPos;
        this.value = addLineNumbers(removeLineNumbers(
            this.value.slice(0, nextNewLine) +  (this.value.trim() == "" ? "": "\n") + newContent + this.value.slice(nextNewLine)
        ))

        this.textarea.focus();
    }

    render() {
        hyper(this.root)`
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