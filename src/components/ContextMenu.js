// TODO: refractor the context menu out to this

import { css, html } from "../HelperFunctions.js";

const styling = css`
`

export default class ContextMenu extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();
    }

    template() {
        return html`
        <style>
            ${styling}
        </style>
    `
    }
}
customElements.define('context-menu', ContextMenu);