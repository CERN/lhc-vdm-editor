import { css, html } from "./HelperFunctions.js";

const styling = css`
    .selection-box{
        padding-top: 5px;
        padding-bottom: 5px;
    }

    .selection-box select {
        padding: 2px;
    }

    .selection-name {
        padding-bottom: 3px;
    }
`
export default class Selectors extends HTMLElement {
    constructor() {
        super()
        this.root = this.attachShadow({ mode: 'open' });
        this.root.innerHTML = this.template();

        Array.from(this.root.querySelectorAll("#ip-select, #campain-select")).map(x => x.addEventListener("change", () => {
            this.dispatchEvent(new CustomEvent('change'))
        }));
    }

    /**
     * @param {GitLab} gitlab
     */
    passInValues(gitlab) {
        (async () => {
            const campains = await gitlab.listCampains();
            this.root.getElementById("campain-select").innerHTML = campains.map(campainName => {
                return html`<option value=${campainName}>${campainName}</option>`
            }).join("\n");
        })();
    }
    get ip() {
        return this.root.getElementById("ip-select").value;
    }
    get campain() {
        return this.root.getElementById("campain-select").value;
    }

    template() {
        return html`
    <style>
        ${styling}
    </style>
    <div class="selection-box">
        <div class="selection-name">IP:</div>
        <div>
            <select id="ip-select">
                <option value="IP1">IP1</option>
                <option value="IP2">IP2</option>
                <option value="IP5">IP5</option>
                <option value="IP8">IP8</option>
            </select>
        </div>
    </div>
    <div class="selection-box">
        <div class="selection-name">Campain:</div>
        <div>
            <select id="campain-select">
            </select>
        </div>
    </div>
    `
    }
}
customElements.define('selection-boxes', Selectors);