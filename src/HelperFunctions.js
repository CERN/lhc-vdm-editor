export function range(to, start=0){
    let array = new Array(to - start);
    for(var number = start, i = 0;number < to;number++, i++){
        array[i] = number;
        i++;
    }
    return array;
}

function interpolate(literals, ...expressions) {
    let string = ``
    for (const [i, val] of expressions.entries()) {
      string += literals[i] + val
    }
    string += literals[literals.length - 1]
    return string
  }

/** @type {(x: string) => string} */
export const html = interpolate;
export const css = interpolate;