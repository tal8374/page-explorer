const { initPage, initRequestInterception, initXHRRequestListener } = require('../services/explorePage');
var fs = require('fs');
const Url = require('url-parse');

const puppeteer = require('puppeteer');
const request_client = require('request-promise-native');

async function runExplorer(url) {
    let urlPayload = new Url(url);
    const [page, browser] = await initPage();
    let payload = {
        url: url,
        origin: urlPayload.origin == 'null' ? null : urlPayload.origin,
        createdRequests: [],
    };
    await initXHRRequestListener(page, payload);
    await initRequestInterception(page, payload);
    await page
        .goto(url, { waitUntil: 'networkidle0', timeout: 30 * 1000 })
        .catch(e => console.error(e));
    await browser.close();
}

module.exports = {
    runExplorer
}

