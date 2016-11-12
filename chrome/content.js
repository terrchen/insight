// Since GitHub/GitLab uses push state to transition between pages, we can't 
// expect this script to be called whenever there is a page change. To
// work around this, we'll check "window.location" every "x" milliseconds
// to see if the location has changed.  If it has, we'll let everybody on 
// callback list know.
//
// To learn more, take look at "js/events/page.js" 

"use strict";

var lastLocation        = null,
    lastShow            = null,
    ignoreHash          = null,
    lastHeight          = null,
    overlayWindow       = null,
    resize              = null,
    peekWidth           = 400,
    gitsenseIframe      = null,
    gitsenseFrameId     = "gitsense-content-iframe",
    lastPageChangedTime = null;

window.addEventListener("message", receiveMessage, false);

//
// The initGitSenseConfig function is defined at the bottom of this script
//
initGitSenseConfig(function() {
    var resizeTimedOut    = 0,
        gitsensePageEvent = new sdes.events.page();

    // Define how frequently to check for window.location changes
    gitsensePageEvent.setTimeout(100); 
    
    // Add the function to call whenever there is a location change
    gitsensePageEvent.addOnChange(pageChanged);
    
    // Start tracking and pass it a true value to force an immediate callback
    gitsensePageEvent.startTracking(true);
});

function pageChanged(rule, force) {
    lastPageChangedTime = new Date().getTime();

    if ( force === undefined ) 
        force = false;

    // If rule is null, it means this page didn't match any
    // rules, so stop
    if ( rule === null )
        return;

    if ( window.location.pathname.match(/\/search$/) )
        force = true;

    var lastUrl    = lastLocation === null ? null : lastLocation.origin+lastLocation.pathname,
        lastHash   = lastLocation === null ? null : lastLocation.hash,
        lastSearch = lastLocation === null ? null : lastLocation.search,
        thisShow   = window.location.search.match(/gitsense=insight/) ? true : false,
        thisUrl    = window.location.origin+window.location.pathname,
        thisHash   = window.location.hash,
        thisSearch = window.location.search;

    lastLocation = $.extend(true, {}, window.location);

    if ( ! force && lastUrl === thisUrl && lastShow === thisShow ) {
        poll(rule, lastPageChangedTime);
        return;
    }

    lastShow = thisShow;

    switch (rule.host.type) {
        case "github":
            new sdes.github.utils.page(rule).parse(
                function(page) {
                    renderGitHubPage(rule, page)
                },
                force
            );
            break; 
        case "github-enterprise":
            new sdes.github.utils.page(rule).parse(
                function(page) {
                    renderGitHubPage(rule, page)
                },
                force
            );
            break; 
        case "gitlab":
            new sdes.gitlab.utils.page(rule).parse(
                function(page) {
                    renderGitLabPage(rule, page)
                },
                force
            );
            break; 
        default: 
            throw("GitSense: Unrecognized host provider '"+host+"'");
    }

    function poll(rule, lastTime) {
        if ( lastTime !== lastPageChangedTime )
            return;

        if ( new Date().getTime() > lastTime + 5000 )
            return;

        var frame = document.getElementById(gitsenseFrameId),
            show  = window.location.search.match(/gitsense=insight/) ? true : false;

        if ( frame === null && show )
            pageChanged(rule, true);

        setTimeout(function(){ poll(rule, lastTime); }, 500);
    }
}

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

function renderGitHubPage(rule, page) {
    // If page is null, it means we don't know how to proceed so stop here
    if ( page === null )
        return;

    if ( page.type === "org" )
        renderOrgPage();
    else  
        renderCommonPage();

    function renderOrgPage() {
        var htmlUtil   = new sdes.utils.html(),
            containers = document.getElementsByClassName("container"),
            header     = document.getElementsByClassName("orghead")[0],
            pageHead   = document.getElementsByClassName("pagehead")[0],
            insightTab = null;

        if ( page.tabs !== undefined )
            insightTab = addInsightTab();

        if ( ! page.show ) {
            containers[0].style.width        = "980px";
            containers[0].style.paddingLeft  = null;
            containers[0].style.paddingRight = null;

            containers[1].style.width        = "980px";
            containers[1].style.paddingLeft  = null;
            containers[1].style.paddingRight = null;

            header.style.marginBottom = null;

            $(page.container).show();

            new sdes.gitsense.data.auth(rule).getTempToken(
                page.org,
                "_ORG_",
                function(token, numIndexedBranches, numIndexedRepos, error) {
                    if ( error !== undefined ) 
                        throw error.responseText;

                    $(insightTab.counter).html(
                        Number(numIndexedBranches).toLocaleString("en")
                    );
                }
            );

            return;
        }

        header.style.marginBottom = "5px";

        containers[0].style.width        = "100%";
        containers[0].style.paddingLeft  = "20px";
        containers[0].style.paddingRight = "20px";

        containers[1].style.width        = "100%";
        containers[1].style.paddingLeft  = "20px";
        containers[1].style.paddingRight = "20px";

        $(page.container).hide();

        var stopAnimation = false,
            renderTo = createGitSenseBody();

        new sdes.gitsense.data.auth(rule).getTempToken(
            page.org,
            "_ORG_",
            function(token, numIndexedBranches, numIndexedRepos, error) {
                stopAnimation = true;
 
                if ( error !== undefined ) 
                    throw error.responseText;

                var params = {
                    id: "main",
                    iframeSrc: 
                        rule.gitsense.baseUrl+"/"+
                        "insight/"+
                        rule.host.type+"/"+
                        "index.html?auth=token:"+token+"&org="+page.org,
                    targetOrigin: rule.gitsense.baseUrl,
                    hash: window.location.hash,
                    height: "500px",
                };

                $(renderTo).html("");

                $(insightTab.counter).html(
                    Number(numIndexedBranches).toLocaleString("en")
                );

                renderGitSense(renderTo, rule, token, params);
            }
        );

        function addInsightTab() {
            var needToAdd = true,
                graphsTab = null;

            for ( var i = 0; i < page.tabs.children.length; i++ ) {
                var tab = page.tabs.children[i];

                if ( tab.className === "" ) 
                    tab = tab.children[0];

                else if ( $(tab).html().match(/Insight/) )
                    tab.parentNode.removeChild(tab);

                if ( ! page.show )
                    continue;

                if ( tab.className.match(/ selected/) )
                    tab.setAttribute("class", tab.className.replace(/ selected/, ""));
            }

            var label =
                    htmlUtil.createSpan({
                        html: "<span class='octicon octicon-light-bulb'></span> "+
                              "Insight ",
                    }),
                counter = 
                    htmlUtil.createSpan({
                        cls: "counter",
                        html: "&nbsp; &nbsp"
                    }),
                insightTab = 
                    htmlUtil.createLink({
                        id: "gitsense-tab",
                        cls: "pagehead-tabs-item"+(page.show ? " selected" : ""),
                        href: "/"+page.org+"?gitsense=insight",
                        append: [ label, counter ],
                        style: {
                            cursor: "pointer"
                        }
                    });

            insightTab.counter = counter;

            page.tabs.appendChild(insightTab);

            return insightTab;
        }

        function createGitSenseBody() {
            var renderTo = htmlUtil.createDiv(),

                dots = 
                    htmlUtil.createSpan({
                        style: {
                            marginLeft: "5px"
                        }
                    }),

                h3 = 
                    htmlUtil.createHeader3({
                        append: [ 
                            htmlUtil.createTextNode("Loading GitSense Insight "),
                            dots
                        ]
                    }),

                loadBody = 
                    htmlUtil.createDiv({
                        append: [ h3 ],
                        style: {
                            color: "#333",
                            padding: "30px",
                            paddingTop: "50px"
                        }
                    });

            page.container.parentNode.appendChild(renderTo);

            renderTo.appendChild(loadBody);

            var stopAt = new Date().getTime() + 2000;

            animate(1);

            return renderTo;

            function animate(numDots) {
                if ( stopAnimation )
                    return;

                if ( numDots > 20 )
                    numDots = 1;

                var text = ".";

                for ( var i = 1; i <= numDots; i++ )
                    text += " .";

                $(dots).text(text);

                setTimeout(function(){ animate(numDots + 1); }, 250);
            }

            function checkForOctotree() {
                if ( new Date().getTime() > stopAt )  
                    return;

                var elems = document.getElementsByClassName("octotree_toggle");

                if ( elems === null || elems.length === 0 ) {
                    setTimeout(checkForOctotree, 100);
                    return;
                }

                header.style.paddingLeft  = "45px";
            }
        }
    }

    function renderCommonPage() {
        var htmlUtil        = new sdes.utils.html(),
            containers      = document.getElementsByClassName("container"),
            pageHead        = document.getElementsByClassName("pagehead")[0],
            header          = containers[0],
            stopAnimation   = false,
            searchArgs      = page.search ? getSearchArgs() : null,
            searchMsg       = null,
            codeMenu        = null,
            commitsMenu     = null,
            diffsMenu       = null,
            renderTo        = null,
            githubRepo      = null,
            githubRepoError = null,
            insightTab      = null,
            token           = null;

        if ( page.tabs !== undefined )
            insightTab = addInsightTab();

        if ( page.search )
            addSearchItems();

        if ( page.show ) 
            renderTo = createGitSenseBody();
        else
            fixHeader();

        new sdes.gitsense.data.auth(rule).getTempToken(
            page.owner,
            page.repo,
            function(_token, numIndexedBranches, numIndexedRepos, error) {
                stopAnimation = true;

                if ( error !== undefined )
                    throw error.responseText;

                token = _token;

                $(insightTab.counter).html(
                    Number(numIndexedBranches).toLocaleString("en")
                );

                if ( page.search || ! page.show ) {
                    updateSearch(new Date().getTime() + 2000);
                    return;
                }

                var params = {
                    id: "main",
                    iframeSrc: 
                        rule.gitsense.baseUrl+"/"+
                        "insight/"+
                        rule.host.type+"/"+
                        "index.html?auth=token:"+token,
                    targetOrigin: rule.gitsense.baseUrl,
                    hash: window.location.hash,
                    height: "500px",
                    baseUrl: window.location.origin 
                };

                $(renderTo).html("");
                renderGitSense(renderTo, rule, token, params);
            }
        );

        new sdes.github.data.repo(rule).get(
            page.owner, 
            page.repo,
            function(repo, error){ 
                if ( error !== undefined ) {
                    githubRepoError = JSON.parse(error.responseText);
                    return;
                }

                githubRepo = repo;
            }
        );

        function fixHeader() {
            header.style.width        = null;
            header.style.paddingLeft  = null;
            header.style.paddingRight = null;
        }

        function createGitSenseBody() {
            var renderTo = htmlUtil.createDiv();

            header.style.width        = "100%";
            header.style.paddingLeft  = "20px";
            header.style.paddingRight = "20px";

            containers[3].parentNode.appendChild(renderTo);
            pageHead.style.marginBottom = "5px";

            var tabBody = page.tabs.parentNode;
            var infoBar = pageHead.children[0];

            tabBody.style.width       = "100%";
            tabBody.style.paddingLeft = "5px";

            infoBar.style.width        = "100%";
            infoBar.style.paddingLeft  = "20px";
            infoBar.style.paddingRight = "20px";

            var dots = 
                    htmlUtil.createSpan({
                        style: {
                            marginLeft: "5px"
                        }
                    }),

                h3 = 
                    htmlUtil.createHeader3({
                        append: [ 
                            htmlUtil.createTextNode("Loading GitSense Insight "),
                            dots
                        ]
                    }),

                loadBody = 
                    htmlUtil.createDiv({
                        append: [ h3 ],
                        style: {
                            color: "#333",
                            padding: "30px",
                            paddingTop: "50px"
                        }
                    });

            renderTo.appendChild(loadBody);

            var stopAt = new Date().getTime() + 2000;

            checkForOctotree();

            animate(1);

            return renderTo;

            function animate(numDots) {
                if ( stopAnimation )
                    return;

                if ( numDots > 20 )
                    numDots = 1;

                var text = ".";

                for ( var i = 1; i <= numDots; i++ )
                    text += " .";

                $(dots).text(text);

                setTimeout(function(){ animate(numDots + 1); }, 250);
            }

            function checkForOctotree() {
                if ( new Date().getTime() > stopAt )  
                    return;

                var elems = document.getElementsByClassName("octotree_toggle");

                if ( elems === null || elems.length === 0 ) {
                    setTimeout(checkForOctotree, 100);
                    return;
                }

                header.style.paddingLeft  = "45px";
            }
        }

        function addInsightTab() {
            var needToAdd   = true,
                graphsTab   = null,
                pullReqsTab = null,
                projectsTab = null,
                wikiTab     = null;

            for ( var i = 0; i < page.tabs.children.length; i++ ) {
                var tab = page.tabs.children[i];

                if ( tab.className === "" ) 
                    tab = tab.children[0];

                if ( $(tab).html().match(/Graphs/) )    
                    graphsTab = tab;
                else if ( $(tab).html().match(/Pull/) )    
                    pullReqsTab = tab;
                else if ( $(tab).html().match(/Wiki/) )    
                    wikiTab = tab;
                else if ( $(tab).html().match(/Projects/) )    
                    projectsTab = tab;
                else if ( $(tab).html().match(/Insight/) )
                    tab.parentNode.removeChild(tab);

                if ( ! page.show )
                    continue;

                if ( tab.className.match(/ selected/) )
                    tab.setAttribute("class", tab.className.replace(/ selected/, ""));
            }

            var label =
                    htmlUtil.createSpan({
                        html: "<span class='octicon octicon-light-bulb'></span> "+
                              "Insight ",
                    }),
                counter = 
                    htmlUtil.createSpan({
                        cls: "counter",
                        html: "&nbsp; &nbsp"
                    }),
                insightTab = htmlUtil.createLink({
                    id: "gitsense-tab",
                    cls: "js-selected-navigation-item reponav-item"+
                         (page.show ? " selected" : ""),
                    href: "/"+page.owner+"/"+page.repo+"?gitsense=insight",
                    append: [ label, counter ],
                    style: {
                        cursor: "pointer"
                    }
                });

            insightTab.counter = counter;

            if ( graphsTab !== null )
                page.tabs.insertBefore(insightTab, graphsTab.nextSibling);
            else if ( wikiTab !== null )
                page.tabs.insertBefore(insightTab, wikiTab.nextSibling);
            else if ( projectsTab !== null )
                page.tabs.insertBefore(insightTab, projectsTab.nextSibling);
            else
                page.tabs.appendChild(insightTab);

            return insightTab;
        }

        function addSearchItems() {
            commitsMenu = document.getElementById("gitsense-search-menu-commits");

            if ( commitsMenu !== null )
                return;

            var menus        = document.getElementsByClassName("menu")[0],
                alreadyAdded = false; 

            for ( var i = 0; i < menus.children.length; i++ ) {
                var menu = menus.children[i];

                if ( menu.innerText.match(/^\s*Commits/) )
                    return;

                if ( ! menu.innerText.match(/^\s*Code/) )
                    continue;

                codeMenu = menu;

                codeMenu.selected = codeMenu.className.match(/selected/) ? true : false;

                switch(codeMenu.childNodes.length) {
                    case 3:
                        codeMenu.counter    = codeMenu.childNodes[2];
                        codeMenu.numMatches = parseInt(codeMenu.counter.innerText);

                        break;
                    case 2:
                        codeMenu.counter = htmlUtil.createSpan({
                            cls: "counter"
                        });

                        codeMenu.appendChild(codeMenu.counter);

                        codeMenu.numMatches = 0;
                        break;
                    default:
                        console.warn("Not sure how to process code menu");
                }
            }

            codeMenu.sync = htmlUtil.createSpan({
                cls: "octicon octicon-sync",
                style: {
                    marginRight: "0px",
                }
            });

            $(codeMenu.counter).html("");

            codeMenu.counter.appendChild(htmlUtil.createTextNode( codeMenu.numMatches+" / " ));
            codeMenu.counter.appendChild(codeMenu.sync);

            commitsMenu = addMenu("Commits", "git-commit");
            diffsMenu   = addMenu("Diffs", "diff");

            menus.insertBefore(diffsMenu, codeMenu.nextSibling);
            menus.insertBefore(commitsMenu, codeMenu.nextSibling);

            var deg   = 0,
                menus = [ codeMenu, commitsMenu, diffsMenu ];

            animateSync();

            var stopAt = new Date().getTime() + 2000;

            if ( codeMenu.selected )
                addSearchMsg();

            function addMenu(label, icon) {
                var sync = 
                    htmlUtil.createSpan({
                        cls: "octicon octicon-sync",
                        style: {
                            marginRight: "0px",
                        }
                    }),
                    icon = 
                        htmlUtil.createSpan({
                            cls: "octicon octicon-"+icon
                        }),
                    counter = 
                        htmlUtil.createSpan({
                            append: [ sync ],
                            cls: "counter"
                        }),

                    menu = 
                        htmlUtil.createLink({
                            id: "gitsense-search-menu-"+label,
                            cls: "menu-item",
                            append: [
                                icon, 
                                htmlUtil.createTextNode(" "+label),
                                counter
                            ],
                            style: {
                                cursor: "pointer"
                            }
                        });

                menu.counter = counter;
                menu.sync    = sync;
    
                return menu;
            }

            function addSearchMsg() {
                if ( new Date().getTime() > stopAt )
                    return;

                var searchResults = document.getElementById("code_search_results"),
                    searchHead    = document.getElementsByClassName("codesearch-head")[0],
                    blankElems    = document.getElementsByClassName("blankslate"),
                    sortElems     = document.getElementsByClassName("sort-bar"),
                    sortBar       = null,
                    blankSlate    = null;

                if ( sortElems !== null && sortElems.length !== 0  )
                    sortBar = sortElems[0];

                if ( blankElems !== null && blankElems.length !== 0 )
                    blankSlate = blankElems[0];

                if ( searchResults === null && sortBar === null && blankSlate === null ) {
                    setTimeout(addSearchMsg, 50);
                    return;
                }

                searchMsg = htmlUtil.createDiv({
                    id: "gitsense-search-msg",
                    html: "Loading GitSense Insight ...",
                    style: {
                        marginTop: sortBar === null ? null : "5px",
                        marginBottom: sortBar === null ? "20px" : null
                    }
                });

                if ( sortBar !== null )
                    sortBar.appendChild(searchMsg);
                else if ( searchResults !== null )
                    searchResults.parentNode.insertBefore(searchMsg, searchResults);
                else if ( blankSlate !== null )
                    blankSlate.parentNode.insertBefore(searchMsg, blankSlate);
            }

            function animateSync() {
                var count = 0;

                for ( var i = 0; i < menus.length; i++ ) {
                    var menu = menus[i];

                    if ( menu.sync === null )
                        count++;
                }

                if ( count === menus.length )
                    return;

                deg += 10;

                if ( deg > 360 )
                    deg = 0;

                for ( var i = 0; i < menus.length; i++ ) {
                    var menu = menus[i];

                    if ( menu.sync == null )
                        continue;

                    try {
                        menu.sync.style.transform = "rotate("+deg+"deg)";
                    } catch (e) {
                        // Ignore exceptions since the sync element can be removed at anytime.
                    }
                }

                setTimeout(animateSync, 50);
            }
        }

        function updateSearch(stopAt) {
            if ( new Date().getTime() > stopAt )
                return;

            if ( commitsMenu === null ) {
                setTimeout(retry,100);
                return;
            }
            
            if ( githubRepoError !== null ) {
                renderNoSearch();
                return;
            }

            if ( githubRepo === null ) {
                setTimeout(retry,100);
                return;
            };

            var idata    = new sdes.gitsense.data.insight(rule, token),
                branchId = "github:"+page.owner+"/"+page.repo+":"+githubRepo.default_branch,
                href     = "/"+page.owner+"/"+page.repo+"?gitsense=insight#"+
                           "b="+branchId+"&t=%TYPE%&q="+searchArgs.join("+"),
                sabhref  = "/"+page.owner+"/"+page.repo+"?gitsense=insight#"+
                           "&_t=%TYPE%&_q="+searchArgs.join("+");

            idata.getBranchHeads(
                [branchId],
                function(branchToLatest, error) {
                    if ( error !== undefined ) {
                        if ( error.responseText.match(/^{/) )  // FIXME
                            branchToLatest = JSON.parse(error.responseText);
                        else
                            throw(error.responseText);
                    }

                    var branch = branchToLatest[branchId];

                    if ( typeof(branch) === "string" ) {
                        renderNoSearch();
                        return;
                    }

                    if ( branch.indexedCommits ) {
                        search("commits", branchId, branch.head, searchArgs);
                    } else {
                        $(commitsMenu.counter).text("N/A");
                        commitsMenu.sync = null;
                    }

                    if ( branch.indexedDiffs) {
                        search("diffs", branchId, branch.head, searchArgs);
                    } else {
                        $(diffsMenu.counter).text("N/A");
                        diffsMenu.sync = null;
                    }

                    if ( branch.indexedSource ) 
                        search("code", branchId, branch.head, searchArgs);
                    else
                        $(searchMsg).text("GitSense code search is currently not available.");
                }
            );

            function retry() {
                updateSearch(stopAt);
            }

            function renderNoSearch() {
                $(commitsMenu.counter).text("N/A");
                $(codeMenu.counter).text(codeMenu.numMatches);
                $(diffsMenu.counter).text("N/A");
                $(searchMsg).html(
                    "Unable to search default branch.&nbsp; "+
                    "<a href="+window.location.origin+"/"+page.owner+"/"+page.repo+"?gitsense=insight>"+
                    "GitSense Insight"+
                    "</a> not available."
                );
            }

            function search(type, branchId, head, args) {
                if ( type === "code" && codeMenu.selected )
                    $(searchMsg).text("Searching default branch with GitSense ...");

                var _args = $.extend(true, [], args);

                if ( type === "code" )
                    _args.push("cs:true");

                idata.search(
                    type,
                    [branchId+"@@@"+head.name],
                    _args,
                    1,
                    0,
                    function(results, error) {
                        if ( error !== undefined )
                            throw error.responseText;
 
                        var summary = results.search[branchId];

                        if ( type === "commits" )
                            updateCommitsSearch(summary);
                        else if ( type === "code" )
                            updateCodeSearch(summary);
                        else if ( type === "diffs" )
                            updateDiffsSearch(summary);
                    }
                );

                function updateCommitsSearch(summary) {
                    commitsMenu.sync = null;

                    commitsMenu.setAttribute(
                        "href",
                        href.replace(/%TYPE%/,"commits")
                    );

                    $(commitsMenu.counter).text(Number(summary.total).toLocaleString("en"));
                }

                function updateCodeSearch(summary) {
                    var total = summary.total;

                    $(codeMenu.counter).html(
                        codeMenu.numMatches+" / "+
                        Number(total).toLocaleString("en")
                    );

                    if ( ! codeMenu.selected )
                        return;

                    $(searchMsg).html(
                        "<a href="+href.replace("%TYPE%","code")+"+cs:true>"+
                            "GitSense found "+
                            Number(total).toLocaleString("en")+" "+
                            "code result"+(total === 1 ? "" : "s")+" "+
                            "with case-sensitive on & camelCase off."+
                        "</a>"
                    );
                }

                function updateDiffsSearch(summary) {
                    diffsMenu.sync = null;

                    diffsMenu.setAttribute(
                        "href",
                        href.replace(/%TYPE%/,"diffs")
                    );

                    $(diffsMenu.counter).text(Number(summary.total).toLocaleString("en"));
                }
            }
        }
    }

    function getSearchArgs() {
        var queries = window.location.search.split("&"),
            args    = [];

        for ( var i = 0; i < queries.length; i++ ) {
            var query = queries[i].replace(/^\?/,"");

            if ( ! query.match(/^(q|l)=/) )
                continue;
    
            var type  = query.match(/^q/) ? "q" : "l",
                value = query.replace(/^(q|l)=/, ""),
                temp  = type === "q" ? value.split(",") : value.split("+");
    
            if ( type === "l" ) {
                args.push("lang:"+temp[0]);
                continue;
            }

            for ( var j = 0; j < temp.length; j++ ) {
                var arg = decodeURIComponent(temp[j]);

                if ( arg.match(/^language:/) )
                    args.push("lang:"+arg.replace(/^language:/, "").split(",")[0]);
                else if ( arg.match(/^path:/) )
                    args.push("path:"+arg.replace(/^path:/, "")+"*")
                else
                    args.push(arg);
            }
        }

        return args; 
    }
} 

function renderGitLabPage(rule, page){
    // If page is null, it means we don't know how to proceed so stop here
    if ( page === null )
        return;

    if ( page.type === "group" )
        renderGroupPage();
    else if ( page.type === "repo" )
        renderRepoPage();
    else if ( page.type === "search" )
        renderSearchPage();
    else if ( page.type === "user" ) 
        renderUserPage();
    else
        throw("Unrecognized GitLab page '"+page.type+"'");

    function renderGroupPage() {
        var htmlUtil       = new sdes.utils.html(),
            insightNavLink = null;

        if ( page.navLinks !== undefined )
            insightNavLink = addInsightNavLink();

        if ( ! page.show ) {
            $(page.content).show();

            new sdes.gitsense.data.auth(rule).getTempToken(
                page.group,
                "_GROUP_",
                function(token, numIndexedBranches, numIndexedRepos, error) {
                    if ( error !== undefined )
                        throw error.responseText;

                    $(insightNavLink.badge).html(
                        Number(numIndexedBranches).toLocaleString("en")
                    );
                }
            );

            return;
        }

        $(page.content).hide();

        var stopAnimation = false,
            renderTo = createGitSenseBody();

        new sdes.gitsense.data.auth(rule).getTempToken(
            page.group,
            "_GROUP_",
            function(token, numIndexedBranches, numIndexedRepos, error) {
                stopAnimation = true;
 
                if ( error !== undefined )
                    throw error.responseText;

                $(insightNavLink.badge).html(
                    Number(numIndexedBranches).toLocaleString("en")
                );

                var params = {
                    id: "main",
                    iframeSrc: 
                        rule.gitsense.baseUrl+"/"+
                        "insight/"+
                        rule.host.type+"/"+
                        "index.html?auth=token:"+token+"&group="+page.group,
                    targetOrigin: rule.gitsense.baseUrl,
                    hash: window.location.hash,
                    height: "500px",
                };

                $(renderTo).html("");
                renderGitSense(renderTo, rule, token, params);
            }
        );

        function addInsightNavLink() {
            var needToAdd  = true,
                graphsLink = null,
                issuesLink = null,
                contributionLink = null;

            for ( var i = 0; i < page.navLinks[0].children.length; i++ ) {
                var link = page.navLinks[0].children[i];

                if ( $(link).text().match(/Issues/) )    
                    issuesLink = link;
                else if ( $(link).text().match(/Issues/) )    
                    issuesLink = link;
                else if ( $(link).html().match(/Contribution/) )
                    link.parentNode.removeChild(link);

                if ( ! page.show )
                    continue;

                if ( link.className.match(/ active/) )
                    link.setAttribute("class", link.className.replace(/ active/, ""));
            }

            var label =
                    htmlUtil.createSpan({
                        text: "Insight ",
                    }),
                badge = 
                    htmlUtil.createSpan({
                        cls: "badge",
                        html: "&nbsp; &nbsp"
                    }),
                insightNavLink = htmlUtil.createLink({
                    title: "GitSense Insight",
                    cls: "shortcuts-insight",
                    append: [ label, badge ],
                    href: 
                        (window.location.pathname.match(/^\/groups\//) ? "/groups" : "" )+
                        "/"+page.group+"?gitsense=insight"
                });

            insightNavLink.badge = badge;

            var list = htmlUtil.createList({
                cls: (page.show ? " active" : ""),
                append: [ insightNavLink ],
            });

            if ( contributionLink !== null )
                page.navLinks[0].appendChild(list);
            else if ( graphsLink !== null )
                page.navLinks[0].insertBefore(list, graphsLink.nextSibling);
            else if ( issuesLink !== null )
                page.navLinks[0].insertBefore(list, issuesLink);
            else
                page.navLinks[0].appendChild(list);

            return insightNavLink;
        }

        function createGitSenseBody() {
            var renderTo = htmlUtil.createDiv(),

                dots = 
                    htmlUtil.createSpan({
                        style: {
                            marginLeft: "5px"
                        }
                    }),

                h3 = 
                    htmlUtil.createHeader3({
                        append: [ 
                            htmlUtil.createTextNode("Loading GitSense Insight "),
                            dots
                        ]
                    }),

                loadBody = 
                    htmlUtil.createDiv({
                        append: [ h3 ],
                        style: {
                            color: "#333",
                            padding: "30px",
                            paddingTop: "50px"
                        }
                    });

            page.content.parentNode.appendChild(renderTo);

            renderTo.appendChild(loadBody);

            var stopAt = new Date().getTime() + 2000;

            animate(1);

            return renderTo;

            function animate(numDots) {
                if ( stopAnimation )
                    return;

                if ( numDots > 20 )
                    numDots = 1;

                var text = ".";

                for ( var i = 1; i <= numDots; i++ )
                    text += " .";

                $(dots).text(text);

                setTimeout(function(){ animate(numDots + 1); }, 250);
            }
        }
    }

    function renderRepoPage() {
        var htmlUtil        = new sdes.utils.html(),
            stopAnimation   = false,
            //searchArgs      = page.search ? getSearchArgs() : null,
            //searchMsg       = null,
            renderTo        = null,
            gitlabRepo      = null,
            gitlabRepoError = null,
            insightNavLink  = null,
            token           = null;

        if ( page.navLinks !== undefined )
            insightNavLink = addInsightNavLink();

        if ( page.show )
            $(page.content).hide();
        else
            $(page.content).show();
        
        if ( page.show ) 
            renderTo = createGitSenseBody();

        new sdes.gitsense.data.auth(rule).getTempToken(
            page.owner,
            page.repo,
            function(_token, numIndexedBranches, numIndexedRepos, error) {
                stopAnimation = true;

                if ( error !== undefined ) {
                    if ( error.responseText.toLowerCase() !== "unauthorized" )
                        throw error.responseText;
    
                    renderUnauthorized("gitlab", renderTo, rule, page);
                    return;
                }

                token = _token;

                $(insightNavLink.badge).html(
                    Number(numIndexedBranches).toLocaleString("en")
                );

                if ( page.search || ! page.show ) {
                    updateSearch(new Date().getTime() + 2000);
                    return;
                }

                var params = {
                    id: "main",
                    iframeSrc: 
                        rule.gitsense.baseUrl+"/"+
                        "insight/"+
                        rule.host.type+"/"+
                        "index.html?auth=token:"+token,
                    targetOrigin: rule.gitsense.baseUrl,
                    hash: window.location.hash,
                    height: "500px",
                    baseUrl: window.location.origin 
                };

                $(renderTo).html("");
                renderGitSense(renderTo, rule, token, params);
            }
        );

        function createGitSenseBody() {
            var renderTo = htmlUtil.createDiv();

            var dots = 
                    htmlUtil.createSpan({
                        style: {
                            marginLeft: "5px"
                        }
                    }),

                h3 = 
                    htmlUtil.createHeader3({
                        append: [ 
                            htmlUtil.createTextNode("Loading GitSense Insight "),
                            dots
                        ]
                    }),

                loadBody = 
                    htmlUtil.createDiv({
                        append: [ h3 ],
                        style: {
                            color: "#333",
                            padding: "30px",
                            paddingTop: "50px"
                        }
                    });

            renderTo.appendChild(loadBody);
    
            page.content.parentNode.appendChild(renderTo);

            var stopAt = new Date().getTime() + 2000;

            animate(1);

            return renderTo;

            function animate(numDots) {
                if ( stopAnimation )
                    return;

                if ( numDots > 20 )
                    numDots = 1;

                var text = ".";

                for ( var i = 1; i <= numDots; i++ )
                    text += " .";

                $(dots).text(text);

                setTimeout(function(){ animate(numDots + 1); }, 250);
            }

            function checkForOctotree() {
                if ( new Date().getTime() > stopAt )  
                    return;

                var elems = document.getElementsByClassName("octotree_toggle");

                if ( elems === null || elems.length === 0 ) {
                    setTimeout(checkForOctotree, 100);
                    return;
                }

                header.style.paddingLeft  = "45px";
            }
        }

        function addInsightNavLink() {
            var needToAdd  = true,
                graphsLink = null,
                issuesLink = null;

            for ( var i = 0; i < page.navLinks[0].children.length; i++ ) {
                var link = page.navLinks[0].children[i];

                if ( $(link).text().match(/Graphs/) )    
                    graphsLink = link;
                else if ( $(link).text().match(/Issues/) )    
                    issuesLink = link;
                else if ( $(link).html().match(/Insight/) )
                    link.parentNode.removeChild(link);

                if ( ! page.show )
                    continue;

                if ( link.className.match(/ active/) )
                    link.setAttribute("class", link.className.replace(/ active/, ""));
            }

            var label =
                    htmlUtil.createSpan({
                        text: "Insight ",
                    }),
                badge = 
                    htmlUtil.createSpan({
                        cls: "badge",
                        html: "&nbsp; &nbsp"
                    }),
                insightNavLink = htmlUtil.createLink({
                    title: "GitSense Insight",
                    cls: "shortcuts-graphs",
                    append: [ label, badge ],
                    href: "/"+page.owner+"/"+page.repo+"?gitsense=insight"
                });

            insightNavLink.badge = badge;

            var list = htmlUtil.createList({
                cls: (page.show ? " active" : ""),
                append: [ insightNavLink ],
            });

            if ( graphsLink !== null )
                page.navLinks[0].insertBefore(list, graphsLink.nextSibling);
            else if ( issuesLink !== null )
                page.navLinks[0].insertBefore(list, issuesLink);
            else
                page.navLinks[0].appendChild(list);

            return insightNavLink;
        }
    }

    function renderSearchPage() {
        var search = parseSearch();

        if ( search.projectId === undefined )
            return;

        var codeBadge     = page.codeNav.children[0].childNodes[1],
            commitsBadge  = page.commitsNav.children[0].childNodes[1],
            codeMatches   = $(codeBadge).text(),
            commitMatches = $(commitsBadge).text(),
            htmlUtil      = new sdes.utils.html(),
            currentSearch = null;

        if ( page.codeNav.className.match(/active/) )
            currentSearch = "code";
        else if ( page.commitsNav.className.match(/active/) )
            currentSearch = "commits";

        // This is true, if we've already executed the search
        if ( isNaN(commitMatches) )
            return;

        var diffsLink = addDiffsNavLink();

        new sdes.gitlab.data.repo(rule).get(
            search.projectId,
            function(repo, error){ 
                if ( error !== undefined ) {
                    if ( error.responseText.match(/Unauthorized/) )
                        queryWithGitSense();
                    else
                        throw("Querying GitLab's API returned: "+error.responseText);

                    return;
                }

                getTempToken(repo);

                function queryWithGitSense() {
                    new sdes.gitsense.data.repo(rule).queryHost(
                        "gitlab",
                        search.projectId,
                        function(repo, error) {
                            if ( error !== undefined ) {
                                if ( error.responseText.match(/Unauthorized/) ) {
                                    renderLoginRequired();
                                } else  {
                                    throw(
                                        "Querying GitLab API with GitSense returned: "+
                                        error.responseText
                                    );
                                }

                                return;
                            }

                            getTempToken(repo);
                        }
                    );
                }
                
                function renderLoginRequired() {
                    $(codeBadge).html(codeMatches+" / NA");

                    $(commitsBadge).html(commitMatches+" / NA ");

                    if ( currentSearch !== "code" && currentSearch !== "commits" )
                        return;

                    addSearchingMsg(
                        "Unable to perform GitSense "+
                        (currentSearch === "code" ? "code" : "commits")+" "+
                        "search, "+
                        "GitLab login required for API queries."
                    );
                }
            }
        );

        function parseSearch() {
            var queries = window.location.search.replace(/^\?/,"").split("&"),
                search  = {};

            for ( var i = 0; i < queries.length; i++ ) {
                var query = queries[i],
                    temp  = query.split("="),
                    key   = temp.shift(),
                    value = temp.join("=");

                if ( key === "project_id" ) 
                    search.projectId = value;
                else if ( key === "search" ) 
                    search.args = getArgs(value);
            }

            return search;

            function getArgs(query) {
                var args = query.split("+");

                for ( var i = 0; i < args.length; i++ )
                    args[i] = decodeURIComponent(args[i]);

                return args;
            }
        }

        function renderLoginRequired() {
            console.dir(page);
        }

        function getTempToken(repo) {
            var temp  = repo.path_with_namespace.split("/"),
                owner = temp[0],
                name  = temp[1];

            new sdes.gitsense.data.auth(rule).getTempToken(
                owner,
                name,
                function(token, numIndexedBranches, numIndexedRepos, error) {
                    if ( error !== undefined )
                        throw error.responseText

                    executeSearch(token, owner, name, repo.default_branch, search.args);
                }
            );
        }

        function addDiffsNavLink() {
            var badge =
                    htmlUtil.createSpan({
                        html: "<span class='fa fa-refresh fa-spin'></span>",
                        cls: "badge"
                    }),
                link = 
                    htmlUtil.createLink({
                        append: [
                            htmlUtil.createTextNode("Diffs "),
                            badge
                        ],
                        style: {

                        }
                    }),
                li = 
                    htmlUtil.createList({
                        append: link
                    });

            page.commitsNav.parentNode.appendChild(li);

            link.badge = badge;

            return link; 
        }

        function addSearchingMsg(msg) {
            var body = document.createElement("div");

            body.style.marginTop = "15px";
            body.style.marginBottom = "15px";

            $(body).html(
                msg === undefined ?
                    "Searching default branch with GitSense "+
                    "<span class='fa fa-spinner fa-spin' style='margin-left:5px;'></span>" 
                    :
                    msg
            );

            page.summary.parentNode.insertBefore(body, page.summary);

            return body;
        }

        function executeSearch(token, owner, repo, defaultBranch, searchArgs) {
            $(codeBadge).html(
                codeMatches+" / "+
                "<span class='fa fa-refresh fa-spin'></span>"
            );

            $(commitsBadge).html(
                commitMatches+" / "+
                "<span class='fa fa-refresh fa-spin'></span>"
            );

            $(diffsLink.badge).html("<span class='fa fa-refresh fa-spin'></span>");

            var searchMsg = 
                    currentSearch === "code" ||
                    currentSearch === "commits" ?
                        addSearchingMsg() :
                        null; 

            var idata    = new sdes.gitsense.data.insight(rule, token),
                branchId = "gitlab:"+owner+"/"+repo+":"+defaultBranch,
                href     = "/"+owner+"/"+repo+"?gitsense=insight#"+
                           "b="+branchId+"&t=%TYPE%&q="+searchArgs.join("+"),
                sabhref  = "/"+owner+"/"+repo+"?gitsense=insight#"+
                           "_t=%TYPE%&_q="+searchArgs.join("+");

            idata.getBranchHeads(
                [branchId],
                function(branchToLatest, error) {
                    if ( error !== undefined ) {
                        if ( error.responseText.match(/^{/) )
                            branchToLatest = JSON.parse(error.responseText);
                        else
                            throw(error.responseText);
                    }

                    var branch = branchToLatest[branchId];

                    if ( typeof(branch) === "string" ) {
                        renderNoSearch();
                        return;
                    }

                    if ( branch.indexedCommits ) {
                        search("commits", branchId, branch.head, searchArgs);
                    } else {
                        $(commitsBadge).html(commitMatches+" / NA");

                        if ( searchMsg != null ) {
                            $(searchMsg).html(
                                "The commits on the "+defaultBranch+" branch has not been indexed, "+
                                "unable to perform a GitSense commits search."
                            );
                        }
                    }

                    if ( branch.indexedSource )  {
                        search("code", branchId, branch.head, searchArgs);
                    } else {
                        $(codeBadge).html(codeMatches+" / NA");

                        if ( searchMsg != null ) {
                            $(searchMsg).html(
                                "The latest tree on the "+defaultBranch+" branch has not been indexed, "+
                                "unable to perform a GitSense code search."
                            );
                        }
                    }

                    if ( branch.indexedDiffs)  {
                        search("diffs", branchId, branch.head, searchArgs);
                    } else {
                        $(diffsLink.badge).html("NA");

                        if ( searchMsg != null ) {
                            $(searchMsg).html(
                                "The diffs on the "+defaultBranch+" branch has not been indexed, "+
                                "unable to perform a GitSense diffs search."
                            );
                        }
                    }
                }
            );

            function renderNoSearch() {
                $(codeBadge).html(codeMatches);
                $(commitsBadge).html(commitMatches);
                $(diffsLink.badge).html("N/A");

                $(searchMsg).html(
                    "Unable to search default branch.&nbsp; "+
                    "<a href="+window.location.origin+"/"+owner+"/"+repo+"?gitsense=insight>"+
                    "GitSense Insight"+
                    "</a> not available."
                );
            }

            function search(type, branchId, head, args) {
                //if ( type === "code" ) 
                //    $(searchMsg).text("Searching default branch with GitSense ...");

                var _args = $.extend(true, [], args);
                _args.push("cs:true");

                idata.search(
                    type,
                    [branchId+"@@@"+head.name],
                    _args,
                    1,
                    0,
                    function(results) {
                        var summary = results.search[branchId];

                        if ( type === "commits" )
                            updateCommitsSearch(summary);
                        else if ( type === "code" )
                            updateCodeSearch(summary);
                        else if ( type === "diffs" )
                            updateDiffsSearch(summary);
                        else
                            throw("Unrecognized GitSense search type '"+type+"'");
                    }
                );

                function updateCommitsSearch(summary) {
                    var total = summary.total;

                    $(commitsBadge).html(commitMatches+" / "+ total);

                    if ( currentSearch !== "commits" )
                        return;

                    $(searchMsg).html(
                        "<a href=\""+href.replace("%TYPE%", "commits")+"\">"+
                            "GitSense found "+total+" matching commit"+(total === 1 ? "" : "s")+" "+
                            "on the "+defaultBranch+" branch"+
                        "</a>.&nbsp; "+
                        "<span class='fa fa-search' "+
                            "style='margin-left:10px;margin-right:2px;;font-size:14px;'></span> "+
                        "<a href=\""+sabhref.replace("%TYPE%", "commits")+"\">Search another branch.</a>"
                    );
                }

                function updateCodeSearch(summary) {
                    var total = summary.total;

                    $(codeBadge).html(codeMatches+" / "+ total);

                    if ( currentSearch !== "code" )
                        return;

                    $(searchMsg).html(
                        "<a href=\""+href.replace("%TYPE%", "code")+"+cs:true\">"+
                            "GitSense found "+total+" code result"+(total === 1 ? "" : "s")+" "+
                            "with case-sensitive on & camelCase off on the "+
                            defaultBranch+" branch"+
                        "</a>.&nbsp; "+
                        "<span class='fa fa-search' "+
                            "style='margin-left:10px;margin-right:2px;;font-size:14px;'></span> "+
                        "<a href=\""+sabhref.replace("%TYPE%", "code")+"+cs:true\">Search another branch.</a>"
                    );
                }

                function updateDiffsSearch(summary) {
                    var total = summary.total;

                    $(diffsLink.badge).html(total);

                    diffsLink.setAttribute(
                        "href",
                        href.replace("%TYPE%","diffs")
                    );
                }
            }
        }
    }
}

function renderGitSense(renderTo, rule, token, params) {
    if ( gitsenseIframe === null )
        gitsenseIframe = document.getElementById("gitsense-content-iframe");

    if ( gitsenseIframe !== null ) {
        gitsenseIframe.parentNode.removeChild(gitsenseIframe);
        window.addEventListener("message", receiveMessage, false);
        lastHeight = null;
    }

    gitsenseIframe = document.createElement("iframe");

    gitsenseIframe.id           = gitsenseFrameId;
    gitsenseIframe.src          = chrome.runtime.getURL("frame.html");
    gitsenseIframe.style.width  = "100%";
    gitsenseIframe.style.height = "500px";
    gitsenseIframe.style.border = 0;

    renderTo.appendChild(gitsenseIframe);

    var msg = JSON.stringify(params);

    var stopAt = new Date().getTime()+2000;

    setTimeout(render, 100);

    function render() {
        if ( new Date().getTime() > stopAt )
            return;

        if ( gitsenseIframe !== null && gitsenseIframe.contentWindow !== null )
            gitsenseIframe.contentWindow.postMessage(msg, "*");

        // Do not remove the timeout.  The iframe knows when to ignore our messages.
        setTimeout(render, 50);
    }
   
}


function receiveMessage(event) {
    var temp1 = event.data.split(":::::");

    if ( temp1.length !== 2 ) 
        return;

    var temp2  = temp1[1].split(":"),
        sender = temp1[0],
        key    = temp2[0],
        value  = temp1[1].replace(/^[^:]+:/, ""),
        rule   = new sdes.utils.config().getRule();

    if ( sender !== "main" )
        return;

    if ( key.toLowerCase() === "gswin" && rule.host.xFrameOptions === "DENY" ) {
        var url = new URL(value);

        if ( url.origin === window.location.origin )
            key = "href";
    } 

    if ( key === "height")
        setHeight(parseInt(value));
    else if ( key === "hash" )
        setHash(value);
    else if ( key === "href" ) 
        setHref(value);
    else if ( key.toLowerCase() === "gswin" )
        openGitSenseWindow(value, key === "GSWIN" ? true : false);
    else
        console.log("Ignoring "+event.data);
}

function setHeight(height) {
    if ( height === lastHeight )
        return;

    gitsenseIframe.style.height = height+"px";
    lastHeight = height;
}

function setHash(hash) {
    ignoreHash = hash;

    if ( window.location.hash !== hash )
        window.location.hash = hash;
}

function setHref(href) {
    var url = new URL(href);

    if ( url.origin !== window.location.origin )
        return;

    window.location.href = href;
}

function openGitSenseWindow(href, max) {
    if ( overlayWindow !== null ) 
        overlayWindow.parentNode.removeChild(overlayWindow);

    if ( resize !== null )
        resize.parentNode.removeChild(resize);

    var url = new URL(href),
        win = createOverlayWindow(href, "*", max);

    win.iframe.src = chrome.runtime.getURL("frame.html");

    var params = {
        id: "overlay", 
        iframeSrc: url.href.replace(/#.+/, ""), 
        targetOrigin: url.origin, 
        hash: url.hash 
    };

    var msg    = JSON.stringify(params),
        stopAt = new Date().getTime() + 2000;
        
    setTimeout(render, 100);

    function render() {
        if ( new Date().getTime() > stopAt )
            return;

        win.iframe.contentWindow.postMessage(msg, "*");

        // Do not remove the timeout.  The iframe knows when to ignore our messages.
        setTimeout(render, 50);
    }
}

function createOverlayWindow(href, targetOrigin, max) {
    var width       = window.innerWidth - 30,
        height      = window.innerHeight - 25,
        _peekWidth  = max ? 15 : peekWidth,
        titleHeight = 30;

    overlayWindow = document.createElement("body");
    overlayWindow.style.width  = (width - _peekWidth)+"px";
    overlayWindow.style.height = height+"px";
    overlayWindow.style.backgroundColor = "white";
    overlayWindow.style.zIndex = 1000000;
    overlayWindow.style.position = "fixed";
    overlayWindow.style.top = 10+"px";
    overlayWindow.style.left = _peekWidth+"px";
    overlayWindow.style.border = "0px";
    overlayWindow.style.boxShadow = "0px 0px 26px 0px rgba(48,48,48,1)";
    overlayWindow.style.overflow = "hidden";

    var title = document.createElement("div");
    title.style.backgroundColor = "black";
    title.style.height = titleHeight+"px";
    title.style.display = "table";
    title.style.fontSize = "12px";
    title.style.color = "white";

    var externalLink = document.createElement("a");
    externalLink.setAttribute("class", "octicon octicon-link-external");
    externalLink.setAttribute("title", "Open in current window");
    externalLink.href = href;
    externalLink.target = "_blank";
    externalLink.style.fontWeight = "bold";
    externalLink.style.display = "block";
    externalLink.style.overflow = "hidden";
    externalLink.style.textOverflow = "ellipsis";
    externalLink.style.whiteSpace = "nowrap";
    externalLink.style.color = "white";

    var externalLinkCell = document.createElement("div");
    externalLinkCell.style.display = "table-cell";
    externalLinkCell.style.verticalAlign = "middle";
    externalLinkCell.style.paddingRight = "15px";
    externalLinkCell.style.paddingTop = "1px";
    externalLinkCell.appendChild(externalLink);

    var gotoLinkText = document.createTextNode(href);
    var gotoLink = document.createElement("a");
    gotoLink.setAttribute("title", "Open in new window");
    gotoLink.href = href;
    gotoLink.style.fontWeight = "bold";
    gotoLink.style.display = "block";
    gotoLink.style.width = "500px";
    gotoLink.style.overflow = "hidden";
    gotoLink.style.textOverflow = "ellipsis";
    gotoLink.style.whiteSpace = "nowrap";
    gotoLink.style.color = "white";
    gotoLink.appendChild(gotoLinkText);

    var gotoLinkCell = document.createElement("div");
    gotoLinkCell.style.display = "table-cell";
    gotoLinkCell.style.width = "100%";
    gotoLinkCell.style.verticalAlign = "middle";
    gotoLinkCell.style.paddingLeft = "15px";
    gotoLinkCell.style.paddingTop = "1px";
    gotoLinkCell.style.fontFamily = "monospace";
    gotoLinkCell.appendChild(gotoLink);

    var close = document.createElement("span");
    close.setAttribute("class", "octicon octicon-x");
    close.style.marginRight = "10px";
    close.style.cursor = "pointer";
    close.style.fontWeight = "bold";

    var closeCell = document.createElement("div");
    closeCell.style.display = "table-cell";
    closeCell.style.verticalAlign = "middle";
    closeCell.appendChild(close);

    var size = document.createElement("span");
    size.setAttribute("class", "octicon octicon-plus");
    size.setAttribute("title", "Increase window width");
    size.style.marginRight = "15px";
    size.style.cursor = "pointer";
    size.style.fontWeight = "bold";

    var sizeCell = document.createElement("div");
    sizeCell.style.display = max ? "none" : "table-cell";
    sizeCell.style.verticalAlign = "middle";
    sizeCell.appendChild(size);

    title.appendChild(gotoLinkCell);
    title.appendChild(externalLinkCell);
    title.appendChild(sizeCell);
    title.appendChild(closeCell);

    var iframe = document.createElement("iframe");
    iframe.style.border = "0px";
    iframe.style.width  = "100%";
    iframe.style.height = (height - titleHeight)+"px";

    overlayWindow.appendChild(title);
    overlayWindow.appendChild(iframe);

    document.body.appendChild(overlayWindow);

    resize                = document.createElement("div");
    resize.style.position = "fixed";
    resize.style.left     = (parseInt(overlayWindow.style.left) - 2)+"px";
    resize.style.top      = overlayWindow.style.top;
    resize.style.height   = overlayWindow.style.height;
    resize.style.width    = "5px";
    resize.style.cursor   = "col-resize";
    resize.style.zIndex   = overlayWindow.style.zIndex+1;
    resize.style.backgroundColor = "transparent";

    document.body.appendChild(resize);

    var screen = null;

    resize.onmousedown = function(e) {
        screen = document.createElement("div");
        screen.style.width  = window.innerWidth+"px";
        screen.style.height = window.innerHeight+"px"; 
        screen.style.position = "fixed";
        screen.style.top    = 0;
        screen.style.left   = 0;
        screen.style.zIndex = overlayWindow.style.zIndex+1;
        screen.style.backgroundColor = "white";
        screen.style.cursor  = "col-resize";
        screen.style.opacity = .3;
        document.body.appendChild(screen);

        var box = document.createElement("div");
        box.style.position = "fixed";
        box.style.left     = (parseInt(overlayWindow.style.left) - 2)+"px";
        box.style.top      = overlayWindow.style.top;
        box.style.height   = parseInt(overlayWindow.style.height)+"px";
        box.style.width    = (parseInt(overlayWindow.style.width) - 6)+"px";
        box.style.cursor   = "col-resize";
        box.style.border   = "2px solid #333";

        screen.appendChild(box);

        screen.onmousemove = function(e) {
            var diff = parseInt(resize.style.left) - e.clientX;
            box.style.width = (parseInt(overlayWindow.style.width)+diff)+"px";
            box.style.left  = e.clientX+"px";
        }

        screen.onmouseup = function(e) {
            screen.parentNode.removeChild(screen);
            screen = null;

            var diff = parseInt(resize.style.left) - e.clientX;
            overlayWindow.style.width = (parseInt(overlayWindow.style.width)+diff)+"px";
            overlayWindow.style.left  = e.clientX+"px";
            resize.style.left = e.clientX+"px";
            iframe.contentWindow.postMessage("resize", targetOrigin);
            peekWidth = e.clientX;
        }
    }

    close.onclick = function() {
        overlayWindow.parentNode.removeChild(overlayWindow);
        overlayWindow = null;
        resize.parentNode.removeChild(resize);
        resize = null;
    }

    size.onclick = function() {
        var expand = size.className.match(/dash/) ? false : true;

        if ( expand ) {
            resize.style.left         = "15px";
            overlayWindow.style.left  = "15px";
            overlayWindow.style.width = (width - 15)+"px";
            size.setAttribute("class", size.className.replace("plus", "dash"));
            size.setAttribute("title", "Shrink window width");
        } else {
            resize.style.left         = _peekWidth+"px";
            overlayWindow.style.left  = _peekWidth+"px";
            overlayWindow.style.width = (width - _peekWidth)+"px";
            size.setAttribute("class", size.className.replace("dash", "plus"));
            size.setAttribute("title", "Increase window width");
        }

        iframe.contentWindow.postMessage("resize", targetOrigin);
    }

    return { title: title, iframe: iframe };
}

function renderUnauthorized(type, renderTo, rule, page) {
    var token = type === "gitlab" ? "GitLab access token" : "GitHub personal token";

    $(renderTo).html(
        "<div style='padding:30px;padding-top:10px;width:800px;line-height:1.5;'>"+
            "<h2>Unauthorized</h2>"+
            "<p style='font-size:18px;'>"+
                "Sorry, we were unable to verify your identity on the GitSense server at "+
                rule.gitsense.baseUrl+"&nbsp; "+
                "Please add a GitSense access token and/or "+token+" to your "+
                "browser's GitSense settings and try again.&nbsp; To access the GitSense settings "+
                "page, copy and the paste the following URI:"+
            "</p>"+
            "<pre style='margin-top:20px'>chrome-extension://"+chrome.runtime.id+"/options.html</pre>"+
        "</div>"
    );
}
