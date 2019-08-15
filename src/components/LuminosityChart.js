import { css, html, throttle, deepCopy, deepMerge } from "../HelperFunctions.js";
import { commonChartOptions, GenericChart } from "./GenericChart.js"

const styling = css`
:host {
    display: inline-block;
    width: 100%;
}
`

export default class LuminosityChart extends GenericChart {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();

        this._data = null;
        this._timeType = "real";
        this.positionToLumiPosition = null;

        this.attachChart();
    }

    attachChart(){
        // @ts-ignore
        this.chart = Highcharts.chart(deepMerge(deepCopy(commonChartOptions), /** @type {Highcharts.Options} */({
            chart: {
                height: "75%",
                renderTo: this.root.querySelector("#container"),
            },

            title: {
                text: "Luminosity",
            },

            yAxis: {
                title: {
                    useHTML: true,
                    text: "Luminosity [Hz/cm<sup>2</sup>]",
                }
            },

            xAxis: {
                title: {
                    text: "Real time [s]"
                }
            },

            legend: {
                enabled: false
            },

            series: [{
                type: "line",
                name: "Luminosity",
                data: [],
            }]
        })));
    }

    /**
     * @param {number} pointIndex
     */
    showTooltip(pointIndex){
        if(this.chart.series[0].data.length == 0) return;

        if(this.positionToLumiPosition(pointIndex) == null) return;
        // @ts-ignore
        this.chart.series[0].data[this.positionToLumiPosition(pointIndex)].onMouseOver();
    }

    /**
     * @param {[{realTime: number, sequenceTime: number}, number][]} newData
     */
    set data(newData) {
        this._data = newData;

        this.refresh();
    }
    get data() {
        return this._data
    }

    refresh() {
        if (this.data == null) return;

        this.chart.series[0].setData(this.data.map(
            x => [x[0][this.timeType + "Time"], x[1]]
        ));
    }

    /**
     * @param {string} newTimeType
     */
    set timeType(newTimeType) {
        this._timeType = newTimeType;

        this.chart.xAxis[0].setTitle({
            text: `${newTimeType[0].toUpperCase()}${newTimeType.slice(1)} time [s]`
        })

        this.refresh();
    }
    get timeType() {
        return this._timeType
    }

    connectedCallback() {
        this.reflow();
    }

    async reflow() {
        throttle(() => {
            this.chart.reflow()
        }, 500, this, true);
    }

    set scale(newScale){
        this.chart.yAxis[0].update({
            type: newScale == "log" ? "logarithmic" : "linear"
        })
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
customElements.define('luminosity-chart', LuminosityChart);