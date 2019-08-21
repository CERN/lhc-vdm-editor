import { css } from "../HelperFunctions.js";

const styling = css`        

`

export default class MyPrompt extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this.render();

        this.selectionBoxes = this.root.querySelector("ip-campaign-selectors");

        /**
         * @param event {KeyboardEvent}
         */
        function onKeyUp(event) {
            if (event.keyCode == 27/*esc*/) {
                this.cancel();
            }
        }

        this.onKeyUp = onKeyUp.bind(this);
        document.body.addEventListener("keyup", this.onKeyUp);
    }

    disconnectedCallback() {
        document.removeEventListener("keyup", this.onKeyUp);
    }

    cancel() {
        this.dispatchEvent(new CustomEvent("cancelmodel", {
            bubbles: true,
            composed: true
        }));
    }

    render() {
        hyper(this.root)`
        <style>
            ${styling}
        </style>
        <model-window>
        </model-window>
        `
    }
}
customElements.define('model-window', MyPrompt);