import { html, css } from "./HelperFunctions.js"
import "../extern/ace.js"
import "../extern/ace-lang-tools.js"
import "./mode-vdm.js"
import { parseVdM, deparseVdM } from "./parser.js"


const styling = css`
#editor { 
    min-height: 400px;
}

.fake-ace-line{
    display: inline-block;
    margin-left: 3px;
    font-size: 12px;
    font-family: monospace;
    color: green;
}

#top-line-editor .ace_cursor {
    display: none !important;
}

#top-line-editor .ace_selection {
    display: none !important;
}

#top-line-editor {
    border-bottom: solid 2px #b9b9b9;
}

#last-line {
    border-top: solid 2px #b9b9b9;
}

.editor-number {
    display: inline-block;
    font-family: monospace;
    background-color: #f0f0f0;
    padding-left: 21px;
    padding-right: 13px;
    font-size: 12px;
    text-align: right;
}

#editor-container{
    height: 100%;
}
`

/**
 * Adds the VDM line numbers to a file without line numbers
 * 
 * @param {string} text
 */
function addLineNumbers(text, start=1) {
    let currentLine = start;

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

/**
 * Calculates the line number used in vdm (empty lines and comments don't have line numbers).
 * 
 * @param {string} file
 * @param {number} absLineNum For this parameter, putting -1 determines what the last 
 * numbered line is
 */
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

    return currentCalcLineNum - 1; // this will happen is absLineNum is -1
}

/**
 * @param {string} text 
 */
function removeLineNumbers(text){
    return text.split("\n").map(x => {
        const match = x.match(/^[0-9]+ +/);
        if (match !== null) {
            const numMatchLength = match[0].length;
            return x.slice(numMatchLength);
        }
        else {
            return x;
        }

    }).join("\n");
}

/**
 * @param {string} text
 * @returns {[string, string]} [The stripped top line, The main stripped text]
 */
function stripText(text) {
    const noNumbersText = removeLineNumbers(text);
    let topLines = [];
    let state = "TOP_LINE";

    const mainText = noNumbersText.split("\n").map(line => {
        if (state == "TOP_LINE"){
            topLines.push(line);

            if(line.startsWith("INITIALIZE_TRIM")){
                state = "MAIN";
            }
        }
        else if (state == "MAIN"){
            if (line.startsWith("END_SEQUENCE")){
                state = "FOOTER";
            }
            else{
                return line;
            }
        }
    }).filter(x => x != undefined);

    return [
        topLines.join("\n"),
        mainText.join("\n")
    ];
}

const DEFAULT_HEADER = "INITIALIZE_TRIM IP() BEAM() PLANE() UNITS()";

export default class TextEditor extends HTMLElement {
    static errorWebWorker = new Worker("./src/worker-vdm.js");

    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.appendChild(this.template());
        this.editor = ace.edit(this.root.getElementById("editor"));
        this.lastEditorChange = Date.now();
        this.lastEditorChangeTimeout = null;
        TextEditor.errorWebWorker.onmessage = message => this.webWorkerMessage(message);
        this.lastHeader = DEFAULT_HEADER;
        this.numberBarWidth = 14;
        this.topLineHeaderPosition = 0;

        this.setUpTopLine();
        this.setupEditor();
        // @ts-ignore
        window.editor = this.editor;
    }

    setUpTopLine() {
        this.topLineEditor = ace.edit(this.root.getElementById("top-line-editor"));
        // @ts-ignore
        this.topLineEditor.renderer.attachToShadowRoot();
        this.topLineEditor.setOptions({
            firstLineNumber: 0,
            mode: "ace/mode/vdm",
            readOnly: true,
            highlightActiveLine: false,
            highlightGutterLine: false,
            showPrintMargin: false
        });
        let ConstWidthLineNum = {
            getText: (_session, row) => {
                if (row == this.topLineHeaderPosition) {
                    return 0;
                }
                else {
                    return "";
                }
            },
            getWidth: (_session, _lastLineNumber, _config) => {
                return this.numberBarWidth;
            }
        };

        // @ts-ignore
        this.topLineEditor.session.gutterRenderer = ConstWidthLineNum;
        // @ts-ignore
        ace.config.set('basePath', './extern');
        this.topLineEditor.setTheme("ace/theme/xcode");
        this.topLineEditor.setReadOnly(true);
    }

    /**
     * @param {string} newTopLine
     */
    setNewTopLine(newTopLine) {
        const topLineLines = newTopLine.split("\n").length;

        this.topLineEditor.setValue(newTopLine, -1);

        this.topLineEditor.setOption("maxLines", topLineLines);

        this.topLineHeaderPosition = topLineLines - 1;
    }

    connectedCallback(){
        // @ts-ignore
        this.editor.renderer.once("afterRender", () => {
            this.editor.setOptions({
                maxLines: Math.floor(this.root.querySelector("#editor-container").getBoundingClientRect()
                    .height / this.editor.renderer.lineHeight) - this.topLineHeaderPosition - 2 /* - the start and end line*/
            });
        })
    }

    setupEditor() {
        // @ts-ignore
        this.editor.renderer.attachToShadowRoot();
        this.editor.focus();
        this.editor.session.setMode("ace/mode/vdm");
        // @ts-ignore
        ace.config.set('basePath', './extern');
        this.editor.setTheme("ace/theme/xcode");
        // @ts-ignore
        ace.config.set('basePath', './src');
        this.editor.setOptions({
            minLines: 20,
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            showPrintMargin: false
        })

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
                const lastRealLineNumber = calculateLineNumber(this.rawValue, -1);
                const width = lastRealLineNumber.toString().length * config.characterWidth;
                // @ts-ignore
                Array.from(this.root.querySelectorAll(".editor-number")).map(x => x.style.width = `${width}px`);
                // @ts-ignore
                this.root.querySelector("#editor-number-end").innerText = parseInt(lastRealLineNumber) + 1;

                // Set width for top line
                this.numberBarWidth = width;
                // @ts-ignore
                this.topLineEditor.renderer.updateLines(0, 1); // Calculate the top row update
                return width;
            }
        };

        // @ts-ignore
        this.editor.session.gutterRenderer = VDMNumberRenderer;

        var langTools = ace.require("ace/ext/language_tools");

        var testCompleter = {
            //identifierRegexps: [/\b\w+\b| +/g],
            getCompletions: function (editor, _session, pos, prefix, callback) {
                console.log(prefix)
                const trim = ['RELATIVE_TRIM', 'ABSOLUTE_TRIM']
                const others = ['SECONDS_WAIT', 'START_FIT', 'END_FIT', 'MESSAGE'];
                const arg1 = ['IP1', 'IP2', 'IP5', 'IP8'];
                const arg2 = ['BEAM1', 'BEAM2'];
                const arg3 = ['CROSSING', 'SEPARATION'];
                //    arg4 = some number
                const arg5 = ['SIGMA', 'MM'];
                const fitTypes = ['GAUSSIAN', 'GAUSSIAN_PLUS_CONSTANT'];

                // Syntax of a suggestion
                function syntaxify(arr, score, meta) {
                    return arr.map(x => ({ value: x, score: score, meta: meta, docText: 'some text goes here'}))
                }

                const words = editor.session
                    .getLine(pos.row)
                    .slice(0, pos.column)
                    .split(/ +/);
                if (words.length < 2) { callback(null, syntaxify(trim.concat(others), 10, 'command')); return }
                
                let suggestions = [];
                const firstWord = words[0];
                const prevWord = words.slice(-2,-1)[0];
                // Check _TRIM command context
                if (trim.includes(firstWord)) {
                    if (trim.includes(prevWord)) {
                        suggestions = syntaxify(arg1, 10, 'IP')
                    } else if (arg1.includes(prevWord)) {
                        suggestions = syntaxify(arg2, 10, 'beam')
                    } else if (arg2.includes(prevWord)) {
                        suggestions = syntaxify(arg3, 10, 'plane')
                    } else if (arg3.includes(prevWord)) {
                        suggestions = [];
                    } else if (isFinite(Number(prevWord))) {
                        suggestions = syntaxify(arg5, 10, 'unit')
                    }
                // Check START_FIT command context
                } else if (firstWord == 'START_FIT') {
                    if (prevWord == 'START_FIT') {
                        suggestions = syntaxify(arg3, 10, 'plane')
                    } else if (arg3.includes(prevWord)) {
                        suggestions = syntaxify(fitTypes)
                    }
                }

                // State autocompletion suggestions
                callback(null, suggestions); return
            }
        }
        langTools.setCompleters([testCompleter]);
        this.editor.setOptions({ enableBasicAutocompletion: true, enableLiveAutocompletion: true });
    }

    /**
     * @param {string} newHeader
     */
    setNewHeader(newHeader) {
        this.lastHeader = newHeader;
        // @ts-ignore
        this.topLineEditor.session.replace({
            start: {row: this.topLineHeaderPosition, column: 0},
            end: {row: this.topLineHeaderPosition, column: Number.MAX_VALUE}
        }, newHeader)
    }

    /**
     * @param {MessageEvent} message
     */
    webWorkerMessage(message) {
        if (message.data.type == "lint") {
            this.editor.getSession().setAnnotations(message.data.errors);

            if(message.data.header !== undefined){
                this.setNewHeader(removeLineNumbers(message.data.header));
            }
        }
    }

    postWebWorkerMessage() {
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
        this.dispatchEvent(new CustomEvent("editor-content-change", {
            bubbles: true,
            detail: this.noParseValue
        }))
    }

    get rawValue() {
        return this.editor.getValue();
    }

    set rawValue(newRawValue){
        this.editor.setValue(newRawValue, -1);
    }

    /**
     * Gets the value, without a need for parsing the document (so uses the latest header)
     */
    get noParseValue() {
        return addLineNumbers(this.topLineEditor.getValue() + "\n" + this.rawValue + "\n" + "END_SEQUENCE", 0);
    }

    get value() {
        const editorValue = this.rawValue;

        try{
            // Add the headers (we don't know if this.lastHeader is stale)
            return deparseVdM(parseVdM(addLineNumbers(editorValue), true));
        }
        catch(error) {
            if(Array.isArray(error)){
                return this.noParseValue;
            }
            else {
                throw error;
            }
        }
    }

    set value(newValue) {
        const [topLine, mainText] = stripText(newValue);

        if(topLine == ""){
            this.setNewTopLine(DEFAULT_HEADER)
        }
        else{
            this.setNewTopLine(topLine);
        }

        this.editor.setValue(mainText, -1); // use -1 move the cursor to the start of the file
        this.postWebWorkerMessage();
    }

    template() {
        return html`
            <style>
                ${styling}
            </style>
            <div id="editor-container">
                <div>
                    <div id="top-line-editor"></div>
                    <!--<div style="width: 15px;" class="editor-number">0</div><div id="top-line-editor">INITIALIZE_TRIM IP() BEAM() PLANE() UNITS()</div>-->
                </div>
                <div id="editor"></div>
                <div id="last-line">
                    <div style="width: 15px;" id="editor-number-end" class="editor-number">48</div><div class="fake-ace-line">END_SEQUENCE</div>
                </div>
            </div>
        `
    }
}
customElements.define('text-editor', TextEditor);