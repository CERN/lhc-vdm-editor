import { css, sigmaChar } from "../HelperFunctions.js";
import "./BeamPositionChart.js";
import "./BeamPosition2dChart.js";
import "./LuminosityChart.js";
import { MyHyperHTMLElement } from "./MyHyperHTMLElement.js";

const styling = css`
:host {
    font-family: sans-serif;
}

input[type="radio"]{
    margin: 3px 3px 3px 3px;
}

.option{
    padding: 0 5px;
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

hr{
    border: 1px solid lightgray;
}
`;

export default class ChartsComponent extends MyHyperHTMLElement {
    constructor() {
        super({
            "unit": "sigma",
            "scale": "linear",
            "timeType": "real",
            "data": {
                beamSeparation: null,
                beamCrossing: null,
                luminosity: null
            },
            "limit": Infinity,
            "sigmaInMM": 1
        });
        this.root = this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        super.connectedCallback();
        this.allCharts = Array.from(this.root.querySelectorAll("beam-position-chart, beam-position-2d-chart, luminosity-chart"));
    }

    reflow() {
        this.allCharts.forEach(chart => chart.reflow());
    }

    /**
     * @param {number} pointIndex
     */
    showTooltips(pointIndex){
        this.allCharts.forEach(chart => chart.showTooltip(pointIndex));
    }

    render() {
        const chartProperties = {
            unit: this.unit,
            timeType: this.timeType,
            limit: this.limit,
            sigmaInMM: this.sigmaInMM
        };

        let timeToLumiPositionMap = new Map();
        let realPositionToTime = _ => null;
        if(this.data.luminosity != null){
            for(let [statementNum, luminosityEntry] of this.data.luminosity.entries()){
                // NOTE: in this, the last entry will always be set, which is what we want
                timeToLumiPositionMap.set(luminosityEntry[0][this.timeType + "Time"], statementNum);
            }

            realPositionToTime = position => {
                if(position >= this.data.beamSeparation[0].length) return null;

                return this.data.beamSeparation[0][position][0][this.timeType + "Time"];
            };
        }

        hyper(this.root)`
        <style>
            ${styling}
        </style>
        <div onchange=${this}>
            <div class="radioSection">
                <div class="switchingRow" id="realSequenceRadio">
                    <span class="radio-description">Time display:</span>
                    <div class="option">
                        <input checked type="radio" name="timeType" id="realRadio" value="real"/>
                        <label for="realRadio">Real</label>
                    </div>
                    <div class="option">
                        <input type="radio" name="timeType" id="sequenceRadio" value="sequence" />
                        <label for="sequenceRadio">Sequence</label>
                    </div>
                </div>
                <div class="switchingRow" id="mmSigmaRadio">
                    <span class="radio-description">Units:</span>
                    <div class="option">
                        <input checked type="radio" name="unit" id="sigmaRadio" value="sigma" />
                        <label for="sigmaRadio">${sigmaChar}</label>
                    </div>
                    <div class="option">
                        <input type="radio" name="unit" id="mmRadio" value="mm" />
                        <label for="mmRadio">mm</label>
                    </div>
                </div>
            </div>
            <hr>
            <beam-position-chart properties=${chartProperties} data=${this.data.beamSeparation} id="separation-chart" title="Separation"></beam-position-chart>
            <beam-position-chart properties=${chartProperties} data=${this.data.beamCrossing} id="crossing-chart" title="Crossing"></beam-position-chart>
            <hr>
            <div id="sepPosRadio">
                <span class="radio-description">Display:</span>
                <div class="option">
                    <input type="radio" name="mode" id="beamPosition" value="pos" />
                    <label for="beamPosition">Position</label>
                </div>
                <div class="option">
                    <input checked type="radio" name="mode" id="beamSeparation" value="sep" />
                    <label for="beamSeparation">Separation</label>
                </div>
            </div>
            <beam-position-2d-chart properties=${chartProperties} mode=${this.mode} data=${{"beamCrossing": this.data.beamCrossing, "beamSeparation": this.data.beamSeparation}} id="sep-2d-chart" title="2D Beam Position"></beam-position-2d-chart>
            <hr>
            <div id="logLinearRadio">
                <span class="radio-description">Scale:</span>
                <div class="option">
                    <input checked type="radio" name="scale" id="linearRadio" value="linear" />
                    <label for="linearRadio">Linear</label>
                </div>
                <div class="option">
                    <input type="radio" name="scale" id="logRadio" value="log" />
                    <label for="logRadio">Logarithmic</label>
                </div>
            </div>
        </div>
        <luminosity-chart scale=${this.scale} data=${this.data.luminosity} timeType=${this.timeType}
            positionToLumiPosition=${pos => {
                const time = realPositionToTime(pos);
                if(time == null) return null;
                else return timeToLumiPositionMap.get(time);
            }} id="luminosity-chart"></luminosity-chart>
    `;
    }
}
customElements.define("charts-component", ChartsComponent);
