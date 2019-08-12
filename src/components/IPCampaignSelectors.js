import { html2 as html, html as oldHtml, css } from "../HelperFunctions.js";
import GitLab from "../GitLab.js";

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

export default class IPCampaignSelectors extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: 'open' });
        this.waitForInit = new Promise((resolve, _) => {
            this.onInitFinished = resolve;
        });

        this.campaigns = [];
        this.render();
    }

    /**
     * @param {GitLab} gitlab
     */
    async passInValues(gitlab) {
        this.campaigns = (await gitlab.listCampaigns()).reverse();
        this.render();

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

    render() {
        return hyper(this.root)`
    <style>
        ${styling}
    </style>
    <div class="selection-box">
        <div class="selection-name">IP:</div>
        <div>
            <select onchange=${() => this.dispatchEvent(new CustomEvent("change"))} id="ip-select">
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
            <select onchange=${() => this.dispatchEvent(new CustomEvent("change"))} id="campaign-select">
                ${
                    this.campaigns.map(campaignName => 
                        wire()`<option value=${campaignName}>${campaignName}</option>`
                    )
                }
            </select>
        </div>
    </div>
    `
    }
}
customElements.define('selection-boxes', IPCampaignSelectors);