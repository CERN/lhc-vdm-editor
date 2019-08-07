import { css, html, throttle, deepCopy, deepMerge } from "../HelperFunctions.js";
import { commonChartOptions } from "./GenericChart.js"

const styling = css`
:host {
    display: inline-block;
    width: 100%;
}
`

export default class BeamPositionChart extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();

        this.units = "sigma";
        this.timeType = "real";

        this.limits = 0;
        this.data = [];
        this.sigmaToMMFactor = 0.10050641005198852; // NOTE: this needs to be changed later

        this.attachChart();
    }

    /**
     * @param {string} newTimeType
     */
    setTimeType(newTimeType){
        this.timeType = newTimeType;

        this.chart.xAxis[0].setTitle({
            text: `${newTimeType[0].toUpperCase()}${newTimeType.slice(1)} time [s]`
        });

        this.refresh();
    }

    /**
     * @param {string} newUnits
     */
    setUnits(newUnits){
        this.units = newUnits;

        this.chart.yAxis[0].setTitle({
            text: `Beam position [${newUnits.replace("sigma", "&sigma;")}]`
        });

        this.refresh();
    }

    refresh(){
        this.updateData(this.data);
        this.setLimits(this.limits);
    }

    /**
     * @param {number} newLimit
     */
    setLimits(newLimit){
        const putInUnit = (number) => {
            if(this.units == "sigma") return number;
            else return number * this.sigmaToMMFactor;
        }

        this.chart.series[2].setData(
            [
                [0, putInUnit(newLimit)],
                [this.maxTime, putInUnit(newLimit)]
            ]
        )

        this.chart.series[3].setData(
            [
                [0, -putInUnit(newLimit)],
                [this.maxTime, -putInUnit(newLimit)]
            ]
        )

        this.limits = newLimit;
    }

    /**
     * @param {any} point
     * @returns {[number, number]}
     */
    theirDataPointToOurs(point){
        return [
            point[0][this.timeType + "Time"],
            point[1][this.units]
        ];
    }

    /**
     * @param {[number, number][][]} newData
     */
    updateData(newData){
        this.chart.series[0].setData(newData[0].map(x => this.theirDataPointToOurs(x)));
        this.chart.series[1].setData(newData[1].map(x => this.theirDataPointToOurs(x)));

        this.maxTime = this.theirDataPointToOurs(newData[0].slice(-1)[0])[0]

        this.data = newData;
    }

    attachChart(){
        this.chart = Highcharts.chart(deepMerge(deepCopy(commonChartOptions), {
            chart: {
                renderTo: this.root.querySelector("#container"),
            },

            title: {
                text: this.getAttribute("title"),
            },

            yAxis: {
                title: {
                    text: "Beam position [&sigma;]",
                    useHTML: true // for &sigma;
                }
            },

            xAxis: {
                title: {
                    text: "Real time [s]"
                }
            },

            series: [{
                type: "line",
                name: 'Beam 1',
                data: [],
                color: "hsl(0, 70%, 70%)"
            }, {
                type: "line",
                name: 'Beam 2',
                data: [],
                color: "hsl(240, 70%, 70%)"
            }, {
                type: "area",
                name: null,
                // @ts-ignore
                showInLegend: false,
                threshold: Infinity,
                showInNavigator: false,
                data: [],
                color: "rgb(154, 154, 154)"
            }, {
                type: "area",
                name: null,
                // @ts-ignore
                showInLegend: false,
                showInNavigator: false,
                threshold: -Infinity,
                data: [],
                color: "rgb(154, 154, 154)"
            }
        ]}));
    }

    connectedCallback(){
        this.reflow();
    }

    async reflow(){
        throttle(() => {
            this.chart.reflow()
        }, 500, this, true);
    }

    template() {
        return html`
        <style>
            ${styling}
        </style>
        <div id="container"></div>
    `
    }
}
customElements.define('beam-position-chart', BeamPositionChart);