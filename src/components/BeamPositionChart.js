// @ts-ignore
import { css, html, wait, deepCopy, deepMerge, sigmaChar, removeSubsequentDuplicates, arrayEquals } from "../HelperFunctions.js";
import { commonChartOptions, GenericChart } from "./GenericChart.js";

const styling = css`
:host {
    display: inline-block;
    width: 100%;
}
`;

export default class BeamPositionChart extends GenericChart {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.render();

        this._unit = "sigma";
        this._timeType = "real";

        this._limit = Infinity;
        this._data = null;
        this.sigmaInMM = 1; // NOTE: this needs to be changed later

        this.attachChart();
    }

    /**
     * @param {string} newTimeType
     */
    set timeType(newTimeType) {
        this._timeType = newTimeType;

        this.chart.xAxis[0].setTitle({
            text: `${newTimeType[0].toUpperCase()}${newTimeType.slice(1)} time [s]`
        });

        this.refresh();
    }
    get timeType() {
        return this._timeType;
    }

    /**
     * @param {string} newUnits
     */
    set unit(newUnits) {
        this._unit = newUnits;

        this.chart.yAxis[0].setTitle({
            text: `Beam position [${newUnits.replace("sigma", sigmaChar)}]`
        });

        this.refresh();
    }
    get unit() {
        return this._unit;
    }

    set limit(limit) {
        this._limit = limit;
        this.renderLimit(limit);
    }

    get limit() {
        return this._limit;
    }

    set data(data) {
        this._data = data;
        this.refresh();
    }

    get data() {
        return this._data;
    }

    refresh() {
        if (this.data == null) return;

        this.updateData(this.data);
        this.renderLimit(this.limit);
    }

    /**
     * @param {number} newLimit
     */
    renderLimit(newLimit) {
        if (this.maxTime == null) return;

        const putInUnit = (number) => {
            if (this.unit == "sigma") return number;
            else return number * this.sigmaInMM;
        };

        this.chart.series[2].setData(
            [
                [0, putInUnit(newLimit)],
                [this.maxTime, putInUnit(newLimit)]
            ]
        );

        this.chart.series[3].setData(
            [
                [0, -putInUnit(newLimit)],
                [this.maxTime, -putInUnit(newLimit)]
            ]
        );

        this.limits = newLimit;
    }

    /**
     * @param {any} point
     * @returns {[number, number]}
     */
    theirDataPointToOurs(point) {
        return [
            point[0][this.timeType + "Time"],
            point[1][this.unit]
        ];
    }

    /**
     * @private
     * @param {[number, number][][]} newData
     */
    updateData(newData) {
        this.chart.series[0].setData(newData[0].map(x => this.theirDataPointToOurs(x)).slice(0, -1));
        this.chart.series[1].setData(newData[1].map(x => this.theirDataPointToOurs(x)).slice(0, -1));

        if (newData[0].length != 0) {
            this.maxTime = this.theirDataPointToOurs(newData[0].slice(-1)[0])[0];
        }
        else {
            this.maxTime = null;
        }
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
                    text: `Beam position [${sigmaChar}]`,
                }
            },

            xAxis: {
                title: {
                    text: "Real time [s]"
                }
            },
            plotOptions:{
                series: {
                    marker:{
                        states: {
                            select: {
                                enabled: true
                            }
                        }
                    }
                }
            },

            series: [{
                type: "line",
                name: "Beam 1",
                data: [],
                color: "hsl(240, 70%, 70%)"
            }, {
                type: "line",
                name: "Beam 2",
                data: [],
                color: "hsl(0, 70%, 70%)"
            }, {
                type: "area",
                name: null,
                // @ts-ignore
                showInLegend: false,
                threshold: Infinity,
                showInNavigator: false,
                data: [],
                color: "rgb(154, 154, 154)",
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

        window.chart = this.chart;
    }

    /**
     * @param {number} lineNumber
     */
    async showTooltip(lineNumber){
        if(this.chart.series[0].data.length == 0) return;
        // NOTE: the below might happen as the parsing lags behind in a web worker
        if(lineNumber >= this.chart.series[0].data.length) return;

        // @ts-ignore
        this.chart.series[0].data[lineNumber].onMouseOver();
        await wait(1000);
        // @ts-ignore
        this.chart.tooltip.hide();
    }

    render() {
        hyper(this.root)`
        <style>
            ${styling}
        </style>
        <div id="container"></div>
    `;
    }
}
customElements.define("beam-position-chart", BeamPositionChart);
