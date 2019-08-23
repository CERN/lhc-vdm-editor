// @ts-check
import { css, html } from "../HelperFunctions.js";

const styling = css`
button {
    background-color: #dcdcdc;
    padding: 3px;
    font-size: 15px;
    padding-left: 7px;
    padding-right: 7px;
    border: none;
    color: #6f6f6f;
    border-radius: 4px;
    font-weight: bold;
    outline: none;
    border-style: solid;
    border-width: 2px;
    cursor: pointer;
}
button:hover {
    background-color: #bfbfbf;
}
`;

export default class RevertButton extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.render();
        this.button = this.root.querySelector("button");
        this.button.addEventListener("click", () => {
            this.dispatchEvent(new Event("revert-changes"));
        });
    }

    render() {
        hyper(this.root)`
        <style>
            ${styling}
        </style>
        <div class="container">
            <button>Revert</button>
        </div>
        `;
    }
}

customElements.define("revert-button", RevertButton);
