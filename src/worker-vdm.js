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

(async () => {
    const parser = await getParser();
    addEventListener("message", (message) => {
        if(message.data.type == "text_change"){
            let messageToSend = {
                type: "lint"
            }
            let parsedResult;

            try {
                parsedResult = parser.parseVdM(message.data.text, message.data.parseHeader);
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

            messageToSend.beamSeparationData = [
                parsedResult.map(line => {
                    if(line.type == "command") return [line.realTime, line.pos.BEAM1.SEPARATION]
                }).filter(x => x),
                parsedResult.map(line => {
                    if(line.type == "command") return [line.realTime, line.pos.BEAM2.SEPARATION]
                }).filter(x => x)
            ]

            messageToSend.beamCrossingData = [
                parsedResult.map(line => {
                    if(line.type == "command") return [line.realTime, line.pos.BEAM1.CROSSING]
                }).filter(x => x),
                parsedResult.map(line => {
                    if(line.type == "command") return [line.realTime, line.pos.BEAM2.CROSSING]
                }).filter(x => x)
            ]

            messageToSend.luminosityData = parsedResult.map(line => {
                if(line.type == "command") return [line.realTime, line.luminosity]
            }).filter(x => x);

            postMessage(messageToSend);
        }
    })
})()
