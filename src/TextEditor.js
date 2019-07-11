import {range, css} from "./HelperFunctions.js"
import {html, render} from 'https://unpkg.com/lit-html?module';

const styling = css`
.overall-container{
    font-size: 13.333333;
    font-family: monospace;
}
textarea {
    resize: none;
    display: inline-block;
    border-width: 0px;
    outline: none;
    height: 100%;
    width: 100%;
    padding-top: 5px;
}
.right-container {
    height: calc(100% - 23px);
    width: calc(100% - 32px);
    border-left-width: 2px;
    border-left-color: black;
    border-left-style: solid;
    padding-left: 5px;
    display: inline-block;
}

.numbers {
    display: inline-block;
    padding-top: 5px;
    position: relative;
}
.number {
}
.left-container {
    display: inline-block;
    vertical-align: top;
    height: calc(100% - 23px);
    overflow: hidden;
}
.overall-container {
    width: inherit;
    height: inherit;
}
.topText{
    padding-left: 32px;
    border-bottom-style: solid;
    border-bottom-width: 2px;
    padding-bottom: 2px;
}
`

export default class TextEditor extends HTMLElement {
    constructor(startingText){
        super();
        this.source = startingText;
        this.root = this.attachShadow({mode: "open"});
        this.scrollDistance = 0;
        render(this.template(), this.root);
    }

    handleScroll(ev){
        this.scrollDistance = -ev.srcElement.scrollTop;
        render(this.template(), this.root);
    }

    stripText(text){
        return text.split("\n").map(x => {
            const numMatchLength = x.match(/^[0-9]+ +/)[0].length;
            return x.slice(numMatchLength)
        }).slice(1).join("\n");
    }

    set value(a){

    }

    get value(){
        
    }

    template(){
        return html`
            <style>
                ${styling}
            </style>
            <div class="overall-container">
                <div class="topText">INITIALIZE_TRIM IP(IP5) BEAM(BEAM1,BEAM2) PLANE(CROSSING) UNITS(SIGMA)</div>
                <div class="left-container">
                    <div class="numbers" style="top: ${this.scrollDistance}">
                        ${
                            range(this.innerHTML.split("\n").length, 1).map(i => html`<div class="number">${i}</div>`)
                        }
                    </div>
                </div>
                <div class="right-container">
                    <textarea ref="${this}" @scroll="${ev => this.handleScroll(ev)}">${
                        this.stripText(this.innerHTML.trim())
                    }</textarea>
                </div>
            </div>
        `
    }

    updateNumbers(){
        
    }
}
customElements.define('text-editor', TextEditor);