// @ts-check
import { css, html } from "../HelperFunctions.js";

const styling = css`
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
    cursor: pointer;
}
button:hover {
    background-color: #bfbfbf;
}
button.active{
    border-style: solid;
    border-width: 2px;
    background-color: #bfbfbf;
}
`;

export default class SwitchEditorButtons extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.render();
        /** @access private */
        this.activeButtonIndex = 0;
        this.DOMbuttons = Array.from(this.root.querySelectorAll("button"));

        this.DOMbuttons.map((x, i) => {
            x.addEventListener("click", () => {
                this.selectButton(i);
            });
        });
    }

    /**
     * @public
     * @param {number} index
     */
    setActiveButton(index) {
        this.DOMbuttons[this.activeButtonIndex].classList.remove("active");
        this.DOMbuttons[index].classList.add("active");

        this.activeButtonIndex = index;
    }

    /**
     * @private
     * @param {number} buttonIndex
     */
    selectButton(buttonIndex) {
        this.setActiveButton(buttonIndex);

        this.dispatchEvent(new CustomEvent("editor-button-press", {
            detail: buttonIndex
        }));
    }

    render() {
        hyper(this.root)`
        <style>
            ${styling}
        </style>
        <div class="container">
            <button>Raw</button>
            <button>Code</button>
        </div>
        `;
    }
}

customElements.define("switch-editor-buttons", SwitchEditorButtons);
