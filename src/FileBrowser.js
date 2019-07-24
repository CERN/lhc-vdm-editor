// @ts-check
import { css, html } from "./HelperFunctions.js"

const styling = css`
#file-browser {
    border-style: solid;
    border-width: 1px;
    padding: 3px;
    border-color: #dadada;
}

.file {
    background-color: #ededed;
    padding: 3px;
    font-family: sans-serif;
    font-size: 14px;
}

.file:nth-child(2n) {
    background-color: #f7f7f7;
}

.triangle {
    width: 0px;
    height: 0px;
    border-left: 5px solid grey;
    border-bottom: 5px solid transparent;
    border-top: 5px solid transparent;
    position: relative;
    top: 7px;
    padding-right: 3px;
    left: 3px;
    display: inline-block;
}

.text {
    display: inline-block;
}
`

export default class FileBrowser extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.appendChild(this.template());
    }

    template() {
        return html`
        <style>
            ${styling}
        </style>
        <div id="file-browser">
            <div class="file">
                <span class="triangle">&nbsp;</span>
                <span class="text">FileA.txt</span>
            </div>
            <div class="file">FileB.txt</div>
            <div class="file">FileC.txt</div>
        </div>
        `
    }
}
customElements.define('file-browser', FileBrowser);