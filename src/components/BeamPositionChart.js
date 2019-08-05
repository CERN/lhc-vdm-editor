import { css, html, throttle } from "../HelperFunctions.js";

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

        this.attachChart();
    }

    attachChart(){
        this.chart = Highcharts.chart({
            chart: {
                renderTo: this.root.querySelector("#container"),
                reflow: true,
                animation: false,
                height: 300
            },

            credits: {
                enabled: false
            },

            title: {
                text: "Separation",
            },

            yAxis: {
                title: {
                    text: "Beam position [mm]"
                }
            },

            xAxis: {
                title: {
                    text: "Time [s]"
                }
            },

            exporting: {
                enabled: false
            },

            plotOptions: {
                area: {
                    marker: {
                        enabled: false,
                        states: {
                            hover: {
                                enabled: false
                            }
                        }
                    }
                }
            },
        
            series: [{
                type: "line",
                name: 'Beam 1',
                data: [43934, 52503, 57177, 69658, 97031, 119931, 137133, 154175],
                color: "hsl(0, 70%, 70%)"
            }, {
                type: "line",
                name: 'Beam 2',
                data: [24916, 24064, 29742, 29851, 32490, 30282, 38121, 40434],
                color: "hsl(240, 70%, 70%)"
            }, {
                type: "area",
                name: null,
                showInLegend: false,
                showInNavigator: false,
                data: [24916, 24916, 24916, 24916, 24916, 24916, 24916, 24916],
                color: "rgb(154, 154, 154)"
            }, {
                type: "area",
                name: null,
                showInLegend: false,
                showInNavigator: false,
                threshold: Infinity,
                data: [154175, 154175, 154175, 154175, 154175, 154175, 154175, 154175],
                color: "rgb(154, 154, 154)"
            }
        ]
        });
    }

    /**
     * @param {number} newLimit
     */
    set limits(newLimit){

    }

    /**
     * @param {[number, number][][]} newData
     */
    set data(newData){
        this.chart.update({
            series: [{
                    type: "line",
                    name: 'Beam 1',
                    data: newData[0],
                    color: "hsl(240, 70%, 70%)"
                }, {
                    type: "line",
                    name: 'Beam 2',
                    data: newData[1],
                    color: "hsl(0, 70%, 70%)"
                }
            ]
        })

    }

    connectedCallback(){
        this.reflow();
    }

    async reflow(){
        throttle(() => {
            console.log("reflow")
            this.chart.reflow()
        }, 100, "beam-position-throttle");
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