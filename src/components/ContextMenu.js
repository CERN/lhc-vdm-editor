import { css } from "../HelperFunctions.js";

const styling = css`
.context-menu {
    position: fixed;
    background-color: #fbfbfb;
    border: #c1c1c1 solid 2px;
    z-index: 100000;
}

.context-menu-item[disabled=true] {
    color: #949494;
    background-color: #f1f1f1;
    cursor: not-allowed;
}

.context-menu-item {
    padding: 8px;
    padding-right: 11px;
    border-top: #c1c1c1 solid 1px;
}

.context-menu-item:first-child {
    border-top: none;
}

.context-menu-item:hover{
    background-color: #e6e6e6;
}

.context-menu-item:active{
    background-color: #cccccc;
}
`;

export default class ContextMenu extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.buttons = [];
        this.allButtonsDisabled = false;
        this.x = 0;
        this.y = 0;
    }

    connectedCallback() {
        this.render();
    }

    /**
     * @param {{ onActivate: (arg0: () => void) => void; pending: boolean; }} button
     */
    handleButtonClick(button) {
        button.onActivate(() => {
            this.allButtonsDisabled = true;
            button.pending = true;

            this.render();
        });
    }

    render() {
        hyper(this.root)`
        <style>
            ${styling}
        </style>
        <div style=${{
                top: `${this.y}px`,
                left: `${this.x}px`
            }} class="context-menu">
            ${
            this.buttons.map(button =>
                wire(button)`<div id="delete-button"
                        disabled=${this.allButtonsDisabled}
                        onclick=${() => this.handleButtonClick(button)} class="context-menu-item">
                        ${ button.pending ? button.pendingMessage : button.name}
                    </div>`
            )
            }
        </div>
    `;
    }
}
customElements.define("context-menu", ContextMenu);
