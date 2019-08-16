// @ts-ignore
import { css, preventSelectCSS } from "../HelperFunctions.js";

const styling = css`
#resize-handle {
    width: 5px;
    vertical-align: top;
    background-color: #d8d8d8;
    margin: 0 10px 0 10px;
    cursor: col-resize;
    height: 100%;
    display: inline-block;
    border-radius: 2px;

    ${preventSelectCSS}
}

#container {
    display: inline-block;
}

:root{
    display: block;
}
`

export default class ResizeablePanel extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });

        /**
         * @param {MouseEvent} event
         */
        this.onMouseMove = (event) => {
            const container = this.root.querySelector("#container");
            const clientRect = container.getBoundingClientRect();
            var newWidth;

            if (this.side == "left") {
                const containerLeft = clientRect.left;
                newWidth = event.clientX - containerLeft - 12;
            }
            else {
                const containerRight = clientRect.right;
                newWidth = containerRight - event.clientX - 12;
            }
            container.style.width = newWidth + "px";


            Array.from(this.children).forEach(child => {
                // @ts-ignore
                if (typeof child.reflow == "function") {
                    // @ts-ignore
                    child.reflow();
                }
            })

        }
    }

    connectedCallback(){
        this.render();

        this.root.querySelector("#resize-handle").addEventListener("mousedown", () => {
            document.addEventListener("mousemove", this.onMouseMove);
            document.body.addEventListener("mouseup", () => {
                document.removeEventListener("mousemove", this.onMouseMove);
            }, { once: true });
        });
    }

    get side() {
        return this.getAttribute("side") || "left";
    }

    render() {
        hyper(this.root)`
        <style>
            ${styling}
        </style>
        ${this.side == "right" ? wire()`<div id="resize-handle">&nbsp;</div>` : ""}
        <div style=${{width: this.getAttribute("default-width")}} id="container">
            <slot></slot>
        </div>
        ${this.side == "left" ? wire()`<div id="resize-handle">&nbsp;</div>` : ""}
    `
    }
}
customElements.define('resizeable-panel', ResizeablePanel);
