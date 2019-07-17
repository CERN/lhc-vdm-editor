import { html, css } from "./HelperFunctions.js"
import "../extern/ace.js"
import "../extern/ace-lang-tools.js"
import "./mode-vdm.js"
import { parseVdM, deparseVdM } from "./parser.js"


const styling = css`
#editor { 
    position: absolute;
    top: 14px;
    right: 0;
    bottom: 0;
    left: 0;
}
#top-line-editor{
    display: inline-block;
    margin-left: 3px;
    font-size: 12px;
    font-family: monospace;
    color: green;
}
.editor-container{
}
#top-line-editor-number {
    display: inline-block;
    font-family: monospace;
    background-color: #f0f0f0;
    padding-left: 21px;
    padding-right: 13px;
    font-size: 12px;
    text-align: right;
}
`

/**
 * Adds the VDM line numbers to a file without line numbers
 * 
 * @param {string} text
 */
function addLineNumbers(text) {
    let currentLine = 1;

    return text.split("\n").map((line) => {
        if (line[0] == "#" || line.trim() == "") {
            return line;
        }
        else {
            let newLine = currentLine.toString() + " " + line;
            currentLine++;
            return newLine;
        }
    }).join("\n");
}

function calculateLineNumber(file, absLineNum) {
    const lines = file.split("\n");
    let currentCalcLineNum = 1;
    let currentAbsLineNum = 0;

    for (let line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine[0] == "#" || trimmedLine == "") {
            if (currentAbsLineNum == absLineNum) {
                return "";
            }
        }
        else {
            if (currentAbsLineNum == absLineNum) {
                return currentCalcLineNum;
            }
            currentCalcLineNum++;
        }
        currentAbsLineNum++;
    }
}

export default class TextEditor extends HTMLElement {
    static errorWebWorker = new Worker("./src/worker-vdm.js");

    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.appendChild(this.template());
        this.editor = ace.edit(this.root.getElementById("editor"));
        const highlight = ace.require("ace/ext/static_highlight")
        // this.topLineEditor = highlight(this.root.getElementById("top-line-editor"), {
        //     mode: "ace/mode/vdm",
        //     startLineNumber: 0
        // });
        this.lastEditorChange = Date.now();
        this.lastEditorChangeTimeout = null;
        TextEditor.errorWebWorker.onmessage = message => this.webWorkerMessage(message);
        this.lastHeader = "0 INITIALIZE_TRIM IP() BEAM() PLANE() UNITS()";

        this.setupAce();
    }

    setupAce() {
        // @ts-ignore
        this.editor.renderer.attachToShadowRoot();
        this.editor.focus();
        this.editor.session.setMode("ace/mode/vdm");
        // @ts-ignore
        ace.config.set('basePath', './src')

        this.editor.session.on("change", () => {
            this.editorChange();
        })

        let VDMNumberRenderer = {
            getText: (_session, row) => {
                return calculateLineNumber(this.rawValue, row) + "";
            },
            getWidth: (_session, _lastLineNumber, config) => {
                // This is not really correct, as we have empty lines
                // TODO: could make this correct
                const width = (config.lastRow + 1).toString().length * config.characterWidth;
                // @ts-ignore
                this.root.querySelector("#top-line-editor-number").style.width = `${width}px`;
                return width;
            }
        };

        // @ts-ignore
        this.editor.session.gutterRenderer = VDMNumberRenderer;

        var langTools = ace.require("ace/ext/language_tools");

        this.editor.setOptions({ enableBasicAutocompletion: true, enableLiveAutocompletion: true });

        var testCompleter = {
            getCompletions: function (_editor, _session, _pos, prefix, callback) {
                if (prefix.length === 0) { callback(null, []); return }
                callback(null, [
                    {
                        name: "Test AC",
                        value: "SIGMAA",
                        score: 20,
                        meta: "Complete"
                    }
                ])
            }
        }
        langTools.addCompleter(testCompleter);
    }

    /**
     * @param {string} newHeader
     */
    setNewHeader(newHeader){
        this.lastHeader = newHeader;
        // @ts-ignore
        this.root.querySelector("#top-line-editor").innerText = newHeader.slice(2);
    }

    /**
     * @param {MessageEvent} message
     */
    webWorkerMessage(message) {
        if (message.data.type == "lint") {
            this.editor.getSession().setAnnotations(message.data.errors);

            if(message.data.header !== undefined){
                this.setNewHeader(message.data.header);
            }
        }
    }

    postWebWorkerMessage(){
        TextEditor.errorWebWorker.postMessage({
            type: "text_change",
            text: addLineNumbers(this.rawValue)
        })
    }

    editorChange() {
        const TIMEOUT = 1000;
        clearTimeout(this.lastEditorChangeTimeout);
        this.lastEditorChangeTimeout = setTimeout(() => {
            if (Date.now() - this.lastEditorChange >= TIMEOUT) {
                this.postWebWorkerMessage();
            }
        }, TIMEOUT + 100);

        this.lastEditorChange = Date.now();
        this.dispatchEvent(new CustomEvent("editor-content-change", { bubbles: true }))
    }

    get rawValue() {
        return this.editor.getValue();
    }

    get value() {
        try{
            return deparseVdM(parseVdM(addLineNumbers(this.editor.getValue())));
        }
        catch(error) {
            if(Array.isArray(error)){
                return this.lastHeader + "\n" + addLineNumbers(this.editor.getValue());
            }
            else{
                throw error;
            }
        }
    }

    stripText(text) {
        return text.split("\n").map(x => {
            const match = x.match(/^[0-9]+ +/);
            if (match !== null) {
                const numMatchLength = match[0].length;
                return x.slice(numMatchLength);
            }
            else {
                return x;
            }

        }).slice(1).join("\n");
    }

    set value(newValue) {
        this.editor.setValue(this.stripText(newValue), -1); // use -1 move the cursor to the start of the file
        this.postWebWorkerMessage();
    }

    template() {
        return html`
            <style>
                ${styling}
            </style>
            <div class="editor-container">
                <div style="width: 15px;" id="top-line-editor-number">0</div><div id="top-line-editor">INITIALIZE_TRIM IP() BEAM() PLANE() UNITS()</div>
                <div id="editor"></div>
            </div>
        `
    }
}
customElements.define('text-editor', TextEditor);