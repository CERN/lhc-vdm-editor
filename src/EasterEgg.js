import "./components/ModelWindow.js";

export default function EasterEgg() {
    let elem  = document.createElement("model-window");
    elem.id = "EasterEgg";
    elem.innerHTML = template;

    document.body.appendChild(elem);
    document.body.addEventListener("cancelmodel", () => {
        document.body.removeChild(document.body.querySelector("#EasterEgg"));
    }, {once: true});
}

const template = `
    <div>
        Hello from Frederik and Thomas
    </div>
`;