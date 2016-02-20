var requiredGitSenseJSFiles = [
        "3rdparty/js/crossfilter-1.3.12.js",
        "3rdparty/js/d3-3.5.8.js",
        "3rdparty/js/dc-2.0.0-beta.23.js",
        "3rdparty/js/jquery-2.1.4.min.js",
        "3rdparty/js/md5.js",
        "3rdparty/js/moment-2.10.6.js",
        "js/arch.js",
        "js/bitbucket/comp/search.js",
        "js/bitbucket/data/repo.js",
        "js/bitbucket/pages/commits.js",
        "js/bitbucket/pages/overview.js",
        "js/bitbucket/ui/commits.js",
        "js/bitbucket/ui/tabs.js",
        "js/bitbucket/utils/page.js",
        "js/config.js",
        "js/events/page.js",
        "js/ui/pills.js",
        "js/utils/cli.js",
        "js/utils/config.js",
        "js/utils/date.js",
        "js/utils/html.js",
        "js/utils/variable.js",
        "js/github/comp/search.js",
        "js/github/data/repo.js",
        "js/github/pages/branches.js",
        "js/github/pages/commits.js",
        "js/github/pages/tree.js",
        "js/github/ui/btngrp.js",
        "js/github/ui/commits.js",
        "js/github/ui/input/group.js",
        "js/github/ui/input/search.js",
        "js/github/ui/subnav.js",
        "js/github/ui/tabs.js",
        "js/github/utils/page.js",
        "js/gitsense/data/branch/heads.js",
        "js/gitsense/data/commits.js",
        "js/gitsense/data/relay.js",
        "js/gitsense/data/repo.js",
        "js/gitsense/data/users.js",
        "js/gitsense/ui/codechurn/bar.js",
        "js/gitsense/ui/trees/changes.js",
        "content.js"
    ],
    requiredGitSenseCSSFiles = [
        "3rdparty/css/dc-1.7.5.min.css",
        "3rdparty/octicons/octicons.css"
    ];

chrome.tabs.onUpdated.addListener(
    function(tabId, changeInfo, tab) {
        if (changeInfo.status !== "loading") 
            return

        var code = 
            "var injected = window.injectedGitSense;"+
            "window.injectedGitSense = true;"+
            "injected;";

        chrome.tabs.executeScript(tabId, {code:code, runAt:"document_start"}, inject);
 
        function inject(res) {
            if ( chrome.runtime.lastError !== undefined ) {
                if ( chrome.runtime.lastError.message.match(/permission/i) )
                    return;
                else
                    throw(chrome.runtime.lastError);
            }
        
            // This is true if we have already injected our code
            if ( res[0] )
                return;

            for ( var i = 0; i < requiredGitSenseCSSFiles.length; i++ ) {
                var file = requiredGitSenseCSSFiles[i];

                chrome.tabs.insertCSS(
                    tabId, 
                    { file: file, runAt: "document_start" }
                );
            }

            for ( var i = 0; i < requiredGitSenseJSFiles.length; i++) {
                var file = requiredGitSenseJSFiles[i];

                chrome.tabs.executeScript(
                    tabId,
                    { file: file, runAt: "document_start" }
                );
            }
        }
    }
);
