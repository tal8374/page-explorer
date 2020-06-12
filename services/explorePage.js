const puppeteer = require('puppeteer');
const request_client = require('request-promise-native');
const Url = require('url-parse');

async function initPage() {
    const browser = await puppeteer.launch();
    return [await browser.newPage(), browser];
}

async function initXHRRequestListener(page, payload) {
    page.on('console', msg => {
        if (msg._text && /XHR\-explorerPage/gi.test(msg._text)) {
            let origin = msg._text.split('<origin>')[1].split('</origin>')[0].trim();
            let typeHTTP = msg._text.split('<type>')[1].split('</type>')[0].trim();
            let requestUrl = msg._text.split('<destination>')[1].split('</destination>')[0].trim();
            let stack = msg._text.split('<stack>')[1].split('</stack>')[0].trim();
            let scripts = stack.match(/(https?:\/\/[^\s]+)(?=:\d+:\d+)/gi);
            let requestUrlPayload = new Url(requestUrl);
            requestUrl = !!requestUrlPayload.host ? requestUrl : origin + requestUrl;
            requestUrlPayload = new Url(requestUrl);

            payload.createdRequests.push({
                initiator: scripts.length > 0 ? scripts[0] : null,
                typeHTTP: typeHTTP,
                requestUrl: requestUrl,
                protocol: !!requestUrlPayload.protocol ? null : requestUrlPayload.protocol,
                origin: origin,
                isSameOrigin: origin === payload.origin
            });
        }
    })

    page.evaluateOnNewDocument(() => {
        var proxied = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function () {
            try {
                throw new Error('XHR-explorerPage')
            } catch (error) {
                console.log(`<origin>${location.origin}</origin> <type>${arguments[0]}</type>  <destination>${arguments[1]}</destination> <stack>${error.stack}</stack>`)
            }
            return proxied.apply(this, [].slice.call(arguments));
        };
    });
}

async function initRequestInterception(page, payload) {
    await page.setRequestInterception(true);

    page.on('request', request => {
        request_client({
            uri: request.url(),
            resolveWithFullResponse: true,
        }).then(response => {
            let createdRequest = payload.createdRequests.find(x => x.responseHeaders == null && (x.requestUrl.includes(request.url()) || request.url().includes(x.requestUrl))) || {};
            let isFound = Object.keys(createdRequest).length !== 0;
            createdRequest.responseHeaders = response.headers;
            createdRequest.postData = request.postData();
            createdRequest.redirectChain = request.redirectChain();
            createdRequest.resourceType = request.resourceType();
            createdRequest.method = request.method();
            createdRequest.isNavigationRequest = request.isNavigationRequest();
            createdRequest.frame = request.frame();

            if (!isFound) {
                payload.createdRequests.push(createdRequest);
            }

            request.continue();
        }).catch(error => {
            request.abort();
        });
    });
}

module.exports = {
    initPage,

    initRequestInterception,

    initXHRRequestListener,
}