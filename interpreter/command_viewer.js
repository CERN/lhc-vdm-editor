import { parseVdM, deparseVdM } from "../src/parser.js";

class Viewer extends HTMLElement {
    constructor() {
        // Apply template constructor
        super();
        // Create shadow
        const shadow = this.attachShadow({ mode: 'open' });
        const table = document.createElement('table');
        const input = document.createElement('input');
        shadow.appendChild(table);
        shadow.appendChild(input);
    };
};

class Table extends HTMLElement {
    constructor() {
        // Apply template constructor
        super();
        // Create shadow
        this.shadow = this.attachShadow({ mode: 'open' });
        // Create styling element for the web component
        const styling = document.createElement('style');
        styling.innerHTML = /*css*/`
        * {box-sizing: border-box;}
        .index {width: 10%;}
        .command {width: 30%;}
        .args {width: 60%;}
        .row > * {
            float: left;
            padding: 10px;
            border: 1px solid black;
            height: 100%;
        }
        .row::after{
            content: '';
            clear: both;
            display: block;
        }`

        // Add styling to shadow DOM
        this.shadow.appendChild(styling);
        // Add div element to shadow DOM. Is to become the veiwer
        let $table = $('<div>');
        $table.appendTo(this.shadow);
    };

    /**
     * @param {Object[]} commandlines
     */
    set content(commandlines) {
        // Get div element to be filled and clear it
        let $table = $(this.shadowRoot).children('div');
        $table.empty();
        let currentLineNum = 0;
        // Rendering
        for (let line of commandlines) {
            let $row = $('<div>').addClass('row').attr('id', currentLineNum);
            if (line.type == 'command') {
                $row.append($('<div>').addClass('index').text(line.index));
                $row.append($('<div>').addClass('command').html(`<select><option>${line.command}</option></select>`));
                $row.append($('<div>').addClass('args').text(line.args.join(' ')));
            } else if (line.type == 'comment') {
                $row.append($('<div>').addClass('index').text('#'));
                $row.append($('<div>').addClass('command').text(line.comment));
                $row.append($('<div>').addClass('args').text(''));
            } else if (line.type == 'empty') {
                $row.append($('<div>').addClass('index').text(''));
                $row.append($('<div>').addClass('command').text(''));
                $row.append($('<div>').addClass('args').text(''));
            }
            $row.appendTo(this.shadow);
        };
    };
};

$(document).ready(function () {
    let file = `0 INITIALIZE_TRIM IP(IP1) BEAM(BEAM1,BEAM2) PLANE(SEPARATION) UNITS(SIGMA)
1 SECONDS_WAIT 10.0
2 START_FIT SEPARATION GAUSSIAN
3 RELATIVE_TRIM IP1 BEAM1 SEPARATION -3.0 SIGMA IP1 BEAM2 SEPARATION 3.0 SIGMA
4 SECONDS_WAIT 10.0
5 RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.0 SIGMA IP1 BEAM2 SEPARATION -1.0 SIGMA
6 SECONDS_WAIT 10.0
7 RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.0 SIGMA IP1 BEAM2 SEPARATION -1.0 SIGMA
8 SECONDS_WAIT 10.0
9 RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.0 SIGMA IP1 BEAM2 SEPARATION -1.0 SIGMA
10 SECONDS_WAIT 10.0
11 RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.0 SIGMA IP1 BEAM2 SEPARATION -1.0 SIGMA
12 SECONDS_WAIT 10.0
13 RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.0 SIGMA IP1 BEAM2 SEPARATION -1.0 SIGMA
14 SECONDS_WAIT 10.0
15 RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.0 SIGMA IP1 BEAM2 SEPARATION -1.0 SIGMA
16 SECONDS_WAIT 10.0
17 RELATIVE_TRIM IP1 BEAM1 SEPARATION -3.0 SIGMA IP1 BEAM2 SEPARATION 3.0 SIGMA
18 SECONDS_WAIT 10.0
19 END_FIT
20 END_SEQUENCE`
    // Defining the custom web component
    customElements.define('command-viewer', Table);
    let viewer = document.getElementById('table');
    viewer.content = parseVdM(file);
})