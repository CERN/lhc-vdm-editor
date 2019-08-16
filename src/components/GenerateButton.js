// @ts-check
import { css, html } from "../HelperFunctions.js"
import Generator from '../generator.js'

const windowStyling = css`        
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
    padding: 15px;
    border: solid 5px #444444;
    font-family: sans-serif;
    border-radius: 2px;
    box-shadow: grey 0 0 8px 3px;
    text-align: left;
    position: relative;
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
    float: right;
}

button:hover {
    background-color: #d6d6d6;
    cursor: pointer;
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

.top-space{
    margin-top: 50px;
}
.tiny{
    font-size: 8pt;
    width: 100%;
    margin: 3px;
}

input{
    padding: 7px;
    border-radius: 3px;
    border: solid 1px grey;
    margin: 5px 0 5px 0;
}
`

export class GenerateSequenceWindow extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();
        this.generator = new Generator('IP1')

        this.root.querySelector('#function-generate').addEventListener('click', () => {
            let newLines = this.genFromFunctionInput()
            this.dispatchEvent(new CustomEvent('generated-lines', { detail: newLines, bubbles: true }));
        });
        this.root.querySelector('#array-generate').addEventListener('click', () => {
            let newLines = this.genFromArrayInput()
            this.dispatchEvent(new CustomEvent('generated-lines', { detail: newLines, bubbles: true }));
            console.log(newLines)
        });
    }

    genFromArrayInput() {
        const allInputs = this.root.querySelector('#arrays').querySelectorAll('input');
        const waitTime = allInputs[0].value;

        let resArr = Array(4);
        const arrayInputs = Array.from(allInputs).slice(1);
        arrayInputs.forEach((elem, i) => {
            const input = elem.value;
            let arr = input.replace(/\[|\]/, '').split(',').map(x => x.trim()).filter(x => x == '');
            resArr[i] = arr;
        });

        return this.generator.generateFromArray(resArr, waitTime);
    }

    cancel() {
        this.dispatchEvent(new CustomEvent("cancel", { bubbles: true }));
    }

    connectedCallback() {
        this.root.querySelector(".cover").addEventListener("click", () => this.cancel())

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
        this.root.querySelector("#exit-button").addEventListener("click", () => this.cancel())
    }


    disconnectedCallback() {
        document.removeEventListener("keyup", this.onKeyUp);
    }

    template() {
        return html`
        <style>
            ${windowStyling}
        </style>
        <div class="window-container">
            <div class="window">
                <div id="exit-button">x</div>
                
                <div id='functions'>
                    <div>Generate scan from functions</div>
                    <hr>
                    <div>
                        <input id="wait-time" type="number" placeholder="Time between trims">
                        <input id="step-number" type="number" placeholder="Number of steps">
                    </div>
                    <div>
                        <input type="text" placeholder="Beam 1 Separation">
                        <input type="text" placeholder="Beam 2 Separation">
                    </div>
                    <div>
                        <input type="text" placeholder="Beam 1 Crossing">
                        <input type="text" placeholder="Beam 2 Crossing">
                    </div>
                    <div class='tiny'>
                        *Currently supported functions include: linear(startpos, endpos)
                    </div>
                    <button id='function-generate'>Generate at cursor</button>
                </div>
                
                <div id='arrays'>
                    <div class='top-space'>Generate scan from position arrays</div>
                    <hr>
                    <input type="number" placeholder="Time between trims">
                    <div>
                        <input type="text" placeholder="Beam 1 Separation">
                        <input type="text" placeholder="Beam 2 Separation">
                    </div>
                    <div>
                        <input type="text" placeholder="Beam 1 Crossing">
                        <input type="text" placeholder="Beam 2 Crossing">
                    </div>
                    <button id='array-generate'>Generate at cursor</button>
                </div>
            </div>
        </div>
        <div class="cover">&nbsp;</div>
        `
    }
}
customElements.define('generate-sequence-window', GenerateSequenceWindow);















const buttonStyling = css`
button {
    background-color: #dcdcdc;
    padding: 6px;
    font-size: 16px;
    padding-left: 10px;
    padding-right: 10px;
    border: none;
    color: #6f6f6f;
    border-radius: 4px;
    margin: 5px 0 0 0;
    font-weight: bold;
    outline: none;
    cursor: pointer;
    width: 100%;
}
button:hover {
    background-color: #bfbfbf;
}
button.active{
    border-style: solid;
    border-width: 2px;
    background-color: #bfbfbf;
}
`
export class GenerateButton extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.render()
        this.button = this.root.querySelector("button");
        this.generateSequenceWindow = '';

        this.button.addEventListener("click", () => {
            this.button.classList.add('active')
            this.generateSequenceWindow = wire()`<generate-sequence-window></generate-sequence-window>`
            this.render()
        })
        this.root.addEventListener('cancel', () => {
            this.button.classList.remove('active')
            this.generateSequenceWindow = '';
            this.render()
        })
    }

    render() {
        hyper(this.root)`
        <style>
            ${buttonStyling}
        </style>
        <button>Generate</button>
        ${this.generateSequenceWindow}
        `
    }
}
customElements.define('generate-button', GenerateButton);