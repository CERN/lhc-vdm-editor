// @ts-check
import {css, html} from "./HelperFunctions.js"

const styling = css`
.commit-button {
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
}
.commit-button:hover {
    background-color: #bfbfbf;
}
.commit-message {
    padding: 5px;
    border-radius: 7px;
    border-style: solid;
    border-width: 1px;
    border-color: #6f6f6f;
    margin-right: 7px;
    width: 350px;
}
`

export default class CommitElement extends HTMLElement {
    constructor(){
        super();
        this.root = this.attachShadow({mode: "open"});
        this.root.appendChild(this.template())
    }

    template(){
        return html`
        <style>
            ${styling}
        </style>
        <input class="commit-message" type="input" placeholder="Commit message" />
        <button class="commit-button">Commit</button>
        `
    }
}
customElements.define('commit-element', CommitElement);