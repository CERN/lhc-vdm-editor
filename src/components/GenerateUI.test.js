import { GenerateSequenceWindow } from "./GenerateUI.js";

async function getNewGenerateSequenceWindow() {
    let gsw = new GenerateSequenceWindow();
    gsw.ip = "IP1";
    gsw.style.display = "none";
    document.body.appendChild(gsw);

    return gsw;
}

describe("GenerateUI", () => {
    /** @type {GenerateSequenceWindow} */
    let gsw;

    beforeEach(async () => {
        gsw = await getNewGenerateSequenceWindow();
    });

    afterEach(() => {
        document.body.removeChild(gsw);
    });

    it("can generate a Van Der Meer scan", (done) => {
        gsw.shadowRoot.querySelector("#VdM-tab").click();
        const [waitInput, stepInput, initialInput, finalInput] =
            gsw.shadowRoot.querySelector("#VdM").querySelectorAll("input");
        waitInput.value = "2";
        stepInput.value = "2";
        initialInput.value = "-4";
        finalInput.value = "4";

        gsw.addEventListener("generated", event => {
            expect(event.detail).toBe(
                "RELATIVE_TRIM IP1 BEAM1 SEPARATION -4.00 SIGMA\n" +
                "SECONDS_WAIT 2\n" +
                "RELATIVE_TRIM IP1 BEAM1 SEPARATION 8.00 SIGMA\n" +
                "SECONDS_WAIT 2\n" +
                "RELATIVE_TRIM IP1 BEAM1 SEPARATION -4.00 SIGMA"
            );
            done();
        });

        gsw.shadowRoot.querySelector("#VdM-generate").click();
    });

    it("makes some errors appear", () => {
        gsw.shadowRoot.querySelector("#arrays-tab").click();
        spyOn(window, "alert").and.stub();

        gsw.shadowRoot.querySelector("#array-generate").click();

        expect(window.alert).toHaveBeenCalled();
        expect(Array.from(
            gsw.shadowRoot.querySelector("#arrays").querySelectorAll("input")[0].classList
        )).toContain("error");
    });

    it("can generate an array scan", (done) => {
        gsw.shadowRoot.querySelector("#arrays-tab").click();
        const [timeBetweenTrims, beam1Sep] =
            gsw.shadowRoot.querySelector("#arrays").querySelectorAll("input");

        timeBetweenTrims.value = "1";
        beam1Sep.value = "1, 2";

        gsw.addEventListener("generated", event => {
            expect(event.detail).toBe(
                "RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.00 SIGMA\n" +
                "SECONDS_WAIT 1\n" +
                "RELATIVE_TRIM IP1 BEAM1 SEPARATION 1.00 SIGMA\n" +
                "SECONDS_WAIT 1\n" +
                "RELATIVE_TRIM IP1 BEAM1 SEPARATION -2.00 SIGMA"
            );
            done();
        });

        gsw.shadowRoot.querySelector("#array-generate").click();
    });

    it("can generate from functions", (done) => {
        gsw.shadowRoot.querySelector("#functions-tab").click();
        const [timeBetweenTrims, numSteps, beam1Sep] =
            gsw.shadowRoot.querySelector("#functions").querySelectorAll("input");

        timeBetweenTrims.value = "1";
        numSteps.value = "2";
        beam1Sep.value = "linear(-4, 4)";

        gsw.addEventListener("generated", event => {
            expect(event.detail).toBe(
                "RELATIVE_TRIM IP1 BEAM1 SEPARATION -4.00 SIGMA\n" +
                "SECONDS_WAIT 1\n" +
                "RELATIVE_TRIM IP1 BEAM1 SEPARATION 8.00 SIGMA\n" +
                "SECONDS_WAIT 1\n" +
                "RELATIVE_TRIM IP1 BEAM1 SEPARATION -4.00 SIGMA"
            );
            done();
        });

        gsw.shadowRoot.querySelector("#function-generate").click();
    });
});
