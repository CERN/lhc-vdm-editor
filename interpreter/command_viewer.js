class Viewer extends HTMLElement {
    constructor() {
        // Apply template constructor
        super();
        // Create shadow
        const shadow = this.attachShadow({mode: 'open'});
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
        this.shadow = this.attachShadow({mode: 'open'});
        // Create styling element for the web component
        const styling = document.createElement('style');
        styling.innerHTML = `
        /*box sizes include border and padding*/
        *{box-sizing: border-box;}
        
        /*defining the column widths*/
        .col-1 {width: 8.33%;}
        .col-2 {width: 16.66%;}
        .col-3 {width: 25%;}
        .col-4 {width: 33.33%;}
        .col-5 {width: 41.66%;}
        .col-6 {width: 50%;}
        .col-7 {width: 58.33%;}
        .col-8 {width: 66.66%;}
        .col-9 {width: 75%;}
        .col-10 {width: 83.33%;}
        .col-11 {width: 91.66%;}
        .col-12 {width: 100%;}
        /*styling the columns*/
        div[class|='col']{
            float: left;
            padding: 10px;
            border: 1px solid black;
            height: 100%;
        }
        div.row::after{
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
        // Rendering
        for (let line of commandlines) {
            // Create DOM with the new content
            let $row = $('<div>').addClass('row').attr('id', line.index).attr('contenteditable', 'true');
            $row.append($('<div>').addClass('col-1').text(line.index));
            $row.append($('<div>').addClass('col-3').html(`<select><option>${line.command}</option></select>`));
            $row.append($('<div>').addClass('col-8').text(line.args));
            // Add the DOM to the shadow
            $row.appendTo(this.shadow);
        };
    };

    connectedCallback() {
        // Things to happen when the element is inserted into the DOM
    };
    disconnectedCallback() {
        // Things to de when the element is removed from DOM. Things like removing listeners
    };
};
// Defining the custom web component
customElements.define('command-viewer', Table);