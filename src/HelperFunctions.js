export function range(to, start = 0) {
    let array = new Array(to - start);
    for (var number = start, i = 0; number < to; number++ , i++) {
        array[i] = number;
        i++;
    }
    return array;
}

/**
 * @param {any} element
 * @param {number} numberOfTimes
 */
export function repeat(element, numberOfTimes){
    return (new Array(numberOfTimes)).fill(element);
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

/**
 * @param {number} milliseconds
 */
export async function wait(milliseconds){
    return new Promise((resolve, _) => {
        setTimeout(resolve, milliseconds);
    })
}

export const NO_FILES_TEXT = "--- NO FILES ---";

let throttleIDs = new Set();
/**
 * @param {number} time
 * @param {() => any} func
 */
export async function throttle(func, time, uid){
    if(!throttleIDs.has(uid)){
        throttleIDs.add(uid);
        func();

        (async () => {
            await wait(time);
            throttleIDs.delete(uid);
        })()
    }
}

/**
 * Adds the VDM line numbers to a file without line numbers
 * 
 * @param {string} text
 */
export function addLineNumbers(text, start = 1) {
    let currentLine = start;

    return text.split("\n").map((line) => {
        if (line[0] == "#" || line.trim() == "") {
            return line;
        }
        else {
            let newLine = currentLine.toString() + " " + line;
            currentLine++;
            return newLine;
        }
    }).join("\n");
}

/**
 * @param {number} num
 * @param {number} sigFigs
 */
export function sigFigRound(num, sigFigs){
    const numTxt = num.toString();

    if(num < 0 && numTxt.length <= sigFigs + 1) return numTxt; // negative numbers
    else if(Math.round(num) != num && numTxt.length <= sigFigs + 1) return numTxt; // non-integers
    else if(numTxt.length <= sigFigs) return numTxt; // integers
    else if(numTxt.split("e")[0].length <= sigFigs + 1) return numTxt; // standard form
    return num.toExponential(sigFigs - 1).replace(".00e", "e").replace("0e", "e");
}

/**
 * Merges the propeties from two objects recursively, only if they
 * are pure objects, not instances of classes
 * @param {Object} obA Note: this function modifies this parameter
 * @param {Object} obB 
 */
export function deepMerge(obA, obB){
    for(let [key, value] of Object.entries(obB)){
        if(obA[key] == undefined || obA[key].__proto__ != Object.prototype) obA[key] = value;
        else deepMerge(obA[key], obB[key])
    }

    return obA;
}

/**
 * Makes a deep copy of an object
 * @param {Object} object 
 */
export function deepCopy(object){
    if(typeof object !== "object" || object == null) return object;
    let newObject = {};

    for(let [key, value] of Object.entries(object)){
        newObject[key] = deepCopy(value);
    }
    return newObject;
}