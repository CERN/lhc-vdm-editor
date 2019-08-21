import { css } from "../HelperFunctions.js";

const styling = css`        
.cover{
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    background-color: #00000075;
    z-index: 1000;
}

.container {
    left: 0;
    right: 0;
    position: fixed;
    z-index: 1000;
    text-align: center;
    top: 15px;
}

.window {
    background-color: #f1f1f1;
    display: inline-block;
    border: solid 5px #444444;
    font-family: sans-serif;
    border-radius: 2px;
    box-shadow: grey 0 0 8px 3px;
    text-align: left;
    position: relative;
    z-index: 10000;
}

button {
    background-color: #f1f1f1;
    border: solid #656565 2px;
    margin: 5px 3px 5px 3px;
    padding: 6px;
    padding-left: 15px;
    padding-right: 15px;
    border-radius: 3px;
    box-shadow: #c1c1c1 0px 0px 0px 1px;
}

button[disabled] {
    box-shadow: none;
    cursor: not-allowed;
}

#exit-button {
    width: 34px;
    height: 20px;
    background-color: #ff8484;
    border: 1px solid #ff8484;
    text-align: center;
    border-radius: 30px;
    font-family: monospace;
    font-size: 15px;
    position: absolute;
    right: -19px;
    top: -13px;
    color: white;
    cursor: pointer;
}
#exit-button:hover {
    background-color: #ca5151;
}

`

export default class ModelWindow extends HTMLElement {
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
        <div class="container">
            <div class="window">
                <div onclick=${() => this.cancel()} id="exit-button">x</div>
                <slot></slot>
            </div>
            
            <div onclick=${() => this.cancel()} class="cover">&nbsp;</div>
        </div>
        `
    }
}
customElements.define('model-window', ModelWindow);