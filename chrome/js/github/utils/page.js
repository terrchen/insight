commit 66911ec2f6e3bbac0675dfbf3f483b54345f3b77
Author: Terrence Chen <terrchen@gitsense.com>
Date:   Mon Nov 20 20:22:00 2017 -0800

    Saving

diff --git a/chrome/js/github/utils/page.js b/chrome/js/github/utils/page.js
index c73a075..69fdccd 100644
--- a/chrome/js/github/utils/page.js
+++ b/chrome/js/github/utils/page.js
@@ -82,6 +82,7 @@ sdes.github.utils.page = function(rule) {
             repo      = names.shift(),
             home      = names.length === 0 ? true : false,
             search    = names.length !== 0 && names[0] === "search" ? true : false,
+            pulls     = names.length !== 0 && names[0] === "pulls" ? true : false,
             pull      = names.length !== 0 && names[0] === "pull" ? true : false,
             show      = window.location.search.match(/gitsense=insight/) ? true : false,
             stopAt    = new Date().getTime() + 1000,
@@ -154,12 +155,14 @@ sdes.github.utils.page = function(rule) {
                 }
             }
 
-            var prtabs = pull ? document.getElementsByClassName("tabnav-pr") : null;
+            var prtabs   = pull ? document.getElementsByClassName("tabnav-pr") : null,
+                pullsNav = pulls ? document.getElementsByClassName("subnav") : null;
 
             if ( 
                 (tabs === null && !search) || 
                 content === null ||
-                (pull && (prtabs === null || prtabs.length === 0 ))
+                (pull && (prtabs === null || prtabs.length === 0)) ||
+                (pulls && (pullsNav === null || pullsNav.length === 0))
             ) {
                 setTimeout(findContainers, 50);
                 return;
@@ -201,7 +204,8 @@ sdes.github.utils.page = function(rule) {
                 content: content,
                 fileNav: fileNav,
                 branch: branch,
-                pull: pull ? getPull(prtabs[0]) : null
+                pull: pull ? getPull(prtabs[0]) : null,
+                pulls: pulls ? { nav: pullsNav[0] } : null
             });
         }
 
