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
        + "\n;(() => ({parseVdM: parseVdM, deparseVdM: deparseVdM, VdMSyntaxError: VdMSyntaxError}))()";
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
            let parsedResult;

            try {
                parsedResult = parser.parseVdM(message.data.text, message.data.parseHeader, message.data.beamParams);
                const result = parser.deparseVdM(parsedResult);

                messageToSend.header = result.split("\n")[0];
            }
            catch(error){
                if(error instanceof parser.VdMSyntaxError){
                    messageToSend.errors = error.errors.map(error => ({
                        row: error.line,
                        column: 0,
                        text: error.message,
                        type: "error"
                    }))

                    parsedResult = error.dataStructure;
                }
                else{
                    throw error;
                }
            }

            function getBeamGraph(beamNumber, sepCrossing){
                return parsedResult.map(line => {
                    if(line.type == "command")
                        return [{
                            realTime: line.realTime,
                            sequenceTime: line.sequenceTime
                        }, {
                            mm: line.pos["BEAM" + beamNumber][sepCrossing],
                            sigma: line.pos["BEAM" + beamNumber][sepCrossing] / SIGMA_TO_MM
                        }]
                }).filter(x => x);
            }

            messageToSend.beamSeparationData = [
                getBeamGraph(1, "SEPARATION"),
                getBeamGraph(2, "SEPARATION")
            ]

            messageToSend.beamCrossingData = [
                getBeamGraph(1, "CROSSING"),
                getBeamGraph(2, "CROSSING")
            ]

            messageToSend.luminosityData = parsedResult.map(line => {
                if(line.type == "command") return [{
                    realTime: line.realTime,
                    sequenceTime: line.sequenceTime
                }, line.luminosity]
            }).filter(x => x);

            postMessage(messageToSend);
        }
    })
})()
