// @ts-check
import { css, html } from "../HelperFunctions.js";
import { default as Generator, ArgError } from "../generator.js";
import "./InfoBox.js";

const windowStyling = css`
.tab{
    margin: 15px;
    display: none;
}

button[id$=generate] {
    background-color: #f1f1f1;
    border: solid #656565 2px;
    margin: 10px;
    padding: 6px;
    padding-left: 15px;
    padding-right: 15px;
    border-radius: 3px;
    box-shadow: #c1c1c1 0px 0px 0px 1px;
    float: right;
}

button[id$=generate]:hover {
    background-color: #d6d6d6;
    cursor: pointer;
}


.tiny{
    font-size: 8pt;
    width: 100%;
    margin: 3px;
    text-align: left;
}

input, select{
    padding: 7px;
    border-radius: 3px;
    border: solid 1px grey;
    margin: 5px 5px 5px 5px;
    width: 180px;
    box-sizing: border-box;
}

input.error{
    box-shadow: 0 0 0px 1px red;
}

.tabs button{
    padding: 8px 16px;
    float: left;
    width: auto;
    border: none;
    outline: 0;
    vertical-align: middle;
    text-align: center;
    cursor: pointer;
}

.tabs button:hover{
    background-color: #ccc;
}

.tabs button.open{
    background-color: #616161;
    color: white;
    border-radius: 0 0 10px 0px;
}

.tabs{
    width: 100%;
    border-bottom: 1px solid #ccc;
    box-sizing: border-box;
    background-color: #dddddd;
}
.tabs::after{
    content: "";
    display: table;
    clear: both;
}
.tabs::before{
    content: "";
    display: table;
    clear: both;
}

info-box {
    float: right;
}
`;

const VdMInfoText = wire()`
    <div style='width: 300px'>
        <p>
            The generated sequence will be inserted at the current position of the cursor in the editor.
        </p>
        <p>
            To generate a Van der Meer type scan, choose which beam(s) that will be moving, and fill in the four numbers.
        </p>
    </div>
`;
const arrayInfoText = wire()`
    <div style='width: 300px'>
        <p>
            The generated sequence will be inserted at the current position of the cursor in the editor.
        </p>
        <p>
            Supply a comma-separated 1-dimentional array of <strong>absolute</strong> beam positions. All four arrays are read simultaneously one entry at a time. If arrays are of unequal lengths, overflow is interpreted as zeros.
        </p>
        <p>
            Empty inputs are equivalent to zero-arrays.
        </p>
    </div>
`;
const functionInfoText = wire()`
    <div style='width: 300px'>
        <p>
            The generated sequence will be inserted at the current position of the cursor in the editor.
        </p>
        <p>
            Put in numbers and functions to define the <strong>absolute</strong> position of the beams. Empty inputs are interpreted as zero-functions.
        </p>
        <p>
            Input functions can be sums, i.e: <br>4 - linear(-4, 4) + periodic(2, 1)
        </p>
        <p>
            A linear scan is equivalent to a Van der Meer scan
        </p>
        <p>
            Currently supported functions include:
            <div style='margin-left: 40px;'>
                linear(startpos (&sigma;), endpos (&sigma;))<br>periodic(period (s), amplitude (&sigma;))
            </div>
        </p>
    </div>
`;

export class GenerateSequenceWindow extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this._ip = "IP1";
        this.generator = null;
        this.allInputs = null;
        this.tabButtons = null;
        this.allTabs = null;
    }

    /**
     * @param {string} newLines
     */
    onSuccess(newLines) {
        this.dispatchEvent(new CustomEvent("generated", { detail: newLines, bubbles: true, composed: true }));
    }

    genFromArrayInput() {
        const waitTime = Number(this.allInputs.arrays[0].value);

        let resArr = Array(4);
        const arrayInputs = Array.from(this.allInputs.arrays).slice(1);
        arrayInputs.forEach((elem, i) => {
            const input = elem.value;
            if (!input) return;

            let arr = input.replace(/\[|\]/, "").split(",").map(x => Number(x));
            resArr[i] = arr;
        });

        return this.generator.generateFromArray(resArr, waitTime);

    }

    genFromFunctionInput() {
        const waitTime = Number(this.allInputs.functions[0].value);
        const stepNum = Number(this.allInputs.functions[1].value);

        let handleArr = Array(4);
        const funcInputs = Array.from(this.allInputs.functions).slice(2);
        funcInputs.forEach((elem, i) => {
            const handle = elem.value;
            if (!handle) return;
            else handleArr[i] = handle;
        });

        const funcArr = handleArr.map((handle, index) => {
            try {
                return this.generator.getFunctionFromString(handle, waitTime, stepNum);
            } catch (error) {
                if (error instanceof ArgError) throw new ArgError(error.message, index);
                else throw error;
            }
        });

        return this.generator.generateFromFunction(funcArr, waitTime, stepNum);
    }

    genFromVdMInput() {
        const waitTime = Number(this.allInputs.VdM[0].value);
        const stepNum = Number(this.allInputs.VdM[1].value);
        const startSep = Number(this.allInputs.VdM[2].value) || 0;
        const endSep = Number(this.allInputs.VdM[3].value) || 0;

        const beam = this.root.querySelector("#VdM").querySelector("#beam-select").value;
        const plane = this.root.querySelector("#VdM").querySelector("#plane-select").value;
        const planeIndex = plane == "Separation" ? 0 : 2;

        let handleArr = Array(4);
        if (beam == "Beam 1") {
            handleArr[0 + planeIndex] = `linear(${startSep},${endSep})`;
        }
        if (beam == "Beam 2") {
            handleArr[1 + planeIndex] = `linear(${startSep},${endSep})`;
        }
        if (beam == "Both beams") {
            handleArr[0 + planeIndex] = `linear(${startSep / 2},${endSep / 2})`;
            handleArr[1 + planeIndex] = `linear(${-startSep / 2},${-endSep / 2})`;
        }

        const funcArr = handleArr.map((handle, index) => {
            try {
                return this.generator.getFunctionFromString(handle, waitTime, stepNum);
            } catch (error) {
                if (error instanceof ArgError) throw new ArgError(error.message, index);
                else throw error;
            }
        });

        return this.generator.generateFromFunction(funcArr, waitTime, stepNum);
    }

    onFunctionGenerateClick() {
        let missingNumber = false;
        Array.from(this.allInputs.functions).slice(0, 2).forEach(x => {
            if (!x.value) {
                missingNumber = true;
                x.classList.add("error");
            }
        });
        if (missingNumber) {
            alert('Both "Time between trims" and "Number of steps" are required fields');
            return;
        }

        try {
            let newLines = this.genFromFunctionInput();
            this.onSuccess(newLines);
        }
        catch (error) {
            if (error instanceof ArgError) {
                this.allInputs.functions[error.where + 2].classList.add("error");
                alert("Invalid input function: " + error.message);
            }
            else throw error;
        }
    }

    onArrayGenerateClick() {
        if (!this.allInputs.arrays[0].value) {
            this.allInputs.arrays[0].classList.add("error");
            alert('"Time between trims" is a required field');
            return;
        }

        try {
            let newLines = this.genFromArrayInput();
            this.onSuccess(newLines);
        }
        catch (error) {
            if (error instanceof ArgError) {
                this.allInputs.arrays[error.where + 1].classList.add("error");
                alert("Invalid input array: " + error.message);
            }
            else throw error;
        }
    }

    onVdMGenerateClick() {
        let missingNumber = false;
        Array.from(this.allInputs.VdM).slice(0, 2).forEach(x => {
            if (!x.value) {
                missingNumber = true;
                x.classList.add("error");
            }
        });
        if (missingNumber) {
            alert('Both "Time between trims" and "Number of steps" are required fields');
            return;
        }

        try {
            let newLines = this.genFromVdMInput();
            this.onSuccess(newLines);
        }
        catch (error) {
            if (error instanceof ArgError) {
                this.allInputs.functions[error.where + 2].classList.add("error");
                alert("Invalid input function: " + error.message);
            }
            else throw error;
        }
    }

    set ip(ip) {
        this._ip = ip;
        this.render();
    }
    get ip() {
        return this._ip;
    }

    connectedCallback() {
        this.render();
        this.generator = new Generator(this.ip);
        this.allInputs = {
            arrays: this.root.querySelector("#arrays").querySelectorAll("input"),
            functions: this.root.querySelector("#functions").querySelectorAll("input"),
            VdM: this.root.querySelector("#VdM").querySelectorAll("input"),
        };
        this.tabButtons = this.root.querySelector(".tabs").querySelectorAll("button");
        this.allTabs = this.root.querySelectorAll(".tab");

        this.tabButtons.forEach(elem => {
            elem.addEventListener("click", () => {
                this.tabButtons.forEach(x => x.classList.remove("open"));
                this.allTabs.forEach(x => x.style.display = "none");

                elem.classList.add("open");
                this.root.getElementById(elem.id.split("-")[0]).style.display = "block";
            });
        });
        this.root.querySelectorAll("input").forEach(elem => {
            elem.addEventListener("change", () => {
                elem.classList.remove("error");
            });
        });

        this.root.querySelector("#VdM-generate").addEventListener("click", () => this.onVdMGenerateClick());
        this.root.querySelector("#function-generate").addEventListener("click", () => this.onFunctionGenerateClick());
        this.root.querySelector("#array-generate").addEventListener("click", () => this.onArrayGenerateClick());

        // Set default open tab
        this.root.querySelector("#VdM").style.display = "block";
        this.root.querySelector("#VdM-tab").classList.add("open");
    }

    render() {
        hyper(this.root)`
        <style>
            ${windowStyling}
        </style>
        <model-window>
            <div class='tabs'>
                <button id='VdM-tab'>Van Der Meer</button>
                <button id='arrays-tab'>From array</button>
                <button id='functions-tab'>From function</button>
            </div>

            <div class='tab' id='VdM'>
                Generate Van der Meer scan
                <info-box>
                    ${VdMInfoText}
                </info-box>
                <hr>
                <select id='beam-select'>
                    <option>Both beams</option>
                    <option>Beam 1</option>
                    <option>Beam 2</option>
                </select>
                <select id='plane-select'>
                    <option>Separation</option>
                    <option>Crossing</option>
                </select>
                <div>
                    <input id="wait-time" type="number" placeholder="Time between steps (s)" title="Time between steps (s)">
                    <input id="step-number" type="number" placeholder="Number of steps" title="Number of steps">
                </div>
                <div>
                    <input type="number" placeholder="Initial Separation (&sigma;)" title="Initial Separation (&sigma;)">
                    <input type="number" placeholder="Final Separation (&sigma;)" title="Final Separation (&sigma;)">
                </div>
                <button id='VdM-generate'>Generate at cursor</button>
            </div>

            <div class='tab' id='arrays'>
                Generate scan from position arrays
                <info-box>
                    ${arrayInfoText}
                </info-box>
                <hr>
                <div>
                    <input type="number" placeholder="Time between steps (s)" title="Time between steps (s)">
                    <div>
                        <input type="text" placeholder="Beam 1 Separation (&sigma;)" title="Beam 1 Separation (&sigma;)">
                        <input type="text" placeholder="Beam 2 Separation (&sigma;)" title="Beam 2 Separation (&sigma;)">
                    </div>
                    <div>
                        <input type="text" placeholder="Beam 1 Crossing (&sigma;)" title="Beam 1 Crossing (&sigma;)">
                        <input type="text" placeholder="Beam 2 Crossing (&sigma;)" title="Beam 2 Crossing (&sigma;)">
                    </div>
                </div>
                <button id='array-generate'>Generate at cursor</button>
            </div>

            <div class='tab' id='functions'>
                Generate scan from functions
                <info-box>
                    ${functionInfoText}
                </info-box>
                <hr>
                <div>
                    <div>
                        <input id="wait-time" type="number" placeholder="Time between steps (s)" title="Time between steps (s)">
                        <input id="step-number" type="number" placeholder="Number of steps" title="Number of steps">
                    </div>
                    <div>
                        <input type="text" placeholder="Beam 1 Separation (&sigma;)" title="Beam 1 Separation (&sigma;)">
                        <input type="text" placeholder="Beam 2 Separation (&sigma;)" title="Beam 2 Separation (&sigma;)">
                    </div>
                    <div>
                        <input type="text" placeholder="Beam 1 Crossing (&sigma;)" title="Beam 1 Crossing (&sigma;)">
                        <input type="text" placeholder="Beam 2 Crossing (&sigma;)" title="Beam 2 Crossing (&sigma;)">
                    </div>
                </div>
                <button id='function-generate'>Generate at cursor</button>
            </div>
        </model-window>
        `;
    }
}
customElements.define("generate-sequence-window", GenerateSequenceWindow);

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
`;
export class GenerateButton extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.render();

        this.button = this.root.querySelector("button");
        this.generateSequenceWindow = "";
        this._ip = "IP1";

        this.button.addEventListener("click", () => {
            this.button.classList.add("active");
            this.generateSequenceWindow = wire()`<generate-sequence-window ip=${this.ip}></generate-sequence-window>`;
            this.render();
        });
        this.root.addEventListener("cancelmodel", () => this.removeModel());
        this.root.addEventListener("generated", () => this.removeModel());
    }

    removeModel() {
        this.button.classList.remove("active");
        this.generateSequenceWindow = "";
        this.render();
    }

    set ip(ip) {
        this._ip = ip;
        this.render();
    }
    get ip() {
        return this._ip;
    }

    render() {
        hyper(this.root)`
        <style>
            ${buttonStyling}
        </style>
        <button>Generate</button>
        ${this.generateSequenceWindow}
        `;
    }
}
customElements.define("generate-button", GenerateButton);
