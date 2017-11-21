commit 66911ec2f6e3bbac0675dfbf3f483b54345f3b77
Author: Terrence Chen <terrchen@gitsense.com>
Date:   Mon Nov 20 20:22:00 2017 -0800

    Saving

diff --git a/chrome/content.js b/chrome/content.js
index 499ad33..92b24c3 100644
--- a/chrome/content.js
+++ b/chrome/content.js
@@ -218,6 +218,8 @@ function renderGitHubPage(rule, page) {
 
                 if ( page.pull !== null && numIndexedBranches !== 0 )
                     renderPull();
+                else if ( page.pulls !== null && numIndexedBranches != 0 )
+                    renderPulls();
 
                 //if ( page.search !== null ) { 
                 //    var navs = page.search.typeToNav;
@@ -582,7 +584,7 @@ function renderGitHubPage(rule, page) {
                 var label =
                         htmlUtil.createSpan({
                             html: 
-                                "<span class='octicon octicon-graph' "+
+                                "<span class='octicon octicon-light-bulb' "+
                                     "style=''></span> "+
                                     "Review insights",
                         }),
@@ -628,10 +630,10 @@ function renderGitHubPage(rule, page) {
                     openGitSenseWindow({
                         href: href, 
                         maximize: true,
-                        height: window.innerHeight - 40,
-                        maxHeight: window.innerHeight - 80,
+                        height: window.innerHeight - 80,
+                        maxHeight: window.innerHeight - 120,
                         title: "GitSense review insights",
-                        icon: "octicon octicon-graph"
+                        icon: "octicon octicon-light-bulb"
                     });
                 }
 
@@ -695,14 +697,149 @@ function renderGitHubPage(rule, page) {
                     openGitSenseWindow({
                         href: href,
                         maximize: true, 
-                        height: window.innerHeight-40,
-                        title: "GitSense diffs browser",
-                        icon: "octicon octicon-diff"
+                        height: window.innerHeight-80,
+                        title: "GitSense diffs insights",
+                        icon: "octicon octicon-light-bulb"
                     });
                 }
             }
         }
 
+        function renderPulls() {
+            var host    = rule.host.type,
+                repo    = page.owner+"/"+page.repo,
+                locUtil = new sdes.gitsense.utils.location();
+
+            // For now, we'll just add the insight link
+            addGitSenseButton();
+
+            function addGitSenseButton() {
+                var nav    = page.pulls.nav,
+                    newBtn = null; 
+
+                console.dir(nav);
+
+                for ( var i = 0; i < nav.children.length; i++ ) 
+                {
+                    var elem = nav.children[i];
+
+                    if ( elem.nodeName !== "A" )
+                        continue;
+
+                    if ( ! elem.getAttribute("href").toLowerCase().match(/compare/) )
+                        continue;
+
+                    newBtn = elem;
+                    break;
+                }
+
+                if ( newBtn === null )
+                    return;
+
+                var gitsense = 
+                        htmlUtil.createLink({
+                            cls: "btn float-right octicon octicon-light-bulb",
+                            style: {
+                                cursor: "pointer",
+                                marginRight: "10px",
+                                color: "black"
+                            }
+                        });
+
+                nav.insertBefore(gitsense, newBtn.nextSibling);
+
+                gitsense.onclick = function() {
+                    var hash = {
+                        pill: "ipom" 
+                    };
+
+                    var hashString = locUtil.getHashString(hash);
+
+                    var href = 
+                            rule.gitsense.baseUrl+"/"+
+                            "insight/"+
+                            rule.host.type+
+                            "?ghee=true&"+
+                            "r="+repo+
+                            "#"+hashString;
+
+                    openGitSenseWindow({
+                        href: href, 
+                        maximize: true,
+                        height: window.innerHeight - 80,
+                        maxHeight: window.innerHeight - 120,
+                        title: "GitSense pulls insights",
+                        icon: "octicon octicon-light-bulb"
+                    });
+                }
+
+                return gitsense;
+            }
+
+            function addGitSenseAction(actions) {   
+                var desktop = null;
+
+                for ( var i = 0; i < actions.children.length; i++ )  {
+                    var action = actions.children[i];
+
+                    if ( action.nodeName !== "A" )
+                        continue;
+
+                    if ( ! action.getAttribute("href").match(/^github-/) )
+                        continue;
+
+                    desktop = action;
+                    break;
+                }
+
+                var temp = decodeURIComponent(desktop.getAttribute("href")).split("filepath="),
+                    file = temp.pop().replace(/&.+/, "");
+
+                var gitsense =
+                        htmlUtil.createLink({
+                            title: "View changes in a GitSense window",
+                            cls: "btn-octicon octicon octicon-light-bulb",
+                            style: {
+                                cursor: "pointer",
+                                textDecoration: "none",
+                                width: "16px"
+                            } 
+                        });
+
+                actions.insertBefore(gitsense, desktop.nextSibling);
+
+                gitsense.onclick = function() {
+                    var hash = {
+                        branches: [ branch ],
+                        query: {
+                            oargs: ["diff:"+pull.fromSha+"..."+pull.toSha]
+                        },
+                        diffs: {
+                            path: file,
+                            diff: true,
+                        }
+                    };
+
+                    var hashString = locUtil.getHashString(hash);
+
+                    var href = 
+                            rule.gitsense.baseUrl+"/"+
+                            "insight/"+
+                            rule.host.type+
+                            "?ghee=true&"+
+                            "r="+repo+
+                            "#"+hashString;
+
+                    openGitSenseWindow({
+                        href: href,
+                        maximize: true, 
+                        height: window.innerHeight-80,
+                        title: "GitSense diffs insights",
+                        icon: "octicon octicon-light-bulb"
+                    });
+                }
+            }
+        }
         function addSearchNavs() {
             var navs      = page.search.navs,
                 typeToNav = page.search.typeToNav,
@@ -1391,7 +1528,7 @@ function receiveMessage(event) {
         value  = temp1[1].replace(/^[^:]+:/, ""),
         rule   = new sdes.utils.config().getRule();
 
-    if ( sender !== "main" && sender !== "overlay" )
+    if ( sender !== "main" && key === "height" )
         return;
 
     if ( 
@@ -1483,7 +1620,7 @@ function openGitSenseWindow(params) {
         height    = params.height,
         maxHeight = params.maxHeight,
         title     = params.title === undefined ? "GitSense insights" : params.title,
-        icon      = params.icon  === undefined ? "octicon octicon-browser" : params.icon;
+        icon      = params.icon  === undefined ? "octicon octicon-light-bulb" : params.icon;
 
     if ( href.match(/ghee=true/) ) {
         maximize = true;
@@ -1530,9 +1667,12 @@ function openGitSenseWindow(params) {
 }
 
 function createOverlayWindow(label, icon, href, targetOrigin, maximize) {
-    var width       = window.innerWidth - 30,
-        height      = window.innerHeight - 25,
-        _peekWidth  = maximize ? 15 : peekWidth,
+    var ghee        = href.match(/ghee/),
+        width       = window.innerWidth - 30 - (ghee ? 15 : 0),
+        height      = window.innerHeight - 25 - (ghee ? 40 : 0),
+        top         = ghee ? 30 : 10,
+        left        = ghee ? 30 : 15,
+        _peekWidth  = maximize ? left : peekWidth,
         titleHeight = 30;
 
     if ( 
@@ -1549,7 +1689,7 @@ function createOverlayWindow(label, icon, href, targetOrigin, maximize) {
     overlayWindow.style.backgroundColor = "white";
     overlayWindow.style.zIndex = 1000000;
     overlayWindow.style.position = "fixed";
-    overlayWindow.style.top = 10+"px";
+    overlayWindow.style.top = top+"px";
     overlayWindow.style.left = _peekWidth+"px";
     overlayWindow.style.border = "0px";
     overlayWindow.style.boxShadow = "0px 0px 26px 0px rgba(48,48,48,1)";
