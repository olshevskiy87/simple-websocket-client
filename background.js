chrome.browserAction.onClicked.addListener(() => {
    chrome.tabs.create({
        url: `chrome-extension://${window.location.host}/index.html`,
    });
});
