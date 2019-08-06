import { css, html, throttle, deepCopy, deepMerge } from "../HelperFunctions.js";
import { commonChartOptions } from "./GenericChart.js"

const styling = css`
:host {
    display: inline-block;
    width: 100%;
}
`

export default class LuminosityChart extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.innerHTML = this.template();

        this.attachChart();
    }

    attachChart(){
        this.chart = Highcharts.chart(deepMerge(deepCopy(commonChartOptions), {
            chart: {
                renderTo: this.root.querySelector("#container"),
            },

            title: {
                text: "Luminosity",
            },

            yAxis: {
                title: {
                    useHTML: true,
                    text: "Luminosity [Hz/mm<sup>2</sup>]",
                },
                type: 'logarithmic'
            },

            xAxis: {
                title: {
                    text: "Time [s]"
                }
            },

            legend: {
                enabled: false
            },
        
            series: 
             [{
                type: "line",
                data: [],
            }]
        }));
    }

    /**
     * @param {[number, number][]} newData
     */
    updateData(newData){
        this.chart.series[0].setData(newData);
    }

    connectedCallback(){
        this.reflow();
    }

    async reflow(){
        throttle(() => {
            this.chart.reflow()
        }, 500, this);
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