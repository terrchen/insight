// Since GitHub/Bitbucket uses push state to transition between pages, we can't 
// expect this script to be called whenever there is a page change. To
// work around this, we'll check "window.location" every "x" milliseconds
// to see if the location has changed.  If it has, we'll let everybody on 
// callback list know.
//
// To learn more, take look at "js/events/page.js" 

"use strict";

//
// The initGitSenseConfig function is defined at the bottom of this script
//
initGitSenseConfig(function() {
    var resizeTimedOut      = 0,
        gitsensePageEvent   = new sdes.events.page(),
        currentGitSensePage = null;
    
    // Define how frequently to check for window.location changes
    gitsensePageEvent.setTimeout(200); 
    
    // Add the function to call whenever there is a location change
    gitsensePageEvent.addOnChange(
        function (rule) {
            // If rule is null, it means this page didn't match any
            // rules, so stop
            if ( rule === null )
                return;
                
            switch (rule.host.type) {
                case "bitbucket":
                    new sdes.bitbucket.utils.page().parse(renderBitbucketPage);
                    break; 
                case "github":
                    new sdes.github.utils.page().parse(renderGitHubPage);
                    break; 
                case "github-enterprise":
                    new sdes.github.utils.page().parse(renderGitHubPage);
                    break; 
                default: 
                    throw("GitSense: Unrecognized host provider '"+host+"'");
            }
    
            function renderBitbucketPage(page) {
                // If page is null, it means we don't know how to proceed so stop here
                if ( page === null )
                    return;
       
                switch( page.type ) {
                    case "commits":
                        currentGitSensePage = new sdes.bitbucket.pages.commits(rule, page);
                        currentGitSensePage.render();
    
                        break; 
                    case "overview":
                        currentGitSensePage = new sdes.bitbucket.pages.overview(rule, page);
                        currentGitSensePage.render();
    
                        break;
                    default:
                        throw("GitSense: Unrecognized Bitbucket page '"+page.type+"'");
                }
            }
    
            function renderGitHubPage(page) {
                // If page is null, it means we don't know how to proceed so stop here
                if ( page === null )
                    return;

                if ( page.type === "branches" )
                    new sdes.github.pages.branches(rule, page).render();
                else if ( page.type === "commits" ) 
                    new sdes.github.pages.commits(rule, page).render();
                else if ( page.type === "tree" )
                    new sdes.github.pages.tree(rule, page).render();
                else
                    throw("GitSense: Unrecognized GitHub page '"+page.type+"'")
            }
        }
    );
    
    // Start tracking and pass it a true value to force an immediate callback
    gitsensePageEvent.startTracking(true);

    // Catch the window resize event.  This is only really needed for Bitbucket
    // and it's used to let us know we need to redraw the chart.  
    window.addEventListener(
        "resize", 
        function() {
            if (resizeTimedOut)
                clearTimeout(resizeTimedOut);
    
            resizeTimedOut = setTimeout(
                function() {
                    if ( 
                        currentGitSensePage !== null && 
                        currentGitSensePage.resize !== null &&
                        currentGitSensePage.resize !== undefined
                    ) {
                        currentGitSensePage.resize();
                    }
    
                    resizeTimedOut = 0;
                }, 
                100
            );
        }, 
        false
    );
});

function initGitSenseConfig(callback) {
    // sdes.config is defined in the js/config.js file
    chrome.storage.local.get(
        sdes.config,
        function processStoredSettings(config) {
            sdes.config = config;
            callback();
        }
    );
}
