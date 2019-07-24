// @ts-check
import { css, html } from "./HelperFunctions.js"

const styling = css`
#file-browser {
    border-style: solid;
    border-width: 1px;
    padding: 3px;
    border-color: #dadada;
}

.item {
    background-color: #ededed;
    padding: 3px;
    font-family: sans-serif;
    font-size: 14px;
    cursor: pointer;
}

.item:nth-child(2n) {
    background-color: #f7f7f7;
}

.triangle {
    width: 0px;
    height: 0px;
    position: relative;
    display: inline-block;
}

.triangle-closed {
    border-left: 8px solid grey;
    border-bottom: 5px solid transparent;
    border-top: 5px solid transparent;
    top: 0px;
    left: 0px;
}

.triangle-open {
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 8px solid grey;
    top: -1px;
    left: 0px;
}

.triangle-container {
    height: 0px;
    width: 0px;
}

.folder-name {
    padding-left: 14px;
}

.folder-content{
    margin-left: 15px;
    border-left: 1px solid grey;
}

* {
    -webkit-touch-callout: none; /* iOS Safari */
      -webkit-user-select: none; /* Safari */
       -khtml-user-select: none; /* Konqueror HTML */
         -moz-user-select: none; /* Firefox */
          -ms-user-select: none; /* Internet Explorer/Edge */
              user-select: none; /* Non-prefixed version, currently
                                    supported by Chrome and Opera */
  }
`

export default class FileBrowser extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();

        this.setStructure([{
            type: "file",
            name: "test_file.txt"
        },
        {
            type: "file",
            name: "test_file.txt"
        },
        {
            type: "folder",
            name: "test_folder",
            getContent: () => {
                return [{
                    type: "file",
                    name: "test_file.txt"
                },
                {
                    type: "folder",
                    name: "test_folder",
                    getContent: () => {
                        return [{
                            type: "file",
                            name: "test_file2.txt"
                        }]
                    }
                }]
            }
        }])
    }

    /**
     * @param {any} structure
     */
    setStructure(structure){
        function getElementFromStructure(_structure){
            const result = document.createDocumentFragment();
            for(let item of _structure){
                let container =  document.createElement("div");
                if(item.type == "file"){
                    container.innerHTML = html`<div class="item">${item.name}</div>`;
                    container.querySelector("div").addEventListener("click", () => {
                        // emit event
                    });

                    result.appendChild(container.querySelector(".item"));
                }
                else if(item.type == "folder"){
                    container.innerHTML = html`
                        <div class="item">
                            <div class="triangle-container"><span class="triangle triangle-closed"></span></div>
                            <span class="folder-name">${item.name}</span>
                        </div>
                        <div class="folder-content">
                        </div>
                    `;

                    const folderContentElement = container.querySelector(".folder-content");
                    const triangle = container.querySelector(".triangle");

                    let isOpen = false;
                    container.querySelector(".item").addEventListener("click", async () => {
                        if(isOpen){
                            triangle.classList.remove("triangle-open");
                            triangle.classList.add("triangle-closed");

                            folderContentElement.innerHTML = "";
                            isOpen = false;
                        }
                        else{
                            triangle.classList.remove("triangle-closed");
                            triangle.classList.add("triangle-open");

                            folderContentElement.appendChild(getElementFromStructure(await item.getContent()));
                            isOpen = true;
                        }
                    });

                    for(let containerChild of Array.from(container.children)){
                        result.appendChild(containerChild);
                    }
                }
                else{
                    throw Error(`Unknown file structure type ${item.type}`);
                }
            }
            return result;
        }
        this.root.querySelector("#file-browser").appendChild(getElementFromStructure(structure));
    }
    /**
     *             <div class="item">
                <div class="triangle-container"><span class="triangle">&nbsp;</span></div>
                <span class="folder-name">folder</span>
            </div>
            <div class="item">FileB.txt</div>
            <div class="item">FileC.txt</div>
     */

    template() {
        return html`
        <style>
            ${styling}
        </style>
        <div id="file-browser">
        </div>
        `
    }
}
customElements.define('file-browser', FileBrowser);