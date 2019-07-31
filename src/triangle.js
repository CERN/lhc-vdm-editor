import { css, html } from "./HelperFunctions.js";

const styling = css`
.triangle {
    width: 0px;
    height: 0px;
    position: relative;
    display: inline-block;
}
.triangle-closed {
    border-left: 8px solid grey;
    border-bottom: 5px solid transparent;
    border-top: 5px solid transparent;
    top: 1px;
    left: -10px;
}
.triangle-open {
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 8px solid grey;
    top: 0px;
    left: -10px;
}
.triangle-container {
    height: 0px;
    width: 0px;
}
`

export default class CreateFileWindow extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();
    }
    set isOpen(isOpen){
        if (isOpen) {
            this.classList.remove("triangle-open");
            this.classList.add("triangle-closed");
        }
        else {
            this.classList.remove("triangle-closed");
            this.classList.add("triangle-open");
        }
    }
    template() {
        return html`
        <style>
            ${styling}
        </style>
        <div class="triangle-container">
            <span class="triangle triangle-closed"></span>
        </div>
    `
    }
}