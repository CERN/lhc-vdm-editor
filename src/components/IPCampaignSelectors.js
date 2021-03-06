import { html as oldHtml, css, joinFilePaths } from "../HelperFunctions.js";
import { MyHyperHTMLElement } from "./MyHyperHTMLElement.js";

const styling = css`
    .selection-box{
        margin: 10px 0 10px 0;
    }

    .selection-box select {
        padding: 7px;
        border-radius: 3px;
        border: solid 1px grey;
        width: 100%;
        box-sizing: border-box;
    }

    .selection-name {
        padding-bottom: 3px;
    }
`;

export default class IPCampaignSelectors extends MyHyperHTMLElement {
    constructor() {
        super({
            ip: "IP1",
            campaign: undefined
        });
        this.root = this.attachShadow({ mode: "open" });
        this.waitForInit = new Promise((resolve, _) => {
            this.onInitFinished = resolve;
        });
        this.allCampaigns = [];
        this.allIps = ["IP1", "IP2", "IP5", "IP8"];
    }

    get path() {
        return joinFilePaths(this.campaign, this.ip);
    }

    get name() {
        return this.getAttribute("name");
    }

    async connectedCallback() {
        if(this.campaign == undefined) this.campaign = (await this.allCampaigns)[0];
        this.onInitFinished();
        this.render();
    }

    get value() {
        return {
            ip: this.ip,
            campaign: this.campaign
        };
    }

    /**
     * @param {Event} event
     */
    handleEvent(event) {
        // @ts-ignore
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
                ${this.allIps.map(ip => wire(this.allIps, ip)`<option selected=${this.ip == ip} value=${ip}>${ip}</option>`)}
            </select>
        </div>
    </div>
    <div class="selection-box">
        <div class="selection-name">Campaign:</div>
        <div>
            <select name=campaign onchange=${this} id="campaign-select">
                ${(async () => (await this.allCampaigns).map(campaign =>
                    wire(this.allCampaigns, campaign)`<option selected=${this.campaign == campaign} value=${campaign}>${campaign}</option>`
                ))()}
            </select>
        </div>
    </div>
    `;
    }
}

customElements.define("ip-campaign-selectors", IPCampaignSelectors);
