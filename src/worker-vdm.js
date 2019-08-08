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
        + "\n;(() => ({VdM: VdM}))()";
    return eval(parserSourceText);
}

const SIGMA_TO_MM = 0.10050641005198852; // NOTE: this needs to be changed later

(async () => {
    const parser = await getParser();
    addEventListener("message", (message) => {
        if(message.data.type == "text_change"){
            let messageToSend = {
                type: "lint"
            }

            let instance = new parser.VdM(message.data.beamParams, 'IP1');
            let parsedResult = instance.parse(message.data.text, message.data.hasHeaders);
            const result = instance.deparse(parsedResult);
            messageToSend.header = result.split("\n")[0];

            if (instance.errors.length > 0) {
                messageToSend.errors = instance.errors.map(error => ({
                    row: error.line,
                    column: 0,
                    text: error.message,
                    type: "error"
                }))
            }

            messageToSend.beamSeparationData = [
                instance.toBeamGraph(1, "SEPARATION"),
                instance.toBeamGraph(2, "SEPARATION")
            ]

            messageToSend.beamCrossingData = [
                instance.toBeamGraph(1, "CROSSING"),
                instance.toBeamGraph(2, "CROSSING")
            ]

            messageToSend.luminosityData = instance.toLumiGraph();

            postMessage(messageToSend);
        }
    })
})()
