/** @type {Highcharts.Options} */
export const commonChartOptions = {
    chart: {
        height: 270,
        zoomType: "xy",
        spacingBottom: 5
    },

    title: {
        margin: 2,
        style: {
            color: "#333333",
            fontSize: "16px"
        },
        // @ts-ignore
        widthAdjust: 0 // we don't need to adjust the width as we're not using the burger menu
    },

    credits: {
        enabled: false
    },

    noData: {
        position: {
            x: -50 // this is needed to correct for a incorrect center calulation in HighCharts
        }
    },

    tooltip: {
        headerFormat: `<span style="font-size: 10px">{point.key:.2f}</span><br/>`,
        valueDecimals: 2,
        shared: true,
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
            },
            states: {
                // @ts-ignore
                inactive: {
                    opacity: 1
                }
            }
        }
    },

    legend: {
        verticalAlign: 'top'
    },
}