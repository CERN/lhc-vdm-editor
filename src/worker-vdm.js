/**
 * Gets the file "./parser.js"
 * 
 * NOTE: This is necessary as modules and therefore "import" statements are not implemented
 * in major browsers for web workers at the moment.
 */
async function getParser(){
    const parserSourceText = 
        (await (await fetch("./parser.js")).text())
        .replace(/export function/g, "function")
        .replace(/export class/g, "class")
        + "\n;(() => ({parseVdM: parseVdM, deparseVdM: deparseVdM}))()";
    return eval(parserSourceText);
}

(async () => {
    const parser = await getParser();
    addEventListener("message", (message) => {
        if(message.data.type == "text_change"){
            let messageToSend = {
                type: "lint"
            }

            try {
                const result = parser.deparseVdM(parser.parseVdM(message.data.text, true));

                messageToSend.header = result.split("\n")[0];
            }
            catch(errors){
                if(Array.isArray(errors)){
                    // @ts-ignore
                    messageToSend.errors = errors.map(error => ({
                        row: error.line,
                        column: 0,
                        text: error.message,
                        type: "error"
                    }))
                }
                else{
                    throw errors;
                }
            }

            // @ts-ignore
            postMessage(messageToSend);
        }
    })
})()
