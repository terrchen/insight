var gitsenseCommitsPageStartTime;

sdes.bitbucket.pages.commits = function(page) {
    "use strict";

    gitsenseCommitsPageStartTime = new Date().getTime();

    var _this            = this,
        host             = "bitbucket",
        myStartTime      = gitsenseCommitsPageStartTime,
        htmlUtil         = new sdes.utils.html(),
        varUtil          = new sdes.utils.variable(),
        lastChartWidth   = 0,
        searchInProgress = false,

        idPrefix             = getIdPrefix(),
        enableLinkId         = idPrefix+"-enable",
        chartBodyId          = idPrefix+"-chart",
        changesBodyId        = idPrefix+"-changes",
        pillsAndSearchBodyId = idPrefix+"-pills-and-search",
        searchResultsBodyId  = idPrefix+"-search-results",
       
        branchSelectorBody,
        commitGraphBody,
        repoContentBody,
        commitsBody,
        changesBody,
        footerBody,
        rightEdgeMarker,
        mainBranch,
        branchHead,
        chartBody,
        auiItemBody,
        searchComp,
        lastLocation,
        itemSidebarBody;

    this.resize = function() {
        if ( searchComp === undefined )
            return;

        var width = getChartWidth();

        if ( width === lastChartWidth )
            return;

        lastChartWidth = width;
        $(chartBody).width(width);
        searchComp.resize();
    }

    this.render = function() {
        var stopAt = new Date().getTime() + 3000;

        destroyEnableLink();

        if ( ! page.supportedRepo )
            return;

        if ( page.branch === undefined  ) {
            getMainBranch();
        } else {
            getBranchHead();
            getPageBranchHead();
        }

        if ( document.getElementById(chartBodyId) === null )
            renderWhenReady();
        else
            destroyExistingElements();

        function getMainBranch() {
            var data = new sdes.bitbucket.data.repo(page.owner, page.repo);

            data.getMainBranch(function(branch, error) {
                if ( error !== undefined )
                    throw(error);

                mainBranch = branch;
            });
        }

        function getBranchHead() {
            new sdes.gitsense.data.branch.heads(
                host, 
                page.owner, 
                page.repo, 
                page.branch
            ).getSummary(
                "latest", 
                function(data, error) {
                    if ( error !== undefined ) {
                        if ( error.responseText.match(/Sorry/) )
                            branchHead = null;
                        else
                            throw(error);
    
                        return;
                    }

                    branchHead = data;

                    branchHead.latest = true;

                    return;

                    new sdes.bitbucket.data.repo(
                        page.owner, 
                        page.repo
                    ).getBranch(
                        page.branch,
                        function(data, error) {
                            //if ( error !== undefined )
                            //    throw(error);

                            //branchHead["bitbucket"] = data;

                            //if ( data.raw_node === branchHead.head.name )
                            //    branchHead.latest = true;
                            //else
                            //    branchHead.latest = false;
                        }
                    );
                }
            );
        }

        function getPageBranchHead() {
            var elems = document.getElementsByClassName("hash");

            if ( elems === null || elems.length === 0 ) {
                if ( new Date().getTime() > stopAt )
                    throw("GitSense: Giving up on waiting for page to load");

                setTimeout(getPageBranchHead, 100);
                return;
            }

            var i, elem, commit, temp;
    
            for ( i = 0; i < elems.length; i++ ) {
                elem = elems[i];

                if ( elem.tagName !== "A" )
                    continue;

                temp = elem.href.split(/\?at=/);

                if ( temp.length !== 2 )
                    throw("GitSense: We don't know how to parse this page anymore");

                if ( temp[1] !== page.branch )
                    break;

                commit = temp[0].split("/").pop();

                if ( commit.length !== 40 )
                    throw("GitSense: We don't know how to parse this page anymore");

                break;
            }

            if ( commit === undefined ) {
                if ( new Date().getTime() > stopAt )
                    throw("GitSense: Giving up on waiting for page to load");

                setTimeout(getPageBranchHead, 100);

                return;
            }

            page.head = commit;
        }
    
        function destroyEnableLink() {
            var link = document.getElementById(enableLinkId);

            if ( link !== null )
                link.parentNode.removeChild(link);

            var elems = document.getElementsByClassName("show-all-branches");

            if ( elems === null )
                return;

            $(elems[0]).show();
        }

        function destroyExistingElements() {
            var ids = [
                chartBodyId,
                changesBodyId,
                pillsAndSearchBodyId,
                searchResultsBodyId,
                enableLinkId
            ],
            body,
            i;
           
            for ( i = 0; i < ids.length; i++ ) {
                body = document.getElementById(ids[i]);

                if ( body !== null )
                    body.parentNode.removeChild(body);
            }

            renderWhenReady();
        }

        function renderWhenReady() {
            var elems = document.getElementsByClassName("branch-selector");

            if ( elems === null || elems.length === 0 ) {
                if ( new Date().getTime() < stopAt )
                    setTimeout(renderWhenReady, 50);
                else
                    throw("GitSense: Giving up on waiting for the page to render");

                return;
            }

            branchSelectorBody = elems[0];

            // This is for when we switch to the all branches view after
            elems = document.getElementsByClassName("branch-selector-pjax");

            if ( elems === null || elems.length === 0 ) {
                if ( new Date().getTime() < stopAt )
                    setTimeout(renderWhenReady, 50);
                else
                    throw("GitSense: Giving up on waiting for the page to render");

                return;
            }

            commitsBody = elems[0];

            // This is for when we switch to the all branches view after
            // doing a search and not closing it
            $(commitsBody).show();

            if ( page.branch === undefined ) {
                renderEnableLink();
                return;
            }

            commitGraphBody = document.getElementById("commit-graph-container");

            if ( commitGraphBody === null ) {
                if ( new Date().getTime() < stopAt )
                    setTimeout(renderWhenReady, 50);
                else
                    throw("GitSense: Giving up on waiting for the page to render");

                return;
            }

            footerBody = document.getElementById("footer");

            if ( footerBody === null ) {
                if ( new Date().getTime() < stopAt )
                    setTimeout(renderWhenReady, 50);
                else
                    throw("GitSense: Giving up on waiting for the page to render");

                return;
            }

            repoContentBody = document.getElementById("repo-content");

            if ( repoContentBody === null ) {
                if ( new Date().getTime() < stopAt )
                    setTimeout(renderWhenReady, 50);
                else
                    throw("GitSense: Giving up on waiting for the page to render");

                return;
            }

            //$(commitGraphBody).hide();

            rightEdgeMarker = 
                htmlUtil.createDiv({
                    style: {
                        cssFloat: "right",
                        height: "1px",
                        width: "1px"
                    }
                });

            var body = htmlUtil.createDiv({
                append: [ 
                    rightEdgeMarker, 
                    htmlUtil.createClearDiv()
                ],
                style: {
                    width: "100%"
                }
            });

            footerBody.appendChild(body);

            if ( branchHead === undefined || page.head === undefined ) {
                waitForBranchHead();
                return;
            }

            if ( branchHead === null ) {
                // GitSense is not available for this repository
                console.warn("Fixme: Need to implement this");
                return;
            }

            if ( branchHead.indexed )
                render();
            else
                console.warn("Fixme: Need to implement this");

            function waitForBranchHead() {
                if ( branchHead === undefined || page.head === undefined ) {
                    if ( new Date().getTime() < stopAt )
                        setTimeout(renderWhenReady, 50);
                    else
                        throw("GitSense: Giving up on waiting for the page to render");
                
                    return;
                }

                if ( branchHead.indexed )
                    render();
                else
                    console.warn("Fixme: Need to implement this");
            }
        }

        function renderEnableLink() {
            if ( mainBranch === undefined ) {
                if ( new Date().getTime() > stopAt )
                    throw("GitSense: Giving up on waiting for the main branch");

                setTimeout(renderEnableLink, 100);
                return;
            }

            var showAllLink = document.getElementsByClassName("show-all-branches")[0];
            $(showAllLink).hide();

            var link = document.getElementById(enableLinkId);

            if ( link !== null )
                link.parentNode.removeChild(link);

            link = 
                htmlUtil.createLink({
                    id: enableLinkId,
                    href: "/"+page.owner+"/"+page.repo+"/commits/branch/"+mainBranch.name,
                    text: "Show "+mainBranch.name+" branch with GitSense",
                    style: {
                        marginLeft: "5px"
                    }
                });

            branchSelectorBody.appendChild(link);
        }
    }


    function render() {
        var pills = [
                { 
                    id: "commits", 
                    html: 
                        "Commits &nbsp;("+
                            Number(branchHead.commits).toLocaleString("en")+
                        ")",
                    body: null
                },
                { 
                    id: "changes", 
                    html: 
                        "Changes &nbsp;("+
                            Number(branchHead.changes).toLocaleString("en")+
                        ")", 
                    body: null
                },
                { 
                    id: "search", 
                    text: "Search Results",
                    body: null
                }
            ],
        caseSensitive = false,
        renderedChanges = false,
        pillsAndSearchInputBody,
        searchResultsBody,
        searchInputBody,
        changesTreeBody,
        searchInput,
        pillsBody,
        helpBody,
        lastPill;

        branchHead.latest = page.head === branchHead.head.name ? true : false; 

        renderLayout();
        renderPills();
        renderSearch();
        renderChangesTree();

        var now = gitsenseCommitsPageStartTime;

        doWeNeedToResizeTheChart();

        function doWeNeedToResizeTheChart() {
            if ( now !== gitsenseCommitsPageStartTime )
                return;
        
            var width = getChartWidth();

            if ( ! searchInProgress && width !== lastChartWidth ) {
                lastChartWidth = width;
                $(chartBody).width(width);
                searchComp.resize();
            }

            setTimeout(doWeNeedToResizeTheChart, 500);
        }

        function renderLayout() {
            lastChartWidth = getChartWidth();

            chartBody = 
                htmlUtil.createDiv({
                    id: chartBodyId,
                    style: {
                        width: lastChartWidth+"px",
                        height: "80px",
                        border: "1px solid #bbb",
                        marginBottom: "30px",
                        marginTop: "10px",
                        borderRadius: "3px"
                    }
                });

            pillsBody = 
                htmlUtil.createDiv({
                    style: {
                        cssFloat: "left"
                    }
                });
    
            searchInputBody = 
                htmlUtil.createDiv({
                    style: {
                        cssFloat: "right",
                        position: "relative",
                        top: "-8px"
                    }
                });
    
            pillsAndSearchInputBody = 
                htmlUtil.createDiv({
                    id: pillsAndSearchBodyId,
                    append: [ pillsBody, searchInputBody, htmlUtil.createClearDiv()],
                    style: {
                        width: "100%",
                        marginBottom: "35px"
                    }
                });

            searchResultsBody = 
                htmlUtil.createDiv({
                    id: searchResultsBodyId,
                    style: {
                        display: "none",
                        width: "100%"
                    }
                });

            changesBody = 
                htmlUtil.createDiv({
                    id: changesBodyId,
                    style: {
                        display: "none",
                        width: "100%",
                        fontSize: "13.5px"
                    } 
                });

            helpBody = 
                htmlUtil.createDiv({
                    style: {
                        height: "10px",
                        display: "none"
                    }
                });

            getPill("commits").body = commitsBody;
            getPill("changes").body = changesBody;
            getPill("search").body  = searchResultsBody;
    
            commitsBody.parentNode.insertBefore(chartBody, commitsBody);
            commitsBody.parentNode.insertBefore(pillsAndSearchInputBody, commitsBody);
            commitsBody.parentNode.insertBefore(searchResultsBody, commitsBody);
            commitsBody.parentNode.insertBefore(changesBody, commitsBody);
        }

        function getPill(id) {
            for ( var i = 0; i < pills.length; i++ ) {
                var pill = pills[i];
            
                if ( pill.id === id )
                    return pill;
            }

            return null;
        }
    
        function getLabel(type) {
            switch (type) {
                case "commits":
                    var commits = 
                            isCustomSearch ? 
                                Number(branchHead.search.commits).toLocaleString("en") :
                                "",
                        total = Number(branchHead.commits).toLocaleString("en");
    
                    if ( isCustomSearch )
                        return "Commits &nbsp;(Matched "+commits+" out of "+total+")";
    
                    return "Commits &nbsp;("+total+")";
    
                case "changes":
                    var changes = 
                            isCustomSearch ? 
                                Number(branchHead.search.changes).toLocaleString("en") :
                                "",
                        total = Number(branchHead.changes).toLocaleString("en");
    
                    if ( isCustomSearch )
                        return "Changes &nbsp;(Matched "+changes+" out of "+total+")";
    
                    return "Changes &nbsp;("+total+")";
                default:
                    throw("GitSense Error: Unrecognized label type '"+type+"'");
            }
        }

        function renderPills(select) {
            if ( varUtil.isNoU(select) )
                select = pills[0].id;

            if ( select !== "search" )
                lastPill = select;
   
            var pillsBuilder = 
                    new sdes.ui.pills({
                        selectedBackgroundColor: "#3572B0"
                    }),
                pill,
                i;
    
            for ( i = 0; i < pills.length; i++ )  {
                pill = pills[i];

                if ( pill.id === select )
                    $(pill.body).show();
                else
                    $(pill.body).hide();

                if ( select === "search" && pill.id !== select )
                    continue;

                if ( select !== "search" && pill.id == "search" )
                    continue;
    
                pillsBuilder.add({
                    id: pill.id,
                    text: pill.text,
                    html: pill.html,
                    selected: select === pill.id ?  true : null, 
                    onclick: select === pill.id ? null : clicked,
                });
            }

            $(pillsBody).html("");

            pillsBody.appendChild(pillsBuilder.build());

            function clicked(params) {
                renderPills(params.id);
            }
        }

        function renderSearch() {
            renderSearchInput();

            searchComp = 
                new sdes.bitbucket.comp.search(
                    page, 
                    branchHead,
                    chartBody,
                    searchResultsBody,
                    {
                        showClose: true,
                        onclose: function() {
                            searchInput.value = "";

                            renderPills(lastPill);
                            updateMatchingTimelines();
                        },
                        ontabchange: function(tab) {
                            updateMatchingTimelines(tab.id, tab.searchSha, tab.total);
                        },
                        onsearchfinish: function(type, results) {
                            updateMatchingTimelines(type, results.sha, results.total);
                        }
                    }
                );

            searchComp.renderMatchingTimelinesChart(branchHead.head.name);

            function renderSearchInput() {
                searchInput = 
                        htmlUtil.createTextInput({
                            placeholder: "Search branch...",
                            style: {
                                width: "400px",
                                minHeight: "32px",
                                padding: "8px",
                                color: "#666",
                                fontSize: "13px"
                            } 
                        });

                searchInputBody.appendChild(searchInput);

                $(searchInput).keypress(function(e) {
                    if (e.which == 13)
                        pressedEnter(searchInput);
                });
            }
    
            function pressedEnter(input) {
                if ( input.value.match(/^\s*$/) )
                    return;
    
                var searchArgs    = new sdes.utils.cli().getArgs(input.value),
                    defaultSearch = "commits";

                $(commitsBody).hide();
                $(searchResultsBody).show();

                searchInProgress = true;

                renderPills("search");

                searchComp.execute(
                    defaultSearch,
                    searchArgs, 
                    caseSensitive,
                    {
                        commits: {
                            execute: true,
                        },
                        diffs: {
                            execute: false
                        },
                        source: {
                            execute: branchHead.indexedSource ? true : false,
                        }
                    }
                );
            }

            function updateMatchingTimelines(type, searchSha, total)  {
                if ( type !== undefined && searchComp.getSelectedTab() !== type )
                    return;

                setTimeout( 
                    function() {
                        if ( type === undefined )
                            searchComp.renderMatchingTimelinesChart(branchHead.head.name);
                        else if ( varUtil.isNoU(searchSha) || total === 0 )
                            searchComp.renderMatchingTimelinesChart(null, []) ;
                        else
                            searchComp.renderMatchingTimelinesChart(searchSha);

                        searchInProgress = false;
                    },
                    25
                );
            }
        }

        function renderChangesTree() {
            if ( renderedChanges )
                return;
    
            var bbrepo = new sdes.bitbucket.data.repo(page.owner, page.repo),

                revsTree = 
                    new sdes.gitsense.ui.trees.changes(
                        host,
                        page.owner,
                        page.repo,
                        page.branch,
                        branchHead.head.name,
                        {
                            onclickavatar: clickedAvatar,
                            onclick: clicked,
                            showSearchPlus: true
                        }
                    );
    
            revsTree.setStyle("bitbucket");
    
            revsTree.render("", "tree", changesBody);
    
            renderedChanges = true;
    
            function clicked(clickedOn, row) {
                if ( clickedOn === "search-plus" ) 
                    addPathToSearch();
                else
                    toggleRow();

                function addPathToSearch() {
                    // Fixme: 
                    // We are making too many assumptions about what
                    // characters exists in the path.  For now we'll
                    // assume they are word characters including spaces
            
                    var path  = row.path.match(/\s/) ? '"'+row.path+'"' : row.path,

                        query = 
                            row.type === "tree" ? 
                                "path:"+path+"/*" :
                                "path:"+path;

                    if ( ! searchInput.value.match(query) )
                        searchInput.value = searchInput.value+" "+query;
                }

                function toggleRow() {
                    revsTree.toggleRow(row);
                    revsTree.render(row.path, row.type, row.kidsBody);
                }
            }

            function clickedAvatar(avatar, commit) {
                bbrepo.getCommit(
                    commit.name, 
                    function(bbcommit, error) {
                        if ( error !== undefined )
                            throw(error);

                        if ( varUtil.isNoU(bbcommit.author.user) ) {
                            console.warn("No Bitbucket mapping for commit author "+commit.authorEmail);
                            return; 
                        }

                        var avatars = {};

                        avatars[commit.authorEmail] = bbcommit.author.user.links.avatar.href;

                        new sdes.gitsense.data.users().storeAvatars(avatars);

                        avatar.src = bbcommit.author.user.links.avatar.href;
                    }
                );
            }
        }

        function renderSearchHelp() {
            // Disabling for now
            return;

            $(helpBody).html("");

            var help = "",

                helpLink =
                    htmlUtil.createLink({
                        text: "Search Help",
                        style: {
                            fontSize: "12px",
                            color: "#999",
                            cssFloat: "right",
                            cursor: "pointer",
                            position: "relative"
                        }
                    }),
                helpExamples =
                    htmlUtil.createDiv({
                        html: help,
                        style: {
                            border: "1px solid #eee",
                            padding: "10px",
                            marginTop: "10px",
                            display: "none",
                            fontFamily: "monospace"
                        }
                    });

            helpBody.appendChild(helpLink);
            helpBody.appendChild(htmlUtil.createClearDiv());
            helpBody.appendChild(helpExamples);

            helpLink.onclick = function() {
                if ( helpExamples.style.display === "none" ) {
                    helpBody.style.height = null;
                    $(helpExamples).show();
                    $(helpLink).html("Close Help");
                } else {
                    helpBody.style.height = "10px";
                    $(helpExamples).hide();
                    $(helpLink).html("Search Help");
                }
            }
        }
    }

    function getIdPrefix() {
        return "id"+CryptoJS.MD5(page.owner+":"+page.repo+":commits");
    }

    function getChartWidth() {
        return $(rightEdgeMarker).offset().left - $(repoContentBody).offset().left - 40;
    }
}
