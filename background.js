let currentUrl;
let currentTab;
let checked = false;
let timer;


async function getPosts(url, title) {
    /**
     * Get post id, number of results and generate urls.
     */
    url = encodeURIComponent(url);
    let res = await fetch(`http://hn.algolia.com/api/v1/search?query=${url}&tags=story`);
    let data = await res.json();
    if (data.hits.length > 0) {
        let first = data.hits[0];
        return {
            url: `https://news.ycombinator.com/item?id=${first.objectID}`,
            listUrl: `https://hn.algolia.com/?query=${url}`,
            hits: data.nbHits,
        }
    } else {
        return {
            submitUrl: `https://news.ycombinator.com/submitlink?u=${url}&t=${title}`,
        }
    }
}

function setIcon(data, tab) {
    /**
     * Set icon after getting search result.
     */
    if (data.url) {
        chrome.browserAction.setIcon({
            path: 'icons/icon-128.png',
            tabId: tab.id,
        });
        chrome.browserAction.setTitle({
            title: 'Click to open HN thread.',
            tabId: tab.id,
        })
    } else {
        chrome.browserAction.setIcon({
            path: 'icons/grey-128.png',
            tabId: tab.id,
        });
        chrome.browserAction.setTitle({
            title: 'Not discussed on HN.',
            tabId: tab.id,
        });
    }
}

function checkUrl(url, tab) {
    /**
     * Check if url saved in storage and if it doesn't then search for url on algolia.
     */
    chrome.storage.local.get([url], res => {
        if (!res.hasOwnProperty(url)) {
            getPosts(url, tab.title)
                .then(data => {
                    data = data || {};
                    console.log('res', data);
                    chrome.storage.local.set({
                        [url]: JSON.stringify(data)
                    });
                    setIcon(data, tab);
                    checked = true;
                })
        } else {
            let data = JSON.parse(res[url]);
            setIcon(data, tab);
            checked = true;
        }
    });
}

function updateActiveTab() {
    /**
     * On tab change check setup icons and stuff.
     */
    // set timeout to prevent intense loading on redirects
    clearTimeout(timer);
    timer = setTimeout(() => {
        chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true }, function (tabs) {
            if (tabs.length !== 0) {
                currentTab = tabs[0];
                currentUrl = currentTab.url;
                checked = false;

                setInitialIcons(currentUrl, currentTab);
                getOptions().then(options => {
                    if (!options.checkOnClick) {
                        checkUrl(currentUrl, currentTab);
                    }
                });
            }
        });
    }, 200);
}

async function openLink(data) {
    /**
     * Open new tab based on data and user options.
     */
    let options = await getOptions();
    if (!data.url && !options.allowSubmit) {
        return
    }
    if (!data.url && options.allowSubmit) {
        chrome.tabs.create({ url: data.submitUrl });
    }
    else if (data.hits > 1 && options.openList) {
        chrome.tabs.create({ url: data.listUrl });
    } else {
        chrome.tabs.create({ url: data.url });
    }
}

async function clickIcon() {
    /**
     * If checkOnClick then make search (or retrieve data from storage),
     * otherwise just open post url (if available).
     */
    const url = currentUrl;
    let options = await getOptions();

    if (options.checkOnClick && !checked) {
        chrome.browserAction.setIcon({
            path: 'icons/wait-128.png',
            tabId: currentTab.id,
        }, () => {
            checkUrl(url, currentTab);
        });
        return
    }

    chrome.storage.local.get([url], res => {
        let data = JSON.parse(res[url]);
        openLink(data, options.allowSubmit);
    });
}

async function setInitialIcons(url, tab) {
    /**
     * Set mid/wait icons if there is no data about current page in storage.
     * Otherwise mark page as checked.
     */
    chrome.storage.local.get([url], async function (res) {
        if (!res[url]) {
            let options = await getOptions();
            if (options.checkOnClick) {
                chrome.browserAction.setIcon({
                    path: 'icons/mid-128.png',
                    tabId: tab && tab.id,
                });
                chrome.browserAction.setTitle({
                    title: 'Click to check.',
                    tabId: tab.id,
                });
            } else {
                chrome.browserAction.setIcon({
                    path: 'icons/wait-128.png',
                    tabId: tab && tab.id,
                });
                chrome.browserAction.setTitle({
                    title: 'wait...',
                    tabId: tab.id,
                });
            }
        } else {
            checked = true;
        }
    });
}

async function getOptions() {
    /**
     * Get user options.
     */
    return new Promise((resolve => {
        chrome.storage.local.get(['options'], res => {
            let options = res.options && JSON.parse(res.options) || {
                openList: true,
                checkOnClick: true,
                allowSubmit: true,
            };
            resolve(options);
        });
    }))
}

function clearStorage() {
    /**
     * Clear cache on launch but keep options.
     */
    getOptions()
        .then(options => {
            chrome.storage.local.clear();
            chrome.storage.local.set({ options: JSON.stringify(options) });
        })
}


chrome.tabs.onUpdated.addListener(updateActiveTab);  // listen to tab URL changes
chrome.tabs.onActivated.addListener(updateActiveTab);  // listen to tab switching
chrome.browserAction.onClicked.addListener(clickIcon);  // listen to icon click


updateActiveTab();
clearStorage();
