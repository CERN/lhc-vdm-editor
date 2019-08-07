import { css, html } from "../HelperFunctions.js";
import "./BeamPositionChart.js"
import "./LuminosityChart.js"

const styling = css`
:host {
    font-family: sans-serif
}

input[type="radio"]{
    margin: 3px 3px 3px 3px;
}

.option{
    padding: 5px;
    margin: 3px;
    display: table-cell;
}

.radio-description{
    display: table-cell;
}

.radioSection{
    display: table;
}

.switchingRow{
    display: table-row;
}
`

export default class ChartsComponent extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();

        this.separationChart = this.root.querySelector("#separation-chart");
        this.crossingChart = this.root.querySelector("#crossing-chart");
        this.luminosityChart = this.root.querySelector("#luminosity-chart");

        this.allCharts = [this.separationChart, this.crossingChart, this.luminosityChart];
    }

    passInValues(sigmaToMMFactor){
        this.sigmaToMMFactor = sigmaToMMFactor;

        this.allCharts.forEach(chart => chart.passInValues(sigmaToMMFactor));
    }

    updateData(beamSeparationData, beamCrossingData, luminosityData, limits){
        this.separationChart.updateData(beamSeparationData);
        this.crossingChart.updateData(beamCrossingData);
        this.luminosityChart.updateData(luminosityData);

        this.separationChart.setLimits(limits);
        this.crossingChart.setLimits(limits);

        Array.from(this.root.querySelectorAll("#realSequenceRadio input[type=\"radio\"]")).map(x => x.addEventListener("change", _ => {
            let timeType = this.root.querySelector("#realRadio").checked ? "real" : "sequence";

            this.allCharts.map(x => x.setTimeType(timeType));
        }))

        Array.from(this.root.querySelectorAll("#mmSigmaRadio input[type=\"radio\"]")).map(x => x.addEventListener("change", _ => {
            let units = this.root.querySelector("#mmRadio").checked ? "mm" : "sigma";

            this.separationChart.setUnits(units);
            this.crossingChart.setUnits(units);
        }))
    }

    reflow(){
        this.allCharts.forEach(chart => chart.reflow());
    }

    template() {
        return html`
        <style>
            ${styling}
        </style>
        <div class="radioSection">
            <div class="switchingRow" id="realSequenceRadio">
                <span class="radio-description">Time display:</span>
                <div class="option">
                    <input checked type="radio" name="realSequenceTime" id="realRadio" value="real" />
                    <label for="realRadio">Real</label>
                </div>
                <div class="option">
                    <input type="radio" name="realSequenceTime" id="sequenceRadio" value="sequence" />
                    <label for="sequenceRadio">Sequence</label>
                </div>
            </div>
            <div class="switchingRow" id="mmSigmaRadio">
                <span class="radio-description">Units:</span>
                <div class="option">
                    <input checked type="radio" name="mmSigma" id="mmRadio" value="mm" />
                    <label for="mmRadio">mm</label>
                </div>
                <div class="option">
                    <input type="radio" name="mmSigma" id="sigmaRadio" value="sigma" />
                    <label for="sigmaRadio">&sigma;</label>
                </div>
            </div>
        </div>
        <hr>
        <beam-position-chart id="separation-chart" title="Separation"></beam-position-chart>
        <beam-position-chart id="crossing-chart" title="Crossing"></beam-position-chart>
        <luminosity-chart id="luminosity-chart"></luminosity-chart>
    `
    }
}
customElements.define('charts-component', ChartsComponent);