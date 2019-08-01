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

/**
 * @param {string} absPath
 * @param {string} prefix
 */
export function getRelativePath(absPath, prefix){
    return absPath.split("/").filter(x => x != "").slice(
        prefix.split("/").filter(x => x != "").length).join("/")
}

/**
 * @param {string} filePath
 */
export function getFilenameFromPath(filePath){
    return filePath.split("/").pop();
}


/**
 * @param {Map} map1
 * @param {Map} map2
 */
export function mergeMaps(map1, map2){
    return new Map(Array.from(map1.entries()).concat(
        Array.from(map2.entries())))
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
        throw response;
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

/**
 * @type <T>(array: T[], func: (item: T, index: number, array: T[]) => Promise<T>) => Promise<T[]>
 */
export async function asyncMap(array, func){
    let newArray = new Array(array.length);
    for(let [i, item] of array.entries()){
        newArray[i] = await func(item, i, array);
    }

    return newArray;
}

/**
 * @type <T>(array: (Promise<T>)[]) => Promise<T[]>
 */
export async function awaitArray(array){
    let newArray = new Array(array.length);
    for(let [i, item] of array.entries()){
        newArray[i] = await item;
    }

    return newArray;
}

export const preventResizeCSS = `
-webkit-touch-callout: none;
-webkit-user-select: none;
-khtml-user-select: none;
-moz-user-select: none;
-ms-user-select: none;
user-select: none;
`

export const NO_FILES_TEXT = "--- NO FILES ---"