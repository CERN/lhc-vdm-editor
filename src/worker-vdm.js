addEventListener("message", (message) => {
    // @ts-ignore
    postMessage({
        type: "lint",
        errors: [{
            row: Math.floor(Math.random()*10),
            column: 0,
            text: "Error Message", // Or the Json reply from the parser 
            type: "error" // also "warning" and "information"
        }]
    })
})