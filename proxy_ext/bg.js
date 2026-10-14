
    var config = { mode: "fixed_servers", rules: { singleProxy: { scheme: "http", host: "95.134.227.116", port: 10000 } } };
    chrome.proxy.settings.set({value: config, scope: "regular"}, function() {});
    chrome.webRequest.onAuthRequired.addListener(
        function(details) { return {authCredentials: {username: "UIxmpEAXRhV4I7zvswP1", password: "4t3FN1h2TZJH8rlzc5bq"}}; },
        {urls: ["<all_urls>"]}, ["blocking"]
    );
