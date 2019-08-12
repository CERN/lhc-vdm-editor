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
        this.allCampaigns = [];
        this.allIps = ["IP1", "IP2", "IP5", "IP8"];
        this.ip = "IP1";
        this.campaign = "";
    }

    connectedCallback(){
        this.render();
        this.onInitFinished();
    }

    get value(){
        return {
            ip: this.ip,
            campaign: this.campaign
        }
    }

    /**
     * @param {Event} event
     */
    handleEvent(event){
        this[event.currentTarget.name] = event.currentTarget.value;
        this.dispatchEvent(new CustomEvent("change"));
        this.render();
    }

    render() {
        return hyper(this.root)`
    <style>
        ${styling}
    </style>
    <div class="selection-box">
        <div class="selection-name">IP:</div>
        <div>
            <select name=ip onchange=${this} id="ip-select">
                ${
                    this.allIps.map(ip => 
                        wire()`<option selected=${this.ip} value=${ip}>${ip}</option>`)
                }
            </select>
        </div>
    </div>
    <div class="selection-box">
        <div class="selection-name">Campaign:</div>
        <div>
            <select name=campaign onchange=${this} id="campaign-select">
                ${
                    (async () => (await this.allCampaigns).map(campaignName => 
                        wire()`<option value=${campaignName}>${campaignName}</option>`
                    ))()
                }
            </select>
        </div>
    </div>
    `
    }
}
customElements.define('selection-boxes', IPCampaignSelectors);