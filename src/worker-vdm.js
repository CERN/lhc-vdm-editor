/**
 * Gets the file "./parser.js"
 *
 * NOTE: This is necessary as modules and therefore "import" statements are not implemented
 * in major browsers for web workers at the moment.
 */
async function getParser() {
    const parserSourceText =
        (await (await fetch("./parser.js")).text())
            .replace(/export function/g, "function")
            .replace(/export class/g, "class")
            .replace(/export default class/g, "class")
        + "\n;(() => ({VdM: VdM}))()";
    return eval(parserSourceText);
}

(async () => {
    const parser = await getParser();
    addEventListener("message", (message) => {
        if (message.data.type == "text_change") {
            let messageToSend = {
                type: "lint"
            };

            let VdMinstance = new parser.VdM(message.data.beamParams, message.data.ip)
                .parse(message.data.text, message.data.hasHeaders);
            const result = VdMinstance.deparse();
            messageToSend.header = result.split("\n")[0];

            if (VdMinstance.errors.length > 0) {
                messageToSend.errors = VdMinstance.errors.map(error => ({
                    row: error.line,
                    column: 0,
                    text: error.message,
                    type: "error"
                }));
            }

            messageToSend.beamSeparationData = [
                VdMinstance.toBeamGraph(1, "SEPARATION"),
                VdMinstance.toBeamGraph(2, "SEPARATION")
            ];

            messageToSend.beamCrossingData = [
                VdMinstance.toBeamGraph(1, "CROSSING"),
                VdMinstance.toBeamGraph(2, "CROSSING")
            ];

            messageToSend.luminosityData = VdMinstance.toLumiGraph();

            postMessage(messageToSend);
        }
    });
})();
