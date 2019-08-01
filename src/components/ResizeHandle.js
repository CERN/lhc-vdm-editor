import { css, html, preventResizeCSS } from "../HelperFunctions.js";

const styling = css`
.resize{
    width: 5px;
    vertical-align: top;
    background-color: gainsboro;
    margin: 0 10px 0 10px;
    cursor: col-resize;
    height: 100%;

    ${preventResizeCSS}
}
`

export default class ResizeHandle extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();

        /**
         * @param {MouseEvent} event
         */
        function _onMouseMove(event) {
            this.dispatchEvent(new CustomEvent("update-size", {
                detail: event.clientX
            }))
        }
        const onMouseMove = _onMouseMove.bind(this);
    
        this.root.querySelector(".resize").addEventListener("mousedown", () => {
            document.addEventListener("mousemove", onMouseMove);
            document.body.addEventListener("mouseup", () => {
                document.removeEventListener("mousemove", onMouseMove);
            }, {once: true});
        });
    }


    template() {
        return html`
        <style>
            ${styling}
        </style>
        <div class="resize">&nbsp;</div>
    `
    }
}
customElements.define('resize-handle', ResizeHandle);
