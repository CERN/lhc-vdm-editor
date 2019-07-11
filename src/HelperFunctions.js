export function range(to, start = 0) {
    let array = new Array(to - start);
    for (var number = start, i = 0; number < to; number++ , i++) {
        array[i] = number;
        i++;
    }
    return array;
}

function interpolate(literals, ...expressions) {
    let string = ``
    for (const [i, val] of expressions.entries()) {
        if (typeof val == "function") {

        }
        string += literals[i] + val
    }
    string += literals[literals.length - 1]
    return string
}

export function getFragmentOfChildNodes(node){
    let fragment = document.createDocumentFragment();
    for(let childNode of node.children){
        fragment.appendChild(childNode);
    }

    return fragment;
}

export function html(literals, ...expressions) {
    const UID = 'GduzMkeFpevUiClNJkcI'
    let string = ``;
    let numFunctions = 0;
    let funcs = []
    for (const [i, val] of expressions.entries()) {
        if (typeof val == "function") {
            const strBefore = literals[i];
            string += strBefore.slice(0, strBefore.lastIndexOf("@")) + UID + '=' + numFunctions.toString();
            funcs.push({
                name: strBefore.slice(strBefore.lastIndexOf("@") + 1, -2),
                func: val
            });
            numFunctions++;
        }
        else{
            string += literals[i] + val
        }
    }
    string += literals[literals.length - 1];
    const parent = document.createElement('div');
    parent.innerHTML = string;
    const UIDElements = parent.querySelectorAll(`[${UID}]`);

    for(let funcNodes of UIDElements){
        let index = parseInt(funcNodes.getAttribute(UID));
        funcNodes.addEventListener(funcs[index].name, funcs[index].func);
        funcNodes.removeAttribute(UID);
    }

    return parent;
}

/** @type {(x: TemplateStringsArray, ...xs: string[]) => string} */
export const css = interpolate;

/** @type {typeof fetch} */
export function handleFetchErrors(response) {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
}

export const gFetch = async (...args) => handleFetchErrors(await fetch(...args));
export const getText = async (...args) => await (await gFetch(...args)).text();
export const getJSON = async (...args) => await (await gFetch(...args)).json();
