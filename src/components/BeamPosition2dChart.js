// @ts-ignore
import { css, html, wait, deepCopy, deepMerge, sigmaChar, removeSubsequentDuplicates, arrayEquals } from "../HelperFunctions.js";
import { commonChartOptions, GenericChart } from "./GenericChart.js";

const styling = css`
:host {
    display: inline-block;
    width: 100%;
}
`;

export default class BeamPosition2dChart extends GenericChart {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.render();

        this._unit = "sigma";

        this._data = null;
        this.sigmaInMM = 1; // NOTE: this needs to be changed later

        this.attachChart();
    }

    /**
     * @param {string} newUnits
     */
    set unit(newUnits) {
        this._unit = newUnits;

        this.chart.xAxis[0].setTitle({
            text: `Sep Beam position [${newUnits.replace("sigma", sigmaChar)}]`
        });

        this.chart.yAxis[0].setTitle({
            text: `Xing Beam position [${newUnits.replace("sigma", sigmaChar)}]`
        });

        this.refresh();
    }
    get unit() {
        return this._unit;
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
    }

    /**
     * @param {any} dataCrossing
     * @param {any} dataSeparation
     * @returns {[number, number][]}
     */
    toXYPoints(dataSeparation, dataCrossing) {
        return dataSeparation.map((_, i) => [
            dataSeparation[i][1][this.unit],
            dataCrossing[i][1][this.unit]
        ]);
    }

    /**
     * @private
     * @param {any} newData
     */
    updateData(newData) {
        const crossing = newData.beamCrossing;
        const separation = newData.beamSeparation;
        if (crossing != null && separation != null) {
            this.chart.series[0].setData(this.toXYPoints(separation[0], crossing[0]).slice(0, -1));
            this.chart.series[1].setData(this.toXYPoints(separation[1], crossing[1]).slice(0, -1));
        } else {
            this.chart.series[0].setData([]);
            this.chart.series[1].setData([]);
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
                    text: `Xing Beam position [${sigmaChar}]`,
                }
            },

            xAxis: {
                title: {
                    text: `Sep Beam position [${sigmaChar}]`,
                }
            },

            tooltip: {
                headerFormat: '<b>{series.name}</b><br/>',
                pointFormat: 'Separation: {point.x:.2f}<br/>Crossing: {point.y:.2f}',
                shared: true,
                // NOTE: disable this while https://github.com/highcharts/highcharts/issues/11688 is still a bug
                //outside: true // this is needed to make the tooltip not go under the axis title
            },

            
            plotOptions:{
                series: {
                    animation: false,
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
                type: "scatter",
                name: "Beam 1",
                data: [],
                color: "hsl(240, 70%, 70%)"
            }, {
                type: "scatter",
                name: "Beam 2",
                data: [],
                color: "hsl(0, 70%, 70%)"
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
customElements.define("beam-position-2d-chart", BeamPosition2dChart);
