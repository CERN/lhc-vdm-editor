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
        this._mode = "sep";

        this._data = null;
        this.sigmaInMM = 1; // NOTE: this needs to be changed later

        this.attachChart();
    }

    /**
     * @param {string} newUnits
     */
    set unit(newUnits) {
        this._unit = newUnits;
        this.refresh();
    }
    get unit() {
        return this._unit;
    }

    /**
     * @param {string} newMode
     */
    set mode(newMode) {
        this._mode = newMode;
        this.refresh();
    }
    get mode() {
        return this._mode;
    }

    
    set data(data) {
        this._data = data;
        this.refresh();
    }

    get data() {
        return this._data;
    }

    refresh() {
        if (this.data == null || this.chart == null) return;

        this.chart.xAxis[0].setTitle({
            text: `Sep Beam ${this.mode} [${this.unit.replace("sigma", sigmaChar)}]`
        });

        this.chart.yAxis[0].setTitle({
            text: `Xing Beam ${this.mode} [${this.unit.replace("sigma", sigmaChar)}]`
        });

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
     * @param {any} data
     */
    updateData(data) {
        while (this.chart.series.length) {
            this.chart.series[0].remove();
        }

        let positionBeam1 = [];
        let positionBeam2 = [];
        if (data.beamCrossing != null && data.beamSeparation != null) {
            positionBeam1 = this.toXYPoints(data.beamSeparation[0], data.beamCrossing[0]).slice(0, -1);
            positionBeam2 = this.toXYPoints(data.beamSeparation[1], data.beamCrossing[1]).slice(0, -1);
        }

        if (this.mode == 'pos') {
            this.chart.addSeries({
                type: "scatter",
                name: "Beam 1",
                data: positionBeam1,
                color: "hsl(240, 70%, 70%)"
            });
            this.chart.addSeries({
                type: "scatter",
                name: "Beam 2",
                data: positionBeam2,
                color: "hsl(0, 70%, 70%)"
            });
        } else {
            const separation = positionBeam1.map((_, i) => [
                positionBeam1[i][0] - positionBeam2[i][0],
                positionBeam1[i][1] - positionBeam2[i][1],
            ]);    
            this.chart.addSeries({
                type: "scatter",
                name: "Nominal Separation",
                data: separation,
                color: "hsl(0, 0, 0)"
            });
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
                pointFormat: 'Separation Plane: {point.x:.2f}<br/>Crossing Plane: {point.y:.2f}',
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

            series: []
        }));

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
