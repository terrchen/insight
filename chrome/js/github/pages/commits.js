// Since GitHub uses push state, you'll find a bunch of code here
// that tests if something exists and removes it, if it does.
// There is probably a better way to do things, but for now we'll
// go with this, so don't be surprised if you find things getting
// deleted for no apparent reason.
//
// And if you are wondering why we are even deleting them, the reason
// is the events that are associated with the objects that are created
// are destroyed.  This is probably expected behaviour, but if we 
// could preserve our events, when GitHub changes states, we'll be able
// to provide the users with a much better experience.

sdes.github.pages.commits = function(page) {
    "use strict";

    var host   = "github",
        bhdata = new sdes.gitsense.data.branch.heads(host, page.owner, page.repo, page.branch),

        idPrefix            = "id"+CryptoJS.MD5(page.owner+":"+page.repo+":"+page.branch+":commits"),
        chartsBodyId        = idPrefix+"-charts",
        changesTreeBodyId   = idPrefix+"-changes",
        navAndSearchBodyId  = idPrefix+"-nav-and-search",
        searchResultsBodyId = idPrefix+"-search-results",
        helpBodyId          = idPrefix+"-help",
        messageId           = idPrefix+"-message",
        commitCodeChurnBars = [];

    this.render = function() {
        var stopAt = new Date().getTime() + 3000;

        if ( document.getElementById(chartsBodyId) === null )
            renderWhenReady();
        else
            destroyExistingElements();

        function destroyExistingElements() {
            var ids = [
                chartsBodyId,
                changesTreeBodyId,
                navAndSearchBodyId,
                searchResultsBodyId,
                helpBodyId,
                messageId
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
            if ( new Date().getTime() > stopAt )
                throw("GitSense: We've given up on waiting for the commits page to become ready");
             
            var elems = document.getElementsByClassName("commits-listing");

            if ( elems === null ) {
                setTimeout(renderWhenReady, 100);
                return;
            }

            elems = document.getElementsByClassName("file-navigation");

            if ( elems === null ) {
                setTimeout(renderWhenReady, 100);
                return;
            }

            if ( page.branch === null || page.head === null ) {
                render(null);
                return;
            }

            bhdata.getSummary(
                page.head, 
                function(branchHead, error) {
                    if ( error !== undefined && ! error.responseText.match(/Sorry/) )
                        throw(error);
    
                    render(branchHead);
                }
            );
        }
    }

    function render(branchHead) {
        var commitsBody = document.getElementsByClassName("commits-listing")[0],
            fileNavBody = document.getElementsByClassName("file-navigation")[0],

            paginationBody = 
                document.getElementsByClassName("pagination") === null ?
                    null :
                    document.getElementsByClassName("pagination")[0],

            htmlUtil = new sdes.utils.html(),
            dateUtil = new sdes.utils.date(),
            varUtil  = new sdes.utils.variable(),

            searchCommitsBuilder,
            searchInputBuilder,
            renderedChanges,
            chartsData,
            statsData,
            changesTreeBody,
            chartsBody,
            searchResultsBody,
            navAndSearchBody,
            commitsStatsBody,
            warningsBody,
            helpBody,
            navigator;

        if ( varUtil.isNoU(branchHead) ) {
            renderNotAvailable();
            return;
        } 

        if ( ! branchHead.indexed ) {
            // This branch is being indexed, its just the latest 
            // commit hasn't been indexed. Retrieve the last commit
            // that was indexed by GitSense.
            bhdata.getLatest(function(latest, error){
                if ( error !== undefined )
                    throw(error);

                renderNotIndexedOptions(latest);
            });

            return; 
        }

        renderLayout();
        renderChartButtons();
        renderNavigator();
        renderCommitsTimelineChart();
        renderChangesTree();
        renderSearch();
        renderSearchHelp();

        if ( branchHead.indexedCodeChurn ) 
            renderCommitsCodeChurn();
    
        if ( page.filterCommits )
            renderFilteredCommits();

        function renderNotAvailable() {
            var message = document.getElementById(messageId);

            if ( message !== null )
                message.parentNode.removeChild(message);

            message =
                 htmlUtil.createSpan({
                        id: messageId,
                        text: "GitSense not available",
                        style: {
                            cssFloat: "right",
                            color: "#999",
                            textAlign: "right"
                        }
                    });

            fileNavBody.appendChild(message);
        }

        function renderNotIndexedOptions(latest) {
            var message = document.getElementById(messageId);

            if ( message !== null )
                message.parentNode.removeChild(message);

            if ( latest.head === undefined )  
                renderNeverIndexed();
            else 
                renderLatest();
  
            function renderNeverIndexed() {
                var msg = 
                        htmlUtil.createSpan({
                            id: messageId,
                            html: 
                                "This "+(page.branch === null ? "tree" : "branch")+" "+
                                "has not been<br>"+ 
                                "indexed by GitSense",
                            style: {
                                cssFloat: "right",
                                color: "#999",
                                textAlign: "right"
                            }
                        });

                fileNavBody.appendChild(msg);
            }

            function renderLatest() { 
                var link = 
                        htmlUtil.createLink({
                            id: messageId,
                            href: 
                                "/"+page.owner+"/"+page.repo+"/commits/"+
                                latest.head.name+"?gitsense-branch="+page.branch,
                            html: 
                                "Browse latest GitSense index<br>"+
                                latest.head.name.substring(0,8)+" - "+
                                new moment(latest.head.commitTime).fromNow(),
                            style: {
                                cssFloat: "right",
                                textAlign: "right"
                            }
                        });

                fileNavBody.appendChild(link);
            }
        }
         
        function renderLayout() {
            chartsBody = 
                htmlUtil.createDiv({
                    id: chartsBodyId,
                    style: {
                        width: "980px",
                        height: "80px",
                        border: "1px solid #bbb",
                        marginTop: "10px",
                        marginBottom: "20px"
                    }
                });
    
            changesTreeBody =
                htmlUtil.createDiv({
                    id: changesTreeBodyId,
                    style: {
                        display: "none",
                        width: "100%"
                    }
                });
    
            navAndSearchBody = 
                htmlUtil.createDiv({
                    id: navAndSearchBodyId,
                    style: {
                        width: "100%",
                        overflow: "hidden",
                        marginBottom: "5px"
                    }
                });
    
            searchResultsBody = 
                htmlUtil.createDiv({
                    id: searchResultsBodyId,
                    style: {
                        display: "none",
                        width: "100%",
                        marginTop: "30px"
                    }
                });

            helpBody = 
                htmlUtil.createDiv({
                    id: helpBodyId,
                    style: {
                        height: "10px"
                    }
                });

            commitsBody.parentNode.insertBefore(chartsBody, commitsBody);
            commitsBody.parentNode.insertBefore(navAndSearchBody, commitsBody);
            commitsBody.parentNode.insertBefore(helpBody, commitsBody);
            commitsBody.parentNode.appendChild(changesTreeBody);
            commitsBody.parentNode.appendChild(searchResultsBody);
        }
    
        function renderFilteredCommits() {
            var builder = new sdes.github.ui.commits(page.owner,page.repo,commitsBody);
    
            bhdata.getCommits(branchHead.search.sha, render);
    
            function render(commits, error) {
                if ( error !== undefined )
                    throw(error);
    
                for ( var i = 0; i < commits.length; i++ ) 
                    builder.add(commits[i]);
            }
        }
    
        function renderCommitsTimelineChart(matchingChartsData) {
            if ( chartsData === undefined ) {
                defineChartsData(renderCommitsTimelineChart);
                return;
            }

            $(chartsBody).html("");

            var commits = 
                    matchingChartsData === undefined ? 
                        crossfilter(chartsData) : 
                        crossfilter(matchingChartsData),

                days   = commits.dimension(function(d){ return d.day; }),
                weeks  = commits.dimension(function(d){ return d.week; }),
                months = commits.dimension(function(d){ return d.month; }),

                commitsByDayGroup = 
                    days.group().reduceSum(function(d){
                        return d.commits;
                    }),

                commitsByWeekGroup = 
                    weeks.group().reduceSum(function(d){
                        return d.commits;
                    }),

                commitsByMonthGroup = 
                    months.group().reduceSum(function(d){
                        return d.commits;
                    }),

                firstDay = chartsData[0].day,
                lastDay  = chartsData[chartsData.length - 1].day,

                numDays   = commitsByDayGroup.top(Number.POSITIVE_INFINITY).length,
                numWeeks  = commitsByWeekGroup.top(Number.POSITIVE_INFINITY).length,
                numMonths = commitsByMonthGroup.top(Number.POSITIVE_INFINITY).length,
                
                timelineChart = dc.barChart(chartsBody),

                useGroup,
                useDim,
                useRound,
                useXUnits;

            if ( numDays < 90 ) {
                useGroup  = commitsByDayGroup;
                useDim    = days;
                useRound  = d3.time.day.round;
                useXUnits = d3.time.days;
            } else if ( numWeeks < 365 ) {
                useGroup  = commitsByWeekGroup;
                useDim    = weeks;
                useRound  = d3.time.week.round;
                useXUnits = d3.time.weeks;
            } else {
                useGroup  = commitsByMonthGroup;
                useDim    = months;
                useRound  = d3.time.month.round;
                useXUnits = d3.time.months;
            }
                
            timelineChart.width( $(chartsBody).width() )
                .height( $(chartsBody).height() )
                .margins({ top: 20, bottom: 30, left: 30, right: 30})
                .dimension(useDim)
                .group(useGroup)
                .centerBar(true)
                .barPadding(1)
                .brushOn(false)
                .x(d3.time.scale().domain([firstDay, lastDay]))
                .xUnits(useXUnits)
                .xAxisPadding(1)
                .elasticX(true)
                .alwaysUseRounding(true)
                .round(useRound);

            if ( matchingChartsData !== undefined )
                timelineChart.colors("#55a532");

            timelineChart.yAxis().ticks(0);

            dc.renderAll();

            timelineChart.selectAll("rect.bar").style("cursor", "default");
        }
    
        function renderCommitsStats() {
            if ( varUtil.isNoU(statsData) ) {
                defineStatsData(renderCommitsStats);
                return;
            }
    
            $(commitsStatsBody).html(
                Number(statsData.commitsLastMonth).toLocaleString("en")+" "+
                    "last month"+
                "<span class='octicon octicon-primitive-dot' "+
                    "style='margin-left:7px;margin-right:7px;font-size:8px;"+
                        "position:relative;top:-3px;color:#555;'></span>"+
                Number(statsData.commitsThisMonth).toLocaleString("en")+" "+
                    "this month"
            );
        }

        function renderCommitsCodeChurnChart() {
            if ( varUtil.isNoU(chartsData) ) {
                defineChartsData(renderCommitsCodeChurn);
                return;
            }
    
            $(chartsBody).highcharts("StockChart", {
                chart: {
                    alignTicks: false
                },
    
                rangeSelector: {
                    selected: chartsData.paddedDays > 365 ? 5 : 1,
                    inputEnabled: false
                },
    
                navigator: {
                    enabled: false
                },
    
                series: [
                    {
                        type: "line",
                        name: "Lines added",
                        data: chartsData.churn.adds,
                        color: "#55a532"
                    },
                    {
                        type: "line",
                        name: "Lines changed",
                        data: chartsData.churn.chgs,
                        color: "#08c"
                    },
                    {
                        type: "line",
                        name: "Lines deleted",
                        data: chartsData.churn.dels,
                        color: "#bd2c00"
                    },
                ]
            });
        }
    
        function renderCompareChart() {
            if ( varUtil.isNoU(chartsData) ) {
                defineChartsData(renderCompareChart);
                return;
            }
    
            $(chartsBody).highcharts("StockChart", {
                chart: {
                    alignTicks: false
                },
    
                rangeSelector: {
                    selected: chartsData.paddedDays > 365 ? 5 : 1,
                    inputEnabled: false
                },
    
                navigator: {
                    enabled: false
                },
    
                yAxis: [
                    { title: { text: "Commits" } }, 
                    { title: { text: 'Lines of Code Churn' }, opposite: false }
                ],
    
                series: [
                    {
                        type: "column",
                        data: chartsData.commits,
                        yAxis: 0
                    },
                    {
                        type: "line",
                        data: chartsData.locs,
                        yAxis: 1
                    },
                ]
            });
        }
    
        function renderNavigator(select, showSearchResults) {
            if ( showSearchResults === undefined )
                showSearchResults = false;
    
            var navBuilder = new sdes.github.ui.subnav(),
                isSearch   = branchHead.search === undefined ? false : true,  
    
                types = [
                    {
                        id: "commits",
                        show: showSearchResults ? false : true,
                        html: getLabel("commits")
                    },
                    {
                        id: "changes",
                        show: showSearchResults ? false : true,
                        html: getLabel("changes")
                    },
                    {
                        id: "search",
                        show: showSearchResults,
                        html: "Search Results",
                    }
                ];
    
            if ( varUtil.isNoU(select) )
                select = types[0].id;
    
            var i, 
                type;
    
            for ( i = 0; i < types.length; i++ )  {
                type = types[i];
    
                navBuilder.add({
                    id: type.id,
                    html: type.html,
                    selected: select === type.id ? true : null,
                    onclick: select === type.id ? null : clicked,
                    show: type.show
                });
            }
    
            if ( navigator !== undefined )
                navigator.parentNode.removeChild(navigator);
    
            navigator = navBuilder.build(); 
    
            navAndSearchBody.appendChild(navigator);
    
            show(select);
    
            if ( ! showSearchResults )
                return;
    
            var link = navBuilder.getLink("search");
    
            if ( varUtil.isNoU(link) )
                throw("GitSense Error: Unable to retrieve the link called 'search'");
    
            var close = htmlUtil.createSpan({ 
                cls: "octicon octicon-x",
                style: {
                    marginLeft: "15px",
                    cursor: "pointer"
                }
            });
    
            link.appendChild(close);
    
            close.onclick = function() {
                searchInputBuilder.getInputElement().value = "";

                $(chartsBody).html("");

                renderChartButtons();
                renderNavigator();

                setTimeout(renderCommitsTimelineChart, 50);
            }
    
            function clicked(params) {
                renderNavigator(params.id, showSearchResults);
            }
    
            function getLabel(type) {
                switch (type) {
                    case "commits":
                        var commits = 
                                isSearch ? 
                                    Number(branchHead.search.commits).toLocaleString("en") :
                                    "",
                            total = Number(branchHead.commits).toLocaleString("en");
    
                        if ( isSearch )
                            return "Commits &nbsp;(Matched "+commits+" out of "+total+")";
    
                        return "Commits &nbsp;("+total+")";
    
                    case "changes":
                        var changes = 
                                isSearch ? 
                                    Number(branchHead.search.changes).toLocaleString("en") :
                                    "",
                            total = Number(branchHead.changes).toLocaleString("en");
    
                        if ( isSearch )
                            return "Changes &nbsp;(Matched "+changes+" out of "+total+")";
    
                        return "Changes &nbsp;("+total+")";
                    default:
                        throw("GitSense Error: Unrecognized label type '"+type+"'");
                }
            }
    
            function show(id) {
                switch (id) {
                    case "commits":
                        $(commitsBody).show();
                        $(commitsStatsBody).show();
                        $(changesTreeBody).hide();
                        $(searchResultsBody).hide();
        
                        if ( paginationBody !== null )
                            $(paginationBody).show();
    
                        break;
                    case "changes":
                        $(commitsBody).hide();
                        $(commitsStatsBody).hide();
                        $(changesTreeBody).show();
                        $(searchResultsBody).hide();
    
                        if ( paginationBody !== null )
                            $(paginationBody).hide();
        
                        break;
                    case "search" :
                        $(commitsBody).hide();
                        $(commitsStatsBody).hide();
                        $(changesTreeBody).hide();
                        $(searchResultsBody).show();
    
                        if ( paginationBody !== null )
                            $(paginationBody).hide();
    
                        break;
                    default:
                        throw("GitSense Error: Unrecognized navigation type '"+params.id+"'");
                }
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

        function renderSearch() {
            var tabsBody = 
                    htmlUtil.createDiv({
    
                    }),
                matchingCommitsBody = 
                    htmlUtil.createDiv({ 
                        style: {
                            display: "none"
                        }
                    }),
                matchingChangesBody = 
                    htmlUtil.createDiv({
                        style: {
                            display: "none"
                        }
                    }),
                matchingDiffsBody = 
                    htmlUtil.createDiv({
                        style: {
                            display: "none"
                        }
                    }),
                tabs = [
                    {
                        id: "commits",
                        label: "Commits",
                        total: null,
                        searchSha: null
                    },
                    //{ 
                    //    id: "changes", 
                    //    label: "Changes",
                    //    total: null
                    //}
                ],
                renderedDiffs = false,
                matchingPaginationBody,
                selectedTab,
                lastSelectedTab,
                searchArgs;

            if ( branchHead.indexedDiffs ) 
                tabs.push({ id: "diffs", label: "Diffs", total: null, searchSha: null });

            searchResultsBody.appendChild(tabsBody);
            searchResultsBody.appendChild(matchingCommitsBody);
            searchResultsBody.appendChild(matchingChangesBody);
            searchResultsBody.appendChild(matchingDiffsBody);
    
            if ( ! page.filterCommits )
                renderSearchInput();
            
            function renderSearchInput() {
                searchInputBuilder = 
                        new sdes.github.ui.input.search({
                            align: "right",
                            value: "",
                            placeholder: "Search branch commits",
                            onenter: pressedEnter
                        });

                var search = searchInputBuilder.build();
    
                navAndSearchBody.appendChild(search);
            }
    
            function pressedEnter(input, inputElem) {
                if ( input.match(/^\s*$/) )
                    return;
    
                searchArgs = new sdes.utils.cli().getArgs(input);

                var i, arg;

                for ( i = 0; i < searchArgs.length; i++ ) {
                    arg = searchArgs[i];

                    if ( arg == "week:this" )
                        searchArgs[i] = getThisWeek();
                    else if ( arg == "week:last" )
                        searchArgs[i] = getLastWeek();
                }

                inputElem.value = searchArgs.join(" ");

                renderNavigator("search", true);
    
                $(matchingCommitsBody).html("");
                $(matchingChangesBody).html("");
                $(matchingDiffsBody).html("");

                var tab; 

                for ( i = 0; i < tabs.length; i++ ) {
                    tab = tabs[i];

                    tab.total     = null;
                    tab.searchSha = null;
                }

                selectedTab     = "commits";
                lastSelectedTab = null;
                renderedDiffs   = false;

                renderTabs();

                bhdata.search(
                    page.head, 
                    "commits",
                    searchArgs,
                    1,
                    processCommitsSearch
                );

                if ( branchHead.indexedDiffs ) {
                    // Asking for page 0 will return a summary of the search ... provided
                    // the search results exists.  If not, it will return an error.
                    bhdata.search(
                        page.head, 
                        "diffs",
                        searchArgs,
                        0,
                        function(report, error) {
                            if ( error !== undefined ) {
                                if ( error.responseText === "No search results")
                                    return;

                                throw(error);
                            }

                            getTab("diffs").total = report.total;

                            renderTabs();
                        }
                    );
                }

                function getThisWeek() {
                    return "week:"+moment().year()+"-w"+moment().isoWeek();
                }
            }
    
            function renderTabs() {
                var tabBuilder = new sdes.github.ui.tabs(),
                    dotsCls    = "octicon octicon-primitive-dot",
                    dotsStyle  = "font-size:6px; position:relative; top:-2px",
                    tab,
                    i;

                for ( i = 0; i < tabs.length; i++ ) {
                    tab = tabs[i];

                    tabBuilder.add({
                        id: tab.id,
                        html: getHtml(tab),
                        selected: tab.id === selectedTab ? true : false,
                        onclick: clicked
                    });
                }

                $(tabsBody).html("");
    
                tabsBody.appendChild(tabBuilder.build());

                var search = 
                        htmlUtil.createLink({
                            href: 
                                "/"+page.owner+"/"+page.repo+"/branches/all?"+
                                "gitsense-search-args="+JSON.stringify(searchArgs),
                            html: 
                                "Search across branches... &nbsp;"+
                                "<span class='octicon octicon-arrow-right'></span>",
                            style: {
                                fontWeight: "bold"
                            } 
                        }),
                    rightTab = tabBuilder.getRightTab();

                rightTab.appendChild(search);

                function getHtml(tab) {
                    var html; 

                    if ( tab.total === null) {
                        html = tab.label+" "+
                               "<span class='counter' style='padding-left:7px;padding-right:7px;'>"+
                                   "<span class='"+dotsCls+"' style='"+dotsStyle+"'></span> "+
                                   "<span class='"+dotsCls+"' style='"+dotsStyle+"'></span> "+
                                   "<span class='"+dotsCls+"' style='"+dotsStyle+"'></span>"+
                               "</span>";

                        return html;
                    }

                    html = tab.label+" "+
                           "<span class='counter'>"+
                               Number(tab.total).toLocaleString("en")+
                           "</span>";

                    return html;
                }
   
                function clicked(id, tabElem) {
                    lastSelectedTab = selectedTab;
                    selectedTab     = id;
                    
                    switch(id) {
                        case "commits":
                            $(matchingCommitsBody).show();
                            $(matchingChangesBody).hide();
                            $(matchingDiffsBody).hide();

                            break;
                        case "changes":
                            $(matchingCommitsBody).hide();
                            $(matchingChangesBody).show();
                            $(matchingDiffsBody).hide();
                            break;
                        case "diffs":
                            $(matchingCommitsBody).hide();
                            $(matchingChangesBody).hide();
                            $(matchingDiffsBody).show();

                            if ( ! renderedDiffs ) 
                                renderDiffs();

                            break;
                        default:
                            throw("GitSense: Unrecognized tab type '"+id+"'");
                    }

                    renderTabs();

                    var tab = getTab(selectedTab);

                    if ( tab.searchSha === null )
                        return;

                    if ( tab.total === 0 )
                        renderMatchingTimeline(null, []);
                    else
                        renderMatchingTimeline(tab.searchSha);
                }
            }
    
            function processCommitsSearch(results, error) {
                if ( error !== undefined )
                    throw(error);

                if ( results.page === 1 ) {
                    var tab = getTab("commits");

                    tab.total     = results.total;
                    tab.searchSha = results.sha;

                    matchingCommitsBody.commits = 
                        htmlUtil.createDiv({
                            cls: "commits-listing commits-listing-padded "+
                                 "js-navigation-container js-active-navigation-container"
                        });

                    matchingCommitsBody.pagination =
                        htmlUtil.createDiv({
                            cls: "paginate-container"
                        });

                    matchingCommitsBody.appendChild(matchingCommitsBody.commits);   
                    matchingCommitsBody.appendChild(matchingCommitsBody.pagination);

                    searchCommitsBuilder = 
                        new sdes.github.ui.commits(
                            page.owner,
                            page.repo,
                            matchingCommitsBody.commits
                        );

                    //if ( results.total === 0 ) {
                    //    tabs[1].total = 0;
                    //} else {
                    //    tabs[1].total = null;

                    //    bhdata.getSummary(
                    //        results.sha,
                    //        function(summary, error) {
                    //            if ( error !== undefined )
                    //                throw(error);

                    //            if ( ! summary.indexed ) {
                    //                renderIndexSearchResultsMsg(results);
                    //                return;
                    //            }

                    //            tabs[1].total = summary.search.changes;

                    //            renderTabs();
                    //            renderMatchingChangesTree();
                    //        }
                    //    );
                    //}
                }

                selectedTab = "commits";
                renderTabs();

                $(matchingCommitsBody).show();
                $(matchingChangesBody).hide();
                $(matchingDiffsBody).hide();
   
                if ( results.total === 0 ) {
                    renderMatchingTimeline(null, []);
                    return;
                }

                renderCommits();
                renderPagination();

                if ( results.page === 1 )
                    renderMatchingTimeline(results.sha);
    
                function renderCommits() {
                    var matches = results.matches,
                        span    = "<span style='background-color:rgba(255,255,140,0.5)'>",
                        commit,
                        showMsg,
                        i;
    
                    for ( i = 0; i < matches.length; i++ ) {
                        commit = matches[i];

                        if ( commit.showMsg === undefined ) {
                            commit.showMsg = commit.message.match(/\{%%S%%\}/);
    
                            commit.title = 
                                commit.title.
                                    replace(/</g, "&lt;").
                                    replace(/>/g, "&gt;").
                                    replace(/\{%%S%%\}/g, span).
                                    replace(/\{%%E%%\}/g, "</span>");
    
                            commit.message = 
                                commit.message.
                                    replace(/</g, "&lt;").
                                    replace(/>/g, "&gt;").
                                    replace(/\{%%S%%\}/g, span).
                                    replace(/\{%%E%%\}/g, "</span>");
                        }
    
                        searchCommitsBuilder.add(
                            commit, 
                            { 
                                showMsg: commit.showMsg, 
                                target: "_blank",
                                backgroundColor: "white"
                            }
                        );
                    }
                }
    
                function renderPagination() {
                    var pagination = matchingCommitsBody.pagination;

                    if ( results.total === results.end ) {
                        matchingCommitsBody.removeChild(pagination);
                        return;
                    }

                    var matches = 
                            results.end + results.mpp > results.total ?
                                results.total - results.end :
                                results.mpp;

                    $(pagination).html(
                        "<div class='pagination'>"+
                            "<a style='cursor-pointer'>"+
                                "Show next "+(matches)+" matches"+
                            "</a>"+
                        "</div>"
                    );

                    pagination.onclick = function() {
                        bhdata.search(
                            page.head, 
                            "commits",
                            results.args,
                            (results.page+1),
                            processCommitsSearch
                        );
                    }
                }

                function renderMatchingChangesTree() {
                    var revsTree = 
                        new sdes.gitsense.ui.trees.changes(
                            host,
                            page.owner,
                            page.repo,
                            page.branch,
                            results.sha,
                            {
                                onclick: clicked,
                                showSearchPlus: false
                            }
                        );
    
                    revsTree.setStyle("github");

                    $(matchingChangesBody).html("");

                    matchingChangesBody.style.fontSize = null;
    
                    revsTree.render("", "tree", matchingChangesBody);
    
                    renderedChanges = true;
    
                    function clicked(clickedOn, row) {
                        toggleRow();

                        function toggleRow() {
                            revsTree.toggleRow(row);
                            revsTree.render(row.path, row.type, row.kidsBody);
                        }
                    }
                }
            }

            function renderDiffs(results, error) {
                if ( renderedDiffs )
                    return;

                if ( error !== undefined )
                    throw(error);

                if ( results === undefined ) {
                    bhdata.search(
                        page.head, 
                        "diffs",
                        searchArgs,
                        1,
                        function(results, error) {
                            if ( error !== undefined )
                                throw(error);

                            renderDiffs(results);
                        }
                    );

                    return;
                }

                matchingDiffsBody.changes = 
                    htmlUtil.createDiv({
                        cls: "commits-listing commits-listing-padded "+
                             "js-navigation-container js-active-navigation-container"
                    });

                matchingDiffsBody.pagination =
                    htmlUtil.createDiv({
                        cls: "paginate-container"
                    });

                matchingDiffsBody.appendChild(matchingDiffsBody.changes);   
                matchingDiffsBody.appendChild(matchingDiffsBody.pagination);

                var commitsBuilder = 
                        new sdes.github.ui.commits(
                            page.owner,
                            page.repo,
                            matchingDiffsBody.changes
                        ),
                    tab = getTab("diffs");

                tab.total     = results.total;
                tab.searchSha = results.sha;

                renderTabs();

                if ( results.total === 0 ) {
                    renderMatchingTimeline(null, []);
                    return;
                }

                renderMatchingTimeline(results.sha);
                renderPage(results);

                renderedDiffs = true;

                function renderPage(results) {
                    var matches       = results.matches,
                        newMatches    = [],
                        matchToFiles  = {},
                        actionToColor = { "A": "#55a532", "M": "#08c", "D": "#bd2c00" },
                        match,
                        action,
                        lines,
                        href,
                        i;

                    for ( i = 0; i < matches.length; i++ ) {
                        match = matches[i];

                        if ( matchToFiles[match.commit] === undefined ) {
                            matchToFiles[match.commit] = [];
                            newMatches.push(match);
                        }

                        href = 
                            "/"+
                            page.owner+"/"+
                            page.repo+"/"+
                            "commit/"+
                            match.commit+
                            "#diff-"+CryptoJS.MD5(match.path);

                        if ( match.oldBlob.match("^00000000") )
                            action = "A";
                        else if ( match.blob.match("^00000000") )
                            action = "D";
                        else
                            action = "M";

                        matchToFiles[match.commit].push(
                            "<span style='font-weight:bold'>"+
                                "<span style='color:"+actionToColor[action]+";'>"+action+"</span> "+ 
                                "<a href="+href+" target=_blank>"+match.path+"</a>\n"+
                            "</span>"+
                            ( match.diffs === undefined ? "" : getDiffsTable(match.diffs) )
                        );
                    }

                    for ( i = 0; i < newMatches.length; i++ ) {
                        match = newMatches[i];

                        match.name = match.commit;

                        commitsBuilder.add(
                            match,
                            {
                                showMsg: false,
                                target: "_blank",
                                backgroundColor: "white",
                                messageStyle: {
                                    fontWeight: "bold",
                                    fontSize: "13px",
                                    marginTop: "10px",
                                    marginBottom: "5px"
                                },
                                append: 
                                    htmlUtil.createPre({
                                        html: matchToFiles[match.commit].join("<br>"),
                                        style: {
                                            marginTop: "5px" 
                                        }
                                    })
                            }
                        );
                    }

                    renderPagination();

                    function renderPagination() {
                        var pagination = matchingDiffsBody.pagination;

                        if ( results.total === results.end ) {
                            matchingDiffsBody.removeChild(pagination);
                            return;
                        }

                        var matches = 
                                results.end + results.mpp > results.total ?
                                    results.total - results.end :
                                    results.mpp;

                        $(pagination).html(
                            "<div class='pagination'>"+
                                "<a style='cursor-pointer'>"+
                                    "Show next "+(matches)+" matches"+
                                "</a>"+
                            "</div>"
                        );

                        pagination.onclick = function() {
                            bhdata.search(
                                page.head, 
                                "diffs",
                                results.args,
                                (results.page+1),
                                function(results, error) {
                                    if ( error !== undefined )
                                        throw(error);

                                    renderPage(results);
                                }
                            );
                        }
                    }
    
                    function getDiffsTable(diffs) {
                        var lines  = diffs.split("\n"),
                            regexp = /^(\s*\d+): (-|\+)(.+)$/,
                            html   = "",
                            bgcolor,
                            color,
                            match,
                            line,
                            temp,
                            i;

                        for ( i = 0; i < lines.length; i++ ) {
                            match   = regexp.exec(lines[i]);

                            if ( match === null )
                                continue;

                            bgcolor = match[2] === "+" ? "#eaffea" : "#ffecec";
                            color   = match[2] === "+" ? "#55a532" : "#bd2c00";

                            html += 
                                "<tr style=''>"+
                                    "<td style='padding-left:20px;padding-right:10px;color:"+color+";"+
                                        "border-right:1px solid #eaeaea;text-align:right;"+
                                        "background-color:"+bgcolor+"'>"+
                                        match[1]+
                                    "</td>"+
                                    "<td style='padding-left:10px;width:100%;'>"+
                                        "<span style='color:"+color+"'>"+
                                            match[2]+
                                        "</span>"+
                                        match[3]  
                                            .replace(/</g, "&lt;")
                                            .replace(/>/g, "&gt;")
                                            .replace(/\n/g, "<br>")
                                            .replace(/{%%S%%}/g, "<span style='background-color:#fffdc3'>")
                                            .replace(/{%%E%%}/g, "</span>")+
                                    "</td>"+
                                "</tr>";
                        }

                        html =
                            "<table style='font-family:monospace;margin-top:5px;width:100%;"+
                                "line-height:1.7;color:#666;border:1px solid #eaeaea;'>"+
                                html+
                            "</table>";

                        return html;
                    }
                }
            }

            function renderIndexSearchResultsMsg(results) {
                var link = 
                        htmlUtil.createLink({
                            text: "here",
                            style: {
                                cursor: "pointer",
                                fontWeight: "bold" 
                            }
                        });

                matchingChangesBody.style.fontSize = "14px";

                matchingChangesBody.appendChild(
                    htmlUtil.createTextNode(
                        "The changes in this search have not been indexed. "+
                        "To view the changes, click "
                   )
                );

                matchingChangesBody.appendChild(link);

                matchingChangesBody.appendChild(
                    htmlUtil.createTextNode(" to submit an index request.")
                );

                link.onclick = clicked;

                function clicked() {
                    bhdata.buildSearchContext(
                        results.sha,
                        results.args,
                        function(buildStatus, error) {
                            if ( error !== undefined )
                                throw(error);

                            if ( buildStatus === "FAILED" )
                                renderFailedMsg();
                            else if ( buildStatus === "FINISHED" )
                                renderTree();
                            else
                                renderSuccessMsg();
                        } 
                    );
                }

                function renderFailedMsg() {
                    $(matchingChangesBody).html(
                        "We are sorry but the index request failed to complete."
                    );
                }

                function renderSuccessMsg() {
                    $(matchingChangesBody).html(
                        "Your index request has been received and should be completed "+
                        "very shortly."
                    );
                }
            }

            function getTab(id) {
                for ( var i = 0; i < tabs.length; i++ ) {
                    if ( tabs[i].id === id )
                        return tabs[i];
                }
            }

            function renderMatchingTimeline(sha, points) {
                if ( points === undefined ) {
                    if ( varUtil.isNoU(sha) )
                        throw("GitSense: Both points and sha cannot be null/undefined");

                    bhdata.getCommitPoints(
                        sha,
                        function(points, error) {
                            if ( error !== undefined )
                                throw(error);

                            renderMatchingTimeline(null, points);
                        }
                    );

                    return;
                }
 
                var labelToPoint  = {},
                    newChartsData = $.extend(true, [], chartsData),
                    point,
                    data,
                    i;

                for ( i = 0; i < points.length; i++ )
                    labelToPoint[points[i].label] = points[i];

                for ( i = 0; i < newChartsData.length; i++ ) {
                    data  = newChartsData[i];
                    point = labelToPoint[data.label];

                    if ( point === undefined ) 
                        data.commits = 0;
                    else
                        data.commits = point.commits;
                }

                renderCommitsTimelineChart(newChartsData);
            }
        }
    
        function renderChartButtons(select, onlyShowCommit) {
            // Disabling for now
            return;
 
            var types  = [ { id: "commits", label: "Commits" } ], 
                btngrp = new sdes.github.ui.btngrp({ align: "right" }),
                id     = idPrefix+"-chart-buttons",
                type,
                i;

            if ( onlyShowCommit === undefined )
                onlyShowCommit = false;
    
            if ( ! onlyShowCommit && branchHead.indexedCodeChurn ) {
                types.push({ id: "codechurn", label: "Code Churn" });
                types.push({ id: "compare", label: "Compare" });
            }
    
            if ( varUtil.isNoU(select) ) 
                select = types[0].id;
    
            for ( i = 0; i < types.length; i++ ) {
                type = types[i];
    
                btngrp.add({
                    id: type.id,
                    label: type.label,
                    selected: type.id === select ? true : null,
                    onclick: type.id === select ? null : clickedBtn
                });
            }
    
            var btns = document.getElementById(id);

            if ( btns !== null )
                btns.parentNode.removeChild(btns);

            btns = btngrp.build();
            btns.id = id;
    
            fileNavBody.appendChild(btns);
    
            function clickedBtn(btn) {
                btns.parentNode.removeChild(btns);
    
                renderChartButtons(btn.id);
    
                $(chartsBody).html("");
    
                if ( btn.id === "commits" )
                    renderCommitsTimelineChart();
                else if ( btn.id === "codechurn" )
                    renderCommitsCodeChurnChart();
                else if ( btn.id === "compare" ) 
                    renderCompareChart();
                else
                    throw("GitSense Error: Unrecognized button id '"+btn.id+"'");
            }
        }
    
        function renderChangesTree() {
            if ( renderedChanges)
                return;
    
            var treeBody;
    
            renderLayout();
            renderTree();
    
            function renderLayout() {
                treeBody = 
                    htmlUtil.createDiv({ 
                        style: { 
                            width: "100%",
                            marginTop: "5px"
                        }
                    });
    
                changesTreeBody.appendChild(treeBody);
            }
    
            function renderTree() {
                var revsTree = 
                    new sdes.gitsense.ui.trees.changes(
                        host,
                        page.owner,
                        page.repo,
                        page.branch,
                        page.head,
                        {
                            onclick: clicked,
                            showSearchPlus: page.filterCommits ? false : true
                        }
                    );
    
                revsTree.setStyle("github");
    
                revsTree.render("", "tree", treeBody);
    
                renderedChanges = true;
    
                function clicked(clickedOn, row) {
                    if ( clickedOn === "search-plus" ) 
                        addPathToSearch();
                    else
                        toggleRow();

                    function addPathToSearch() {
                        if ( varUtil.isNoU(searchInputBuilder === undefined) )
                            throw("GitSense: The search input builder has not been defined");   

                        // Fixme: 
                        // We are making too many assumptions about what
                        // characters exists in the path.  For now we'll
                        // assume they are word characters including spaces
                
                        var input = searchInputBuilder.getInputElement(),
                            path  = row.path.match(/\s/) ? '"'+row.path+'"' : row.path,

                            query = 
                                row.type === "tree" ? 
                                    "path:"+path+"/*" :
                                    "path:"+path;

                        if ( ! input.value.match(query) )
                            input.value = input.value+" "+query;

                        searchInputBuilder.dokeyup();
                    }

                    function toggleRow() {
                        revsTree.toggleRow(row);
                        revsTree.render(row.path, row.type, row.kidsBody);
                    }
                }
            }
        }
   
        function renderCommitsCodeChurn(commitToChurn) {
            if ( commitToChurn === undefined ) {
                var commits = getCommits();

                if ( commits.length === 0 )
                    return;

                bhdata.getCommitsCodeChurn(
                    page.head,
                    commits,
                    function(commitToChurn, error) {
                        if ( error !== undefined )
                            throw(error);

                        renderCommitsCodeChurn(commitToChurn);
                    }
                );
                    
                return;
            }

            var elems = document.getElementsByClassName("commits-list-item"),
                ccbar = 
                    new sdes.gitsense.ui.codechurn.bar({
                        position: "relative",
                        left: "-45px",
                        width: "920px"
                    }),
                kids,
                nodes,
                node,
                commit,
                churn,
                bar,
                id,
                i,
                j;

            for ( i = 0; i < elems.length; i++ ) {
                kids   = elems[i].children[1].children;
                nodes  = kids[0].children;
                commit = null;

                for ( j = 0; j < nodes.length; j++ ) {
                    node = nodes[j];

                    if ( varUtil.isNoU(node.className) || node.className !== "message" )
                        continue;

                    commit = node.href.split("/").pop();
                    break;
                }

                if ( commit === null )
                    throw("GitSense: Unable to find a commit");

                churn = commitToChurn[commit];

                // Most merge commits have no churn so this is not unexpected
                if ( churn === undefined )
                    continue;

                id  = idPrefix+"-"+commit+"-codechurn";
                bar = document.getElementById(id);

                if ( bar !== null )
                    bar.parentNode.removeChild(bar);

                bar = htmlUtil.createDiv({
                    id: id,
                    append: ccbar.create(churn),
                    cls: "tooltipped tooltipped-e",
                    ariaLabel: 
                        " LoC Churn: "+
                            churn.loc.total+" ("+
                            churn.loc.add+" add, "+
                            churn.loc.chg+" chg, "+
                            churn.loc.del+" del"+
                        ")\n"+
                        "SLoC Churn: "+
                            churn.sloc.total+" ("+
                            churn.sloc.add+" add, "+
                            churn.sloc.chg+" chg, "+
                            churn.sloc.del+" del"+
                        ")",
                    style: {
                        display: "none"
                    }
                });

                $(bar).insertAfter(kids[ kids.length - 1 ])

                commitCodeChurnBars.push(bar);
            }

            if ( commitCodeChurnBars.length === 0 )
                return;

            addLink();

            function getCommits() {
                var elems   = document.getElementsByClassName("commit-title"),
                    commits = [],
                    commit,
                    i;

                for ( i = 0; i < elems.length; i++ ) {
                    commit = elems[i].childNodes[1].href.split("/").pop();

                    if ( commit.length === 40 )
                        commits.push(commit);
                }

                return commits;
            }

            function addLink() {
                var elems = document.getElementsByClassName("commit-group-title");

                if ( elems === null )
                    return;

                var id     = idPrefix+"-show-hide-code-churn",
                    toggle = document.getElementById(id);

                if ( toggle !== null )
                    toggle.parentNode.removeChild(toggle);

                toggle = htmlUtil.createSpan({
                    id: id,
                    cls: "octicon octicon-graph",
                    style: {
                        cssFloat: "right",
                        cursor: "pointer",
                        marginTop: "5px",
                        color: "#999"
                    }
                });

                elems[0].appendChild(toggle);

                toggle.onclick = clicked;
                toggle.off     = true;

                function clicked() {
                    var i;

                    if ( toggle.off ) {
                        for ( i = 0; i < commitCodeChurnBars.length; i++ )
                            $(commitCodeChurnBars[i]).show();
    
                        toggle.off = false;
                        toggle.style.color = "#55a532";
                    } else {
                        for ( i = 0; i < commitCodeChurnBars.length; i++ )
                            $(commitCodeChurnBars[i]).hide();

                        toggle.off = true;
                        toggle.style.color = "#999";
                    }
                }
            }
        }

        function defineChartsData(callback) {
            bhdata.getCommitPoints(page.head, processPoints);
    
            function processPoints(points, error) {
                if ( error !== undefined )
                    throw(error);
    
                var commits = [],
                    locs    = [],
                    adds    = [],
                    chgs    = [],
                    dels    = [],
                    slocs   = [],
                    sadds   = [],
                    schgs   = [],
                    sdels   = [],
                    data    = [],
                    format  = d3.time.format("%Y-%m-%d"),
                    point,
                    time,
                    i;
    
                // Since the data is sorted by date (oldest to latest), we can 
                // just push the data into their respective arrays
    
                for ( i = 0; i < points.length; i++ ) {
                    point = points[i];

                    data.push({ 
                        label: point.label,
                        day: d3.time.day(format.parse(point.label)),
                        week: d3.time.week(format.parse(point.label)),
                        month: d3.time.month(format.parse(point.label)),
                        commits: point.commits,
                        codechurn: points.churn === undefined ? 0 : points.churn.loc.total
                    });
                }
    
                // See if we need to padd any days. Basically, if the last commit was over
                // a year ago, we want to fill in the days from last year to now.  And the
                // reason why we want to do this is want to make it very easily to see how
                // active/inactive the branch is.
           
                //var lastDay     = points[ points.length - 1 ].label, 
                //    lastDate    = new Date(lastDay),
                //    today       = dateUtil.timeToYearMonthDay(null, true),
                //    daysBetween = dateUtil.getDaysBetweenDates(new Date(lastDay), new Date(today));
    
                //for ( i = 0; i < daysBetween; i++ ) {
                //    lastDate = dateUtil.addDaysToDate(lastDate, 1);
                //    time     = lastDate.getTime();

                //    data.push({time: time, commits: 0});
                //}
   
                chartsData = data;
 
                callback();
            }
        }
    
        function defineStatsData(callback) {
            bhdata.getCommitsStats(
                page.head,
                function(stats, error)  {
                    if ( error !== undefined )
                        throw(error);
    
                    statsData = stats;
    
                    callback();
                }
            );
        }
    }
}
