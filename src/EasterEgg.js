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
    <style>
        div {
            margin: 50px 30px;
            text-align: center;
        }
    </style>
    <div>
        <p>
            Kind regards from the creators
        </p>
        <p>
            { Frederik K. M., Thomas K. H. } &#8838; { CERN lunches } &#8838; { CERN Summer Students 2019 }
        </p>
        <p>
            We hope you enjoy using our application
        </p>
    </div>
`;