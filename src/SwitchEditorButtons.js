// @ts-check
import {css, html} from "./HelperFunctions.js"

const styling = css`
.container {
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

export default class SwitchEditorButtons extends HTMLElement {
    constructor(){
        super();
        this.root = this.attachShadow({mode: "open"});
        this.root.appendChild(this.template());
        /** @access private */
        this.activeButtonIndex = 0;
        this.DOMbuttons = Array.from(this.root.querySelectorAll("button"));
        this.selectButton(0);

        this.DOMbuttons.map((x, i) => {
            x.addEventListener("click", () => {
                this.selectButton(i);
            })
        })
    }

    /**
     * @public
     * @param {number} index
     */
    setActiveButton(index){
        this.DOMbuttons[this.activeButtonIndex].classList.remove("active");
        this.DOMbuttons[index].classList.add("active");
    }

    /**
     * @private
     * @param {number} buttonIndex
     */
    selectButton(buttonIndex) {
        this.setActiveButton(buttonIndex);

        this.activeButtonIndex = buttonIndex;

        this.dispatchEvent(new CustomEvent("editor-button-press", {
            detail: buttonIndex
        }))
    }

    template(){
        return html`
        <style>
            ${styling}
        </style>
        <div class="container">
            <button>Raw</button>
            <button>Code</button>
        </div>
        `
    }
}

customElements.define('switch-editor-buttons', SwitchEditorButtons);