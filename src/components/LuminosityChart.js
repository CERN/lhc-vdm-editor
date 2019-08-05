import { css, html, throttle } from "../HelperFunctions.js";

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
        this.chart = Highcharts.chart({
            chart: {
                renderTo: this.root.querySelector("#container"),
                height: 300
            },

            credits: {
                enabled: false
            },

            title: {
                text: "Luminosity",
            },

            yAxis: {
                title: {
                    text: "Luminosity [mm]"
                }
            },

            xAxis: {
                title: {
                    text: "Time [s]"
                }
            },

            noData: {
                position: {
                    x: -50 // this is needed to correct for a incorrect center calulation in HighChartss
                }
            },

            plotOptions: {
                line: {
                    // @ts-igWnore
                    label: {
                        enabled: false
                    }
                }
            },

            legend: {
                enabled: false
            },
        
            series: 
             [{
                type: "line",
                data: [],
            }
        ]
        });
    }

    /**
     * @param {[number, number][][]} newData
     */
    updateData(newData){
        this.chart.series[0].setData(newData[0]);
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