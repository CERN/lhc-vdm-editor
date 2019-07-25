// @ts-check
import {css, html} from "./HelperFunctions.js"

const styling = css`
.container {
    position: absolute;
    top: 50px;
    right: 20px;
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
`

export default class RevertButton extends HTMLElement {
    constructor(){
        super();
        this.root = this.attachShadow({mode: "open"});
        this.root.innerHTML = this.template();
        this.button = this.root.querySelector("button");
        this.button.addEventListener('click', () => {
            if (confirm('Are you sure you want to revert to HEAD? All changes will be discarded.')){
                this.dispatchEvent(new Event('revert-changes'))
            }
        })
    }

    template(){
        return html`
        <style>
            ${styling}
        </style>
        <div class="container">
            <button>Revert</button>
        </div>
        `
    }
}

customElements.define('revert-button', RevertButton);