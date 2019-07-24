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

/** @type {(x: TemplateStringsArray, ...xs: string[]) => string} */
export const css = interpolate;
// /** @type {(x: TemplateStringsArray, ...xs: string[]) => string} */
export const html = interpolate;


/**
 * @param {Response} response
 */
export function handleFetchErrors(response) {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
}

/** @type {typeof fetch} */
// @ts-ignore
export const gFetch = async (...args) => handleFetchErrors(await fetch(...args));
// @ts-ignore
export const getText = async (...args) => await (await gFetch(...args)).text();
// @ts-ignore
export const getJSON = async (...args) => await (await gFetch(...args)).json();
