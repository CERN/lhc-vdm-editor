import { css, html } from "./HelperFunctions.js"
import "./IPCampainSelectors.js";

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

.window-container {
    left: 0;
    right: 0;
    position: fixed;
    z-index: 10000;
    text-align: center;
    top: 15px;
}

.window {
    background-color: #f1f1f1;
    display: inline-block;
    padding: 10px;
    border: solid 5px #444444;
    font-family: sans-serif;
    border-radius: 2px;
    box-shadow: grey 0 0 8px 3px;
    text-align: left;
}

button {
    background-color: #f1f1f1;
    border: solid #656565 2px;
    margin: 3px;
    padding: 6px;
    padding-left: 15px;
    padding-right: 15px;
    border-radius: 3px;
    box-shadow: #c1c1c1 0px 0px 0px 1px;
}

button:hover {
    background-color: #d6d6d6;
}

button:active {
    background-color: #a2a2a2;
}

.buttons{
    float: right;
}

.selection-boxes-container{
    margin-left: 7px;
    margin-top: 7px;
}
`

export default class CreateFileWindow extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();
        this.root.querySelector(".cover").addEventListener("click", () => {
            this.cancel();
        })

        /**
         * @param event {KeyboardEvent}
         */
        function onKeyUp(event){
            if(event.keyCode == 27/*esc*/){
                this.cancel();
            }
        }

        this.onKeyUp = onKeyUp.bind(this);
        this.root.addEventListener("keyup", this.onKeyUp);
        this.root.querySelector("#cancel-button").addEventListener("click", () => {
            this.cancel();
        })
        this.root.querySelector("#ok-button").addEventListener("click", () => {
            const selectionBoxes = this.root.querySelector("selection-boxes");

            this.dispatchEvent(new CustomEvent("submit", {
                detail: {
                    ip: "something",
                    campain: "something else"
                }
            }));
        })
    }

    disconnectedCallback(){
        document.removeEventListener("keyup", this.onKeyUp);
    }

    cancel(){
        this.dispatchEvent(new CustomEvent("cancel"));
    }

    passInValues(gitlab){
        // @ts-ignore
        this.root.querySelector("selection-boxes").passInValues(gitlab);
    }

    template() {
        return html`
        <style>
            ${styling}
        </style>
        <div class="window-container">
            <div class="window">
                Copy items from:
                <div class="selection-boxes-container">
                    <selection-boxes></selection-boxes>
                </div>
                <br />
                <div>
                    <button id="ok-button">OK</button><button id="cancel-button">Cancel</button>
                </div>
            </div>
        </div>
        <div class="cover">&nbsp;</div>
        `
    }
}
customElements.define('create-file-window', CreateFileWindow);