function calculateCoverageForFile(ranges){
    let acc = 0;
    let lastRange = {start: 0, end: 0};
    for(let range of ranges){
        let rangeStart = range.start;

        if(lastRange.end > range.start) rangeStart = lastRange.end;
        if(rangeStart < range.end){
            acc += range.end - rangeStart;

            lastRange = {
                start: rangeStart,
                end: range.end
            }
        }
    }
    return acc;
}

function calculateAllCoverages(data){
    let total = 0;
    let all_covered = 0;
    for(let item of data){
        if(item.url.startsWith("http://127.0.0.1:8080/src/") && !item.url.endsWith(".test.js")){
            const covered = calculateCoverageForFile(item.ranges);
            all_covered += covered;
            total += item.text.length;
            console.log(`${item.url}, coverage: ${(covered/item.text.length * 100).toFixed(1)}%`);
        }
    }
    console.log(`Overall coverage ${(all_covered/total * 100).toFixed(1)}%`);
}

const puppeteer = require("puppeteer");

async function tryFindCoverage() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.coverage.startJSCoverage()
    await page.goto('http://127.0.0.1:8080/SpecRunner.html', {waitUntil: 'networkidle2'});
    await page.waitForFunction(`jsApiReporter.status() == "done"`)
    const coverage = await page.coverage.stopJSCoverage();
    calculateAllCoverages(coverage);
}

tryFindCoverage()