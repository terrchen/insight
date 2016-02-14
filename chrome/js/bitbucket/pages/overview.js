var gitsenseOverviewPageStartTime;

sdes.bitbucket.pages.overview = function(page) {
    "use strict";

    gitsenseOverviewPageStartTime = new Date().getTime();

    var host             = "bitbucket",
        htmlUtil         = new sdes.utils.html(),
        varUtil          = new sdes.utils.variable(),
        updatedHeader    = true,
        lastChartWidth   = 0,
        searchInProgress = false,
        searchComp,
        repoOverviewBody,
        breadcrumbsBody,
        branchesAndTags,
        branchHead,
        chartsBody,
        auiItemBody,
        readmeBody,
        lastLocation,
        itemSidebarBody;

    this.resize = function() {
        if ( searchComp === undefined )
            return;

        var width = getChartWidth();

        if ( width === lastChartWidth )
            return;

        lastChartWidth = width;
        $(chartsBody).width(width);
        searchComp.resize();
    }

    this.render = function() {
        var stopAt = new Date().getTime() + 10000;

        updateRepoInfo();

        if ( page.supportedRepo ) {
            getBranchHead();
            renderWhenReady();
        }

        function getBranchHead() {
            var bdata = new sdes.bitbucket.data.repo( page.owner, page.repo);

            bdata.getBranchesAndTags(function(_branchesAndTags, error) {
                if ( error !== undefined )
                    throw(error);

                branchesAndTags = _branchesAndTags; 
            });

            bdata.getMainBranch(function(branch, error) {
                if ( error !== undefined )
                    throw(error);

                page.branch = branch.name;

                new sdes.gitsense.data.branch.heads(
                    host, 
                    page.owner, 
                    page.repo, 
                    page.branch
                ).getSummary(
                    "latest", 
                    function(bh, error) {
                        if ( error !== undefined ) {
                            if ( error.responseText.match(/Sorry/) )
                                branchHead = null;
                            else
                                throw(error);
    
                            return;
                        }

                        branchHead = bh;
                    }
                );
            });
        }

        function renderWhenReady() {
            if ( ! updatedHeader ) {
                if ( new Date().getTime() < stopAt )
                    setTimeout(renderWhenReady, 50);
                else
                    throw("GitSense: Giving up on waiting for the page to render");

                return;
            }

            breadcrumbsBody = document.getElementsByClassName("aui-nav-breadcrumbs");

            if ( breadcrumbsBody === null || breadcrumbsBody.length === 0  ) {
                if ( new Date().getTime() < stopAt )
                    setTimeout(renderWhenReady, 50);
                else
                    throw("GitSense: Giving up on waiting for page to load");

                return;
            }

            var elems = document.getElementsByClassName("aui-item");

            if ( elems === null || elems.length === 0 ) {
                if ( new Date().getTime() < stopAt )
                    setTimeout(renderWhenReady, 50);
                else
                    throw("GitSense: Giving up on waiting for the page to render");

                return;
            }

            auiItemBody = elems[0];

            elems = document.getElementsByClassName("sidebar");

            if ( elems === null || elems.length === 0 ) {
                if ( new Date().getTime() < stopAt )
                    setTimeout(renderWhenReady, 50);
                else
                    throw("GitSense: Giving up on waiting for the page to render");

                return;
            }

            itemSidebarBody = elems[0];

            readmeBody  = document.getElementById("readme");

            if ( readmeBody !== null )
                readmeBody.style.marginTop = "20px";

            if ( branchHead !== undefined )
                render();
            else
                waitForBranchHead();

            function waitForBranchHead() {
                if ( branchHead === undefined ) {
                    if ( new Date().getTime() < stopAt )
                        setTimeout(renderWhenReady, 50);
                    else
                        throw("GitSense: Giving up on waiting for the page to render");
                
                    return;
                }

                render();
            }
        }

        function updateRepoInfo() {
            var repoInfo = document.getElementById("repo-info");

            if ( repoInfo === null ) {
                if ( new Date().getTime() > stopAt ) 
                    throw("GitSense: Giving up on waiting for the class aui-nav-breadcrumbs");

                setTimeout(updateRepoInfo, 10);
        
                return;
            }

            var repoStat = document.getElementById("repo-stats"),
                repoData = document.getElementsByClassName("repo-metadata")[0],
                stats    = document.getElementsByClassName("stats")[0],
                updated  = repoData.children[1].innerText.replace(/^\s+|\s+$/, ""),
                language = repoData.children[3].innerText.replace(/^\s+|\s+$/, ""),
                access   = repoData.children[5].innerText.replace(/^\s+|\s+$/, ""),
                data     = {},
                node,
                type,
                stat,
                i;

            for ( i = 0; i < repoData.children.length; i++ ) {
                node = repoData.children[i];

                if ( i % 2 === 0 )
                    type = node.innerText.toLowerCase();
                else
                    data[type] = node.innerText;
            }

            repoStat.style.width = "initial";
            repoStat.style.whiteSpace = "nowrap";
           
            repoData.style.padding = "0px";
            repoData.style.paddingLeft = "20px";

            $(repoData).html(
                "<table style='height:80px;color:#707070'>"+
                    "<tr>"+
                        "<td style='vertical-align:middle'>"+
                            "<table style='line-height:1.3'>" +
                                "<tr>"+
                                    "<td style='text-align:right;padding-right:10px;'>Updated</td>"+
                                    "<td>"+data["last updated"]+"</td>"+
                                "</tr>"+
                                ( 
                                    varUtil.isNoU(data.website) ?
                                        "" :
                                        "<tr>"+
                                            "<td style='text-align:right;padding-right:10px;'>"+
                                                "Website"+
                                            "</td>"+
                                            "<td><a href=\""+data.website+"\">"+
                                                data.website+
                                            "</a></td>"+
                                        "</tr>"
                                )+
                                ( 
                                    varUtil.isNoU(data.language) || data.language === "—" ?
                                        "" :
                                        "<tr>"+
                                            "<td style='text-align:right;padding-right:10px;'>"+
                                                "Language"+
                                            "</td>"+
                                            "<td>"+data.language+"</td>"+
                                        "</tr>"
                                )+
                                "<tr>"+
                                    "<td style='text-align:right;padding-right:10px;'>Access</td>"+
                                    "<td>"+data["access level"]+"</td>"+
                                "</tr>"+
                            "</table>"+
                        "</td>"+
                    "</tr>"+
                "</table>"
            );

            for ( i = 0; i < stats.children.length; i++ ) {
                stat = stats.children[i];
                stat.style.width    = "initial";
                stat.style.minWidth = "80px";
                stat.style.padding  = "13px";

                if ( ! varUtil.isNoU(data.language) && ! varUtil.isNoU(data.website) ) {
                    stat.style.paddingTop    = "20px";
                    stat.style.paddingBottom = "20px";
                }
            }

            stats.style.backgroundColor = "white";
            stats.style.position = "relative";
            stats.style.cssFloat = "right";
            stats.style.zIndex   = 10;
        }
    }

    function render() {
        var searchResultsBody,
            searchInputBody,
            searchInput,
            caseSensitive, 
            helpBody;

        if ( ! branchHead.indexed ) {
            throw("Fixme: Need a way to signal this repository has not been indexed");
            return;
        }

        renderLayout();
        renderSearch();

        var now = gitsenseOverviewPageStartTime;

        doWeNeedToResizeTheChart();

        function doWeNeedToResizeTheChart() {
            if ( now !== gitsenseOverviewPageStartTime )
                return;
        
            var width = getChartWidth();

            if ( ! searchInProgress && width !== lastChartWidth ) {
                lastChartWidth = width;
                $(chartsBody).width(width);
                searchComp.resize();
            }

            setTimeout(doWeNeedToResizeTheChart, 500);
        }

        function renderLayout() {
            lastChartWidth = getChartWidth();

            chartsBody = 
                    htmlUtil.createDiv({
                        style: {
                            width: lastChartWidth+"px",
                            height: "80px",
                            border: "1px solid #bbb",
                            marginBottom: "15px",
                            marginTop: "15px",
                            borderRadius: "3px"
                        }
                    });

            searchInputBody = 
                htmlUtil.createDiv({
                    style: {
                        width: "100%",
                        marginBottom: "10px"
                    }
                });
    
            searchResultsBody = 
                htmlUtil.createDiv({
                    style: {
                        display: "none",
                        width: "100%",
                        marginTop: branchHead.latest ? "20px" : null
                    }
                });

            helpBody = 
                htmlUtil.createDiv({
                    style: {
                        height: "10px",
                        display: "none"
                    }
                });
   
            if ( readmeBody === null ) 
                return;

            readmeBody.parentNode.insertBefore(chartsBody, readmeBody);
            readmeBody.parentNode.insertBefore(searchInputBody, readmeBody);
            readmeBody.parentNode.insertBefore(htmlUtil.createClearDiv(), readmeBody);
            readmeBody.parentNode.insertBefore(searchResultsBody, readmeBody);
        }
    
        function renderSearch() {
            renderSearchInput();

            searchComp = 
                new sdes.bitbucket.comp.search(
                    page, 
                    branchHead,
                    chartsBody,
                    searchResultsBody,
                    {
                        showClose: true,
                        onclose: function() {
                            searchInput.value = "";

                            $(searchResultsBody).hide();
                            $(readmeBody).show();

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
                                width: "100%",
                                minHeight: "29px",
                                padding: "9px",
                                paddingLeft: "30px",
                                color: "#666",
                                fontSize: "13px"
                            } 
                        });

                var icon = 
                        htmlUtil.createSpan({
                            cls: "aui-icon aui-icon-small aui-iconfont-search",
                            style: {
                                color: "#ccc",
                                position: "relative",
                                cssFloat: "left",
                                top: "-24px",
                                left: "6px"
                            }
                        }),
                    branch =
                        htmlUtil.createSpan({
                            cls: "right",
                            text: page.branch,
                            style: {
                                cssFloat: "right",
                                borderRadius: "3px",
                                border: "1px solid #ccc",
                                color: "#666",
                                backgroundColor: "#eee",
                                padding: "2px",
                                paddingLeft: "7px",
                                paddingRight: "7px",
                                position: "relative",
                                right: "3px",
                                top: "-26px",
                                fontSize: "12px"
                            }
                        });

                searchInputBody.appendChild(searchInput);
                searchInputBody.appendChild(icon);
                searchInputBody.appendChild(branch);

                $(searchInput).keypress(function(e) {
                    if (e.which == 13)
                        pressedEnter(searchInput);
                });
            }
    
            function pressedEnter(input) {
                if ( input.value.match(/^\s*$/) )
                    return;
    
                var searchArgs    = new sdes.utils.cli().getArgs(input.value),
                    defaultSearch = branchHead.indexedSource ? "source" : "commits";

                $(readmeBody).hide();
                $(searchResultsBody).show();

                searchInProgress = true;

                if ( branchHead.latest === undefined && branchesAndTags !== undefined ) {
                    for ( var i = 0; i < branchesAndTags.branches.length; i++ ) {
                        var branch = branchesAndTags.branches[i];

                        if ( branch.name !== page.branch )
                            continue;

                        page.head = branch.changeset;

                        if ( branch.changeset === branchHead.head.name ) 
                            branchHead.latest = true;
                        else
                            branchHead.latest = false;

                        break;
                    }

                    if ( ! branchHead.latest )
                        searchComp.showWarning(page.head);
                }

                searchComp.execute(
                    defaultSearch,
                    searchArgs, 
                    caseSensitive,
                    {
                        commits: {
                            execute: true,
                        },
                        diffs: {
                            execute: branchHead.indexedDiffs ? true : false
                        },
                        source: {
                            execute: branchHead.indexedSource ? true : false
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

    function getChartWidth() {
        var sidebarLeft = $(itemSidebarBody).offset().left,
            breadLeft   = $(breadcrumbsBody).offset().left;

        return sidebarLeft - breadLeft - 2;
    }
}
