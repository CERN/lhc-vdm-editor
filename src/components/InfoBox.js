import { css } from "../HelperFunctions.js";

const styling = css`
#icon {
    width: 17px;
    height: 17px;
    background-color: #6f6fff;
    border: 1px solid #444444;
    border-radius: 10px;

    text-align: center;
    font: normal bold 10pt "Trebuchet MS", Helvetica, sans-serif;
    color: white;

    position: relative;
    cursor: default;
}
#info {
    position: absolute;
    right: 120%;
    top: 125%;

    background-color: white;
    box-shadow: 0 0 10px 3px grey;
    border: 1px solid gray;
    border-radius: 5px;
    padding: 7px;

    color: black;
    font-size: 10pt;
    text-align: left;
    font-weight: normal;

    display: none;
}
#icon:hover #info {
    display: block;
}
#icon:hover {
    background-color: blue;
}
`;

export default class InfoBox extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.info = null;
        this.icon = null;
    }

    connectedCallback() {
        this.render();

        let styleElem = document.createElement("style");
        styleElem.innerHTML = css`
            p {
                margin: 6px 0;
            }
            p:first-of-type {
                margin: 0 0 6px 0;
            }
            p:last-of-type {
                margin: 6px 0 0 0;
            }
        `;
        this.root.host.appendChild(styleElem);
    }

    render() {
        hyper(this.root)`
        <style>
            ${styling}
        </style>
        <div id="icon">
            i
            <slot id='info'></slot>
        </div>
        `;
    }
}
customElements.define("info-box", InfoBox);
