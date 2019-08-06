import { sigFigRound } from "../HelperFunctions.js";

export const commonChartOptions = {
    chart: {
        height: 300
    },

    credits: {
        enabled: false
    },

    yAxis: {
        labels: {
            formatter: (x) => sigFigRound(x.value, 3)
        }
    },

    xAxis: {
        labels: {
            formatter: (x) => sigFigRound(x.value, 3)
        }
    },

    noData: {
        position: {
            x: -50 // this is needed to correct for a incorrect center calulation in HighCharts
        }
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