export function range(to, start = 0) {
    let array = new Array(to - start);
    for (var number = start, i = 0; number < to; number++ , i++) {
        array[i] = number;
        i++;
    }
    return array;
}

/**
 * @params {any} element
 * @params {number} numberOfTimes
 */
export function repeat(element, numberOfTimes) {
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

export function getFragmentOfChildNodes(node) {
    let fragment = document.createDocumentFragment();
    for (let childNode of node.children) {
        fragment.appendChild(childNode);
    }

    return fragment;
}

/**
 * @params {string} absPath
 * @params {string} prefix
 */
export function getRelativePath(absPath, prefix) {
    return absPath.split("/").filter(x => x != "").slice(
        prefix.split("/").filter(x => x != "").length).join("/")
}

/**
 * @params {string} filePath
 */
export function getFilenameFromPath(filePath) {
    return filePath.split("/").pop();
}


/**
 * @params {Map} map1
 * @params {Map} map2
 */
export function mergeMaps(map1, map2) {
    return new Map(Array.from(map1.entries()).concat(
        Array.from(map2.entries())))
}

/** @type {(x: TemplateStringsArray, ...xs: string[]) => string} */
export const css = interpolate;
///** @type {(x: TemplateStringsArray, ...xs: string[]) => string} */
export const html = interpolate;

/**
 * @params {Response} response
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
export async function asyncMap(array, func) {
    let newArray = new Array(array.length);
    for (let [i, item] of array.entries()) {
        newArray[i] = await func(item, i, array);
    }

    return newArray;
}

/**
 * @type <T>(array: (Promise<T>)[]) => Promise<T[]>
 */
export async function awaitArray(array) {
    let newArray = new Array(array.length);
    for (let [i, item] of array.entries()) {
        newArray[i] = await item;
    }

    return newArray;
}

export const preventSelectCSS = `
-webkit-touch-callout: none;
-webkit-user-select: none;
-khtml-user-select: none;
-moz-user-select: none;
-ms-user-select: none;
user-select: none;
`

/**
 * @params {number} milliseconds
 */
export async function wait(milliseconds) {
    return new Promise((resolve, _) => {
        setTimeout(resolve, milliseconds);
    })
}

export const NO_FILES_TEXT = "--- NO FILES ---";

let throttleIDs = new Set();
/**
 * Makes sure that the function is called at most once (or twice if callLast is true)
 * per amount of time
 * @param {number} time
 * @param {() => any} func
 * @param {any} uid
 * @param {boolean} callLast Calls the function every `time` milliseconds (to make 
 * sure the function is always called after throttle is stopped being called)
 */
export async function throttle(func, time, uid, callLast = false) {
    if (!throttleIDs.has(uid)) {
        throttleIDs.add(uid);
        func();

        (async () => {
            await wait(time);
            throttleIDs.delete(uid);

            if (callLast) func();
        })()
    }
}

/**
 * Adds the VDM line numbers to a file without line numbers
 * 
 * @params {string} text
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
 * @params {number} num
 * @params {number} sigFigs
 */
export function sigFigRound(num, sigFigs) {
    const numTxt = num.toString();

    if (num < 0 && numTxt.length <= sigFigs + 1) return numTxt; // negative numbers
    else if (Math.round(num) != num && numTxt.length <= sigFigs + 1) return numTxt; // non-integers
    else if (numTxt.length <= sigFigs) return numTxt; // integers
    else if (numTxt.split("e")[0].length <= sigFigs + 1) return numTxt; // standard form
    return num.toExponential(sigFigs - 1).replace(".00e", "e").replace("0e", "e");
}

/**
 * Merges the propeties from two objects recursively, only if they
 * are pure objects, not instances of classes
 * @params {Object} obA Note: this function modifies this paramseter
 * @params {Object} obB 
 */
export function deepMerge(obA, obB) {
    for (let [key, value] of Object.entries(obB)) {
        if (obA[key] == undefined || obA[key].__proto__ != Object.prototype) obA[key] = value;
        else deepMerge(obA[key], obB[key])
    }

    return obA;
}

/**
 * Makes a deep copy of an object
 * @params {Object} object 
 */
export function deepCopy(object) {
    if (typeof object !== "object" || object == null) return object;
    let newObject = {};

    for (let [key, value] of Object.entries(object)) {
        newObject[key] = deepCopy(value);
    }
    return newObject;
}

export const DEFAULT_BEAM_PARAMS = {
    "energy": 6500,
    "particle_mass": 0.938,
    "emittance": 3.5e-6,
    "beta_star": {
        "IP1": 20,
        "IP2": 21,
        "IP5": 20,
        "IP8": 23
    },
    "crossing_angle": {
        "IP1": 0,
        "IP2": 200e-6,
        "IP5": 0,
        "IP8": 200e-6
    },
    "scan_limits": {
        "IP1": 6,
        "IP2": 4,
        "IP5": 6,
        "IP8": 4
    },
    "trim_rate": 0.1,
    "intensity": 1e11,
    "bunch_pair_collisions": {
        "IP1": 50,
        "IP2": 50,
        "IP5": 50,
        "IP8": 50
    },
    "bunch_length": 0.0787
}

/**
 * @template T
 * @param {T[]} arr
 * @param {(element: T) => any} func
 * @returns {T[][]}
 */
export function groupBy(arr, func) {
    const groups = new Map();
    arr.forEach(element => {
        const key = func(element);
        if (!groups.has(key)) {
            groups.set(key, [element]);
        }
        else {
            groups.set(key, groups.get(key).concat([element]))
        }
    })

    return Array.from(groups.values())
}

/**
 * @param {any[]} ob1
 * @param {any[]} ob2
 */
export function arrayEquals(ob1, ob2){
    return ob1.every((x, i) => x == ob2[i])
}

/**
 * @param {string} filePath1
 * @param {string} filePath2
 */
export function joinFilePaths(filePath1, filePath2) {
    if (filePath1.endsWith("/")) return filePath1 + filePath2
    else return filePath1 + "/" + filePath2
}

export var sigmaChar = "\u03C3";

/**
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function removeSubsequentDuplicates(arr, cmp=(a, b) => a == b){
    let duplicate = Symbol("duplicate");
    // @ts-ignore
    return arr.map((x, i) => {
        if(i == arr.length - 1 || !cmp(x, arr[i + 1])) return x;
        else return duplicate;
    }).filter(x => x !== duplicate);
}

/**
 * @param {Node} element
 * @param {string} text
 * @returns {HTMLElement}
 */
export function getHTMLElementWithText(element, text){
    if(element.nodeName == "#text" && element.nodeValue.includes(text)) return element.parentElement;
    else {
        // @ts-ignore
        if(element.shadowRoot != undefined){
            // @ts-ignore
            return getHTMLElementWithText(element.shadowRoot, text);
        }
        else if(element.childNodes.length !== 0){
            // @ts-ignore
            for(let child of element.childNodes){
                const foundElement = getHTMLElementWithText(child, text);
                if(foundElement != null) return foundElement;
            }
        }
    }
    return null;
}

/**
 * @param {HTMLElement} element
 * @param {string} text
 */
export function HTMLHasText(element, text){
    return getHTMLElementWithText(element, text) != null;
}

/**
 * Removes the line numbers from the text of a VDM file
 * 
 * @param {string} text 
 */
export function removeLineNumbers(text) {
    return text.split("\n").map(x => {
        const match = x.match(/^[0-9]+ +/);
        if (match !== null) {
            const numMatchLength = match[0].length;
            return x.slice(numMatchLength);
        }
        else {
            return x;
        }

    }).join("\n");
}

export function isAFolderOf(filePath, folderPath){
    const fileParts = filePath.split("/").filter(x => x != "");
    const folderParts = folderPath.split("/").filter(x => x != "");
    
    return arrayEquals(fileParts.slice(0, folderParts.length), folderParts);
}

/**
 * @param {any} value
 */
export function properTypeOf(value){
    return Object.prototype.toString.call(value).match(/^\[object (.*)\]$/)[1];
}

/**
 * @param {any} thisValue
 * @param {{[key: string]: Function}} obj
 */
export function assertRequiredParameters(thisValue, obj){
    for(let [key, expectedType] of Object.entries(obj)){
        if(thisValue[key] === undefined && obj[key] !== undefined){
            throw Error(`${properTypeOf(this)} expected ${key} to be populated and it is not.`)
        }
        else{
            if(typeof thisValue[key] == "object"){
                if(expectedType == null) return thisValue[key] === null;
                else return thisValue[key] instanceof expectedType;
            }
            else{
                return typeof thisValue[key] == expectedType.name.toLowerCase();
            }
        }
    }
}