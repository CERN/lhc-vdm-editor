import { sigFigRound } from "../HelperFunctions.js";

const commonFormatter = x => sigFigRound(x.value, 3);

/** @type {Highcharts.Options} */
export const commonChartOptions = {
    chart: {
        height: 300,
        zoomType: "xy"
    },

    credits: {
        enabled: false
    },

    yAxis: {
        labels: {
            formatter: commonFormatter
        }
    },

    xAxis: {
        labels: {
            formatter: commonFormatter
        }
    },

    noData: {
        position: {
            x: -50 // this is needed to correct for a incorrect center calulation in HighCharts
        }
    },

    tooltip: {
        valueDecimals: 2
    },

    plotOptions: {
        line: {
            // @ts-ignore
            label: {
                enabled: false
            }
        },
        area: {
            marker: {
                enabled: false,
                states: {
                    hover: {
                        enabled: false
                    }
                }
            },
            // @ts-ignore
            label: {
                enabled: false
            }
        }
    },

    legend: {
        verticalAlign: 'top'
    },
}