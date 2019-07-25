import { html, css } from "./HelperFunctions.js"
import "../extern/ace.js"
import "../extern/ace-lang-tools.js"
import "../extern/ace-searchbox.js"
import "./mode-vdm.js"
import { parseVdM, deparseVdM } from "./parser.js"
import "./token_tooltip.js"
const token_tooltip = ace.require("ace/token_tooltip");
const Autocomplete = ace.require("ace/autocomplete").Autocomplete;
const langTools = ace.require("ace/ext/language_tools");


const styling = css`
#editor { 
    min-height: 400px;
}

.fake-ace-line{
    display: inline-block;
    margin-left: 3px;
    font-size: 12px;
    font-family: monospace;
}

.fake-ace-keyword{
    color: #C800A4;
}

.ace-no-select .ace_cursor {
    display: none !important;
}

.ace-no-select .ace_selection {
    display: none !important;
}

#top-line-editor {
    border-bottom: solid 2px #b9b9b9;
}

#last-line-editor {
    border-top: solid 2px #b9b9b9;
}

.editor-number {
    display: inline-block;
    font-family: monospace;
    background-color: #e8e8e8;
    padding-left: 21px;
    padding-right: 13px;
    font-size: 12px;
    text-align: right;
}

#editor-container{
    height: 100%;
}

.ace_vdm-command-marker{
    background: lightgrey;
}
`

/**
 * Adds the VDM line numbers to a file without line numbers
 * 
 * @param {string} text
 */
function addLineNumbers(text, start = 1) {
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
 * Removes the line numbers from the text of a VDM file
 * 
 * @param {string} text 
 */
function removeLineNumbers(text) {
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
 * Converts a VDM file into a portion including INITIALIZE_TRIM and comments above it
 * and the main body of the VDM file, excluding END_SEQUENCE. All of this text has line
 * numbers removed.
 * 
 * @param {string} text
 * @returns {[string, string]} [The top lines, The main text]
 */
function stripText(text) {
    const noNumbersText = removeLineNumbers(text);
    let topLines = [];
    let state = "TOP_LINES";

    const mainText = noNumbersText.split("\n").map(line => {
        if (state == "TOP_LINES") {
            if (line.startsWith("#") || line.startsWith("INITIALIZE_TRIM")) {
                // ignore invalid text in the top lines
                topLines.push(line);
            }

            if (line.startsWith("INITIALIZE_TRIM")) {
                state = "MAIN";
            }
        }
        else if (state == "MAIN") {
            if (line.startsWith("END_SEQUENCE")) {
                state = "FOOTER";
            }
            else {
                return line;
            }
        }
    }).filter(x => x != undefined);

    return [
        topLines.join("\n"),
        mainText.join("\n")
    ];
}

function getDefaultFontSize(){
    const ta = document.createElement("textarea");
    ta.style.display = "none";
    document.body.appendChild(ta);
    // NOTE: parseInt strips charaters so "14px" etc. will be parsed to 14.
    return Math.round(parseInt(getComputedStyle(ta, null).getPropertyValue("font-size")));
}

const commandHints = {
    "RELATIVE_TRIM": "(command) RELATIVE_TRIM <IP> <BEAM> <PLANE> <UNITS>",
    "ABSOLUTE_TRIM": "(command) ABSOLUTE_TRIM <IP> <BEAM> <PLANE> <UNITS>",
    'SECONDS_WAIT': "(command) SECONDS_WAIT <NUMBER>",
    'START_FIT': "(command) START_FIT <PLANE> <FIT_TYPE>",
    'END_FIT': "(command) END_FIT",
    'MESSAGE': "(command) MESSAGE <STRING>"
}

const DEFAULT_HEADER = "INITIALIZE_TRIM IP() BEAM() PLANE() UNITS()";

export default class CodeEditor extends HTMLElement {
    static errorWebWorker = new Worker("./src/worker-vdm.js");

    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();
        this.editor = ace.edit(this.root.getElementById("editor"));
        this.lastEditorChange = Date.now();
        this.lastEditorChangeTimeout = null;
        CodeEditor.errorWebWorker.onmessage = message => this.onWebWorkerMessage(message);
        this.lastHeader = DEFAULT_HEADER;
        this.numberBarWidth = 14;
        this.topLineHeaderPosition = 0;
        this.defaultFontSize = getDefaultFontSize();
        this.tooltip = new token_tooltip.TokenTooltip(this.editor, value => commandHints[value]);

        this.preventAutocompleteClosing();

        this.topLineEditor = this.setUpReadonlyEditor(
            this.root.getElementById("top-line-editor"),
            row => {
                if (row == this.topLineHeaderPosition) {
                    return "0";
                }
                else {
                    return "";
                }
            }
        );
        this.lastLineEditor = this.setUpReadonlyEditor(
            this.root.getElementById("last-line-editor"),
            // @ts-ignore
            _ => calculateLineNumber(this.rawValue, -1) - 1
        );
        //this.lastLineEditor.setOption("maxLines", 1);
        this.setupEditor();
        // @ts-ignore
        window.editor = this.editor;
    }

    /**
     * @param {HTMLElement} element
     * @param {(rowNum: number) => string} [getLineNumbers]
     */
    setUpReadonlyEditor(element, getLineNumbers) {
        const editor = ace.edit(element);
        // @ts-ignore
        editor.renderer.attachToShadowRoot();
        editor.setOptions({
            firstLineNumber: 0,
            mode: "ace/mode/vdm",
            readOnly: true,
            highlightActiveLine: false,
            highlightGutterLine: false,
            showPrintMargin: false,
            maxLines: Infinity,
            fontSize: this.defaultFontSize
        });
        let ConstWidthLineNum = {
            getText: (_session, row) => getLineNumbers(row),
            getWidth: (_session, _lastLineNumber, _config) => {
                // @ts-ignore
                return this.numberBarWidth;
            }
        };

        // @ts-ignore
        editor.session.gutterRenderer = ConstWidthLineNum;
        // @ts-ignore
        ace.config.set('basePath', './extern');
        editor.setTheme("ace/theme/xcode");
        editor.setReadOnly(true);

        return editor;
    }

    /**
     * @param {string} newTopLine
     */
    setNewTopLine(newTopLine) {
        const topLineLines = newTopLine.split("\n").length;

        this.topLineEditor.setValue(newTopLine, -1);

        this.topLineHeaderPosition = topLineLines - 1;
    }

    connectedCallback() {
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
            showPrintMargin: false,
            fontSize: this.defaultFontSize
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

                // Set width for top line
                this.numberBarWidth = width;
                // Trigger the other editor line length updates
                // @ts-ignore
                this.topLineEditor.renderer.updateLines(0, 1); // Calculate the top row update
                // @ts-ignore
                this.lastLineEditor.renderer.updateLines(0, 1); // Calculate the top row update
                return width;
            }
        };

        // @ts-ignore
        this.editor.session.gutterRenderer = VDMNumberRenderer;

        var testCompleter = {
            //--- LINE NOT NEEDED --- identifierRegexps: [/ /, /[a-zA-Z_0-9\$\-\u00A2-\uFFFF]/]
            getCompletions: (editor, session, pos, prefix, callback) =>
                this.getAutocompletions(editor, session, pos, prefix, callback)
        }
        langTools.setCompleters([testCompleter]);
        this.editor.setOptions({ enableBasicAutocompletion: true, enableLiveAutocompletion: true });
    }

    preventAutocompleteClosing() {
        // @ts-ignore
        this.editor.commands.on("afterExec", event => {
            // @ts-ignore
            const hadCompleter = this.editor.completer !== undefined;
            if (event.command.name == "insertstring" && event.args != 'GAUSSIAN') {
                setTimeout(() => {
                    if (hadCompleter) {
                        Autocomplete.for(this.editor).showPopup(this.editor);
                    }
                }, 0)
            }
        })
    }

    /**
     * Function to be used by ace to get the completions.
     * 
     * @param {AceAjax.Editor} editor
     * @param {any} _session
     * @param {{ row: any; column: any; }} pos
     * @param {string} prefix
     * @param {(err: any, completions: object) => any} callback
     */
    getAutocompletions(editor, _session, pos, prefix, callback) {
        const trim = ['RELATIVE_TRIM', 'ABSOLUTE_TRIM']
        const others = ['SECONDS_WAIT', 'START_FIT', 'MESSAGE'];
        const noArgCommand = ['END_FIT']
        const arg1 = ['IP1', 'IP2', 'IP5', 'IP8'];
        const arg2 = ['BEAM1', 'BEAM2'];
        const arg3 = ['CROSSING', 'SEPARATION'];
        const arg4 = ['0.0'];
        const arg5 = ['SIGMA', 'MM'];
        const fitTypes = ['GAUSSIAN', 'GAUSSIAN_PLUS_CONSTANT'];

        // Syntax of a suggestion
        function syntaxify(arr, score, meta, addSpaceAfter = true) {
            return arr.map(x => {
                if (prefix == " ") {
                    x = ' ' + x;
                }
                if (addSpaceAfter) {
                    x += ' ';
                }
                return { value: x, score: score, meta: meta }
            })
        }

        const words = editor.session
            .getLine(pos.row)
            .slice(0, pos.column)
            .split(/ +/);
        if (words.length < 2) {
            callback(null,
                syntaxify(trim.concat(others), 10, 'command')
                    .concat(syntaxify(noArgCommand, 10, 'command', false))
            );
            return;
        }

        let suggestions = [];
        const firstWord = words[0];
        const prevWord = words[words.length - 2];
        const insertSpace = Boolean(editor.session.getLine(pos.row)[pos.column] != ' ');

        // Check _TRIM command context
        if (trim.includes(firstWord)) {
            if (trim.includes(prevWord) || arg5.includes(prevWord)) {
                suggestions = syntaxify(arg1, 10, 'IP', insertSpace)
            } else if (arg1.includes(prevWord)) {
                suggestions = syntaxify(arg2, 10, 'beam', insertSpace)
            } else if (arg2.includes(prevWord)) {
                suggestions = syntaxify(arg3, 10, 'plane', insertSpace)
            } else if (arg3.includes(prevWord)) {
                suggestions = syntaxify(arg4, 10, 'number', insertSpace)
            } else if (isFinite(Number(prevWord))) {
                suggestions = syntaxify(arg5, 10, 'unit', false)
            }
            // Check START_FIT command context
        } else if (firstWord == 'START_FIT') {
            if (prevWord == 'START_FIT') {
                suggestions = syntaxify(arg3, 10, 'plane', insertSpace)
            } else if (arg3.includes(prevWord)) {
                suggestions = syntaxify(fitTypes, 10, 'fit type', false)
            }
        } else if (firstWord == 'SECONDS_WAIT' && prevWord == 'SECONDS_WAIT') {
            suggestions = syntaxify(arg4, 10, 'number', false)
        }

        // State autocompletion suggestions
        callback(null, suggestions);
    }

    /**
     * Sets the new header (note: this is just one line, not any comments before it).
     * 
     * @param {string} newHeader
     */
    setNewHeader(newHeader) {
        this.lastHeader = newHeader;
        // @ts-ignore
        this.topLineEditor.session.replace({
            start: { row: this.topLineHeaderPosition, column: 0 },
            end: { row: this.topLineHeaderPosition, column: Number.MAX_VALUE }
        }, newHeader)
    }

    /**
     * This function gets called when the web worker gives us a message.
     * 
     * @param {MessageEvent} message
     */
    onWebWorkerMessage(message) {
        if (message.data.type == "lint") {
            const maxRow = this.rawValue.split("\n").length;

            // Reset the annotations on everywhere (message.data.errors might be undefined)
            this.lastLineEditor.getSession().setAnnotations([]);
            this.topLineEditor.getSession().setAnnotations([]);
            this.editor.getSession().setAnnotations([]);

            if(message.data.errors !== undefined){
                this.editor.getSession().setAnnotations(message.data.errors.filter(error => {
                    if(error.row == maxRow){
                        this.lastLineEditor.getSession().setAnnotations([{
                            ...error,
                            row: 0
                        }])
    
                        return false;
                    }
                    if(error.row == 0){
                        this.topLineEditor.getSession().setAnnotations([{
                            ...error,
                            row: this.topLineHeaderPosition
                        }])
    
                        return false;
                    }

                    return true;
                }));
            }

            if (message.data.header !== undefined) {
                this.setNewHeader(removeLineNumbers(message.data.header));
            }
        }
    }

    /**
     * Post a message to tell the web to parse the current editor text.
     */
    makeWebWorkerParse() {
        CodeEditor.errorWebWorker.postMessage({
            type: "text_change",
            text: addLineNumbers(this.rawValue)
        })
    }

    /**
     * This function gets called on a change in the editor
     */
    editorChange() {
        const TIMEOUT = 1000;
        clearTimeout(this.lastEditorChangeTimeout);
        this.lastEditorChangeTimeout = setTimeout(() => {
            if (Date.now() - this.lastEditorChange >= TIMEOUT) {
                this.makeWebWorkerParse();
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

    set rawValue(newRawValue) {
        this.editor.setValue(newRawValue, -1);
    }

    /**
     * Gets the value, without a need for parsing the document (so uses the latest header).
     */
    get noParseValue() {
        return addLineNumbers(this.topLineEditor.getValue() + "\n" + this.rawValue + "\n" + "END_SEQUENCE", 0);
    }

    get value() {
        const editorValue = this.rawValue;

        try {
            const commentsAboveHeader = this.topLineEditor.getValue().split("\n")
                .slice(0, this.topLineHeaderPosition).join("\n");

            // Add the headers (we don't know if this.lastHeader is stale
            return (commentsAboveHeader == "" ? "" : (commentsAboveHeader + '\n'))
                + deparseVdM(parseVdM(addLineNumbers(editorValue), true));
        }
        catch (error) {
            if (Array.isArray(error)) {
                return this.noParseValue;
            }
            else {
                throw error;
            }
        }
    }

    set value(newValue) {
        const [topLine, mainText] = stripText(newValue);

        if (topLine == "") {
            this.setNewTopLine(DEFAULT_HEADER);
        }
        else {
            this.setNewTopLine(topLine);
        }

        this.editor.setValue(mainText, -1); // use -1 move the cursor to the start of the file
        this.makeWebWorkerParse();
    }

    template() {
        return html`
            <style>
                ${styling}
            </style>
            <div id="editor-container">
                <div class="ace-no-select" id="top-line-editor"></div>
                <div id="editor"></div>
                <div class="ace-no-select" id="last-line-editor">END_SEQUENCE</div>
            </div>
        `
    }
}
customElements.define('code-editor', CodeEditor);