// Since GitHub uses push state to transition between pages, we can't 
// expect this script to be called whenever there is a page change. To
// work around this, we'll check "window.location" every "x" milliseconds
// to see if the location has changed.  If it has, we'll let everybody on 
// callback list know.
//
// To learn more, take look at "js/events/page.js" 

"use strict";

var gitsensePageEvent = new sdes.events.page();

// Define how frequently to check for window.location changes
gitsensePageEvent.setTimeout(200); 

// Add the function to call whenever there is a location change
gitsensePageEvent.addOnChange(
    function () {
        new sdes.github.utils.page().parse(render);
   
        function render(page)  {
            // If page is null, it means we don't know how to proceed so stop here
            if ( page === null )
                return;
    
            if ( page.type === "commits" ) 
                new sdes.github.pages.commits(page).render();
            else if ( page.type === "branches" )
                new sdes.github.pages.branches(page).render();
            else
                throw("GitSense: Unrecognized GitHub page type '"+page.type+"'")
        }
    }
);

// Start tracking and pass it a true value to force an immediate callback
gitsensePageEvent.startTracking(true);
