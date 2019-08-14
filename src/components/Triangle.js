import { css, html } from "../HelperFunctions.js";

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
    top: 0px;
    left: 0px;
}

.triangle-open {
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 8px solid grey;
    top: -1px;
    left: 0px;
}

.triangle-container {
    height: 0px;
    width: 0px;
}
`

export default class Triangle extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();
        this.triangle = this.root.querySelector('.triangle');
        this.openState = false;
    }

    set open(newState){
        if (newState) {
            this.openState = newState;
            this.triangle.classList.remove("triangle-closed");
            this.triangle.classList.add("triangle-open");
        }
        else {
            this.openState = newState;
            this.triangle.classList.remove("triangle-open");
            this.triangle.classList.add("triangle-closed");
        }
    }

    get open(){
        return this.openState
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

Triangle.observedAttributes = ["open"];

customElements.define('folder-triangle', Triangle);
