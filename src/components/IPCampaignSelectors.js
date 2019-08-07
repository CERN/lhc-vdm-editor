import { css, html } from "../HelperFunctions.js";
import GitLab from "../GitLab.js"

const styling = css`
    .selection-box{
        margin: 10px 0 10px 0;
    }

    .selection-box select {
        padding: 2px;
        width: 100%;
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
        this.waitForInit = new Promise((resolve, _) => {
            this.onInitFinished = resolve;
        })

        Array.from(this.root.querySelectorAll("#ip-select, #campaign-select")).map(x => x.addEventListener("change", () => {
            this.dispatchEvent(new CustomEvent('change'))
        }));
    }

    /**
     * @param {GitLab} gitlab
     */
    async passInValues(gitlab) {
        const campaigns = (await gitlab.listCampaigns()).reverse();
        this.root.getElementById("campaign-select").innerHTML = campaigns.map(campaignName => {
            return html`<option value=${campaignName}>${campaignName}</option>`
        }).join("\n");

        this.onInitFinished();
    }

    get ip() {
        return this.root.getElementById("ip-select").value;
    }

    set ip(newIp){
        this.root.getElementById("ip-select").value = newIp;
    }

    get campaign() {
        return this.root.getElementById("campaign-select").value;
    }

    set campaign(newCampaign){
        this.root.getElementById("campaign-select").value = newCampaign;
    }

    get path() {
        return this.campaign + '/' + this.ip
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
        <div class="selection-name">Campaign:</div>
        <div>
            <select id="campaign-select">
            </select>
        </div>
    </div>
    `
    }
}
customElements.define('selection-boxes', Selectors);