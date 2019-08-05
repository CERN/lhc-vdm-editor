import { css, html, preventResizeCSS } from "../HelperFunctions.js";

const styling = css`
#resize-handle {
    width: 5px;
    vertical-align: top;
    background-color: #d8d8d8;
    margin: 0 10px 0 10px;
    cursor: col-resize;
    height: 100%;
    display: inline-block;

    ${preventResizeCSS}
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
        this.root.innerHTML = this.template();
        const container = this.root.querySelector("#container");

        /**
         * @param {MouseEvent} event
         */
        function _onMouseMove(event) {
            const clientRect = container.getBoundingClientRect();
            var newWidth;

            if(this.side == "left"){
                const containerLeft = clientRect.left;
                newWidth = event.clientX - containerLeft - 12;
            }
            else{
                const containerRight = clientRect.right;
                newWidth = containerRight - event.clientX - 12;
            }
            container.style.width = newWidth + "px";

        }
        const onMouseMove = _onMouseMove.bind(this);
    
        this.root.querySelector("#resize-handle").addEventListener("mousedown", () => {
            document.addEventListener("mousemove", onMouseMove);
            document.body.addEventListener("mouseup", () => {
                document.removeEventListener("mousemove", onMouseMove);
            }, {once: true});
        });
    }

    get side(){
        return this.getAttribute("side") || "left";
    }


    template() {
        return html`
        <style>
            ${styling}
        </style>
        ${this.side == "right"?html`<div id="resize-handle">&nbsp;</div>`:""}
        <div id="container">
            <slot></slot>
        </div>
        ${this.side == "left"?html`<div id="resize-handle">&nbsp;</div>`:""}
    `
    }
}
customElements.define('resizeable-panel', ResizeablePanel);
