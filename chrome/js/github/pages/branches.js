// Since GitHub uses push state, you'll find a bunch of code here
// that tests if something exists and removes it, if it does.
// There is probably a better way to do things, but for now we'll
// go with this, so don't be surprised if you find things getting
// deleted for no apparent reason.

sdes.github.pages.branches = function(page) {
    "use strict";

    var host     = "github",
        htmlUtil = new sdes.utils.html(),
        dateUtil = new sdes.utils.date(),
        varUtil  = new sdes.utils.variable(),
        bhdata   = new sdes.gitsense.data.branch.heads(host, page.owner, page.repo),

        idPrefix            = "id"+CryptoJS.MD5(page.owner+":"+page.repo+":branches"),
        chartsBodyId        = idPrefix+"-charts",
        chartOptionsBodyId  = idPrefix+"-chart-options",
        chartButtonsId      = idPrefix+"-chart-buttons",
        navAndSearchBodyId  = idPrefix+"-nav-and-search",
        searchResultsBodyId = idPrefix+"-search-results",
        pageHeaderBody;

    this.render = function() {
        var stopAt = new Date().getTime() + 5000;

        if ( document.getElementById(chartsBodyId) !== null )
            destroyExistingElements();
        else
            renderWhenReady();

        function destroyExistingElements() {
            var ids = [
                chartsBodyId,
                chartOptionsBodyId,
                navAndSearchBodyId,
                searchResultsBodyId
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
                throw("GitSense: We've given up on waiting for the branches page to fully load");
             
            var elems = document.getElementsByClassName("site-footer-links");

            if ( elems === null || elems.length === 0 ) {
                setTimeout(renderWhenReady, 100);
                return;
            }

            elems = document.getElementsByClassName("page-header");

            if ( elems === null || elems.length === 0 ) {
                setTimeout(renderWhenReady, 100);
                return;
            }

            pageHeaderBody = elems[0];

            bhdata.getBranchHeads(
                function(branchToHead, error) {
                    if ( error !== undefined )
                        throw(error);
    
                    render(branchToHead);
                }
            );
        }
    }

    function render(branchToHead) {
        var branchToChartsData = {},
            branchToPoints     = {},
            branchToCommitIds  = {},
            commitIdToCommit   = {},
            commitIdToBranches = {},
            selectedBranches   = [],
            isSelected         = {},
            commitsLayout      = "row",
            selectedChartType  = "commits",
            branchGroupsBody,
            chartsBody,
            chartOptionsBody,
            navAndSearchBody,
            searchResultsBody,
            navigator,
            searchInput;

        if ( ! varUtil.isNoU(page.defaultBranch) ) {
            selectedBranches.push(page.defaultBranch);
            isSelected[page.defaultBranch] = true;
        }

        renderLayout();
        renderActionButtons();

        if ( varUtil.isNoU(page.searchArgs) ) {
            renderChartButtons();
            renderChart();
            return;
        }

        branchGroupsBody = document.getElementsByClassName("branch-groups")[0];

        renderNavigator();
        renderSearchInput();
        renderSearchResults();

        function renderLayout() {
            chartsBody = document.getElementById(chartsBodyId);
            chartOptionsBody = document.getElementById(chartOptionsBodyId);

            if ( chartsBody !== null )
                chartsBody.parentNode.removeChild(chartsBody);

            if ( chartOptionsBody !== null )
                chartOptionsBody.parentNode.removeChild(chartOptionsBody);

            chartsBody = htmlUtil.createDiv({
                    id: chartsBodyId,
                    style: {
                        width: "980px",
                        height: "250px",
                        border: "1px solid #ccc",
                        marginTop: "5px",
                        marginBottom: "20px",
                        display: varUtil.isNoU(page.searchArgs) ? null : "none"
                    }
                });

            chartOptionsBody = htmlUtil.createDiv({
                    id: chartOptionsBodyId,
                    style: {
                        width: "100%",
                        marginBottom: "10px",
                        overflow: "hidden"
                    }
                });

            navAndSearchBody = 
                htmlUtil.createDiv({
                    id: navAndSearchBodyId,
                    style: {
                        width: "100%",
                        overflow: "hidden",
                        marginBottom: "20px",
                        display: "hidden"
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

            pageHeaderBody.parentNode.insertBefore(chartOptionsBody, pageHeaderBody);
            pageHeaderBody.parentNode.insertBefore(chartsBody, pageHeaderBody);

            if ( varUtil.isNoU(page.searchArgs) )
                return;

            pageHeaderBody.parentNode.insertBefore(navAndSearchBody, pageHeaderBody);
            pageHeaderBody.parentNode.insertBefore(searchResultsBody, pageHeaderBody);
        }

        function renderChart(ready) {
            if ( ready === undefined ) {
                defineBranchToChartsData(renderChart);
                return;
            }

            $(chartsBody).html("");

            if ( selectedBranches.length === 0 )
                return;

            var branchToGroup = {},
                branchToDays  = {},
                chartsData,
                branch,
                group,
                data,
                days,
                i;

            for ( i = 0; i < selectedBranches.length; i++ ) {
                branch     = selectedBranches[i];
                chartsData = branchToChartsData[branch];

                days = 
                    crossfilter(chartsData).dimension(
                        function(d){ 
                            return d.day; 
                        }
                    );
    
                group = 
                    days.group().reduceSum(
                        function(d) {
                            return d[selectedChartType];
                        }
                    );

                branchToGroup[branch] = group;
                branchToDays[branch]  = days;
            }

            branch = selectedBranches[0];
            group  = branchToGroup[branch];
            days   = branchToDays[branch];

            var chartsData = branchToChartsData[branch],
                firstDay   = chartsData[0].day,
                lastDay    = chartsData[chartsData.length - 1].day,
                lineChart  = dc.compositeChart(chartsBody),
                lineCharts = [],
                colors     = d3.scale.category10();

            lineChart.width( $(chartsBody).width() )
                .height( $(chartsBody).height() )
                .margins({ top: 20, bottom: 30, left: 50, right: 20})
                .dimension(days)
                .valueAccessor(function(d){ return d.value; })
                .brushOn(false)
                .x(d3.time.scale().domain([firstDay, lastDay]))
                .xUnits(d3.time.days)
                .renderHorizontalGridLines(true)
                .round(d3.time.day.round);

            for ( i = 0; i < selectedBranches.length; i++ ) {
                branch = selectedBranches[i];
                lineCharts.push(
                    dc.lineChart(lineChart)
                        .group(branchToGroup[branch])
                        .colors(colors(i))
                );
            }

            lineChart.compose(lineCharts);

            dc.renderAll();
        }

        function renderCodeChurnChart(ready) {
            if ( ready === undefined ) {
                defineBranchToChartsData(renderCodeChurnChart);
                return;
            }

            var series = [],
                i,
                branch;

            for ( i = 0; i < selectedBranches.length; i++ ) {
                branch = selectedBranches[i];

                series.push({
                    type: "line",
                    name: branch,
                    data: branchToChartsData[branch].churn.loc.total
                });
            }

            $(chartsBody).highcharts("StockChart", {
                chart: {
                    alignTicks: false
                },

                rangeSelector: {
                    selected: 1,
                    inputEnabled: false
                },

                navigator: {
                    enabled: false
                },

                series: series
            });
        }

        function renderActionButtons() {
            var branches = page.branches,
                i;

            for ( i = 0; i < branches.length; i++ )
                addButton(branches[i]);
 
            function addButton(branch) {
                var head = branchToHead[branch.name];

                if ( head === undefined )
                    return;

                var icon = 
                        htmlUtil.createSpan({
                            cls: "octicon octicon-plus"
                        }),
                    link = 
                        htmlUtil.createLink({
                            id: idPrefix+"-"+branch.name,
                            cls: "btn btn-sm iconbutton"+
                                 (head.indexed ? "" : " disabled")+
                                 (head.indexed && isSelected[branch.name] ? " selected" : "")
                        }),
                    nodes = branch.actions.children,
                    trash = null,
                    node,
                    i;

                for ( i = 0; i < nodes.length; i++ ) {
                    node = nodes[i];

                    if ( ! node.className.match(/js-branch-destroy/) )
                        continue;

                    trash = node;
                    break;
                }
                
                link.appendChild(icon);

                if ( trash === null )
                    branch.actions.appendChild(link);
                else
                    $(link).insertBefore(trash);

                if ( ! head.indexed )
                    return;

                link.onclick = function() {
                    var selected = link.className.match("selected") ? true : false;

                    if ( selected ) {
                        link.setAttribute("class", link.className.replace("selected", ""));
                        removeBranch();
                        delete isSelected[branch.name];
                    } else {
                        link.setAttribute("class", link.className+" selected");
                        selectedBranches.push(branch.name);
                        isSelected[branch.name] = true;
                    }

                    if ( varUtil.isNoU(page.searchArgs) ) {
                        renderChart();
                        renderChartButtons();
                    } else {
                        renderSearchResults();
                    }
                }

                function removeBranch() {
                    var temp = [],
                        chartBranch,
                        i;

                    for ( i = 0; i < selectedBranches.length; i++ ) {
                        chartBranch = selectedBranches[i];

                        if ( chartBranch === branch.name )
                            continue;

                        temp.push(chartBranch);
                    }

                    selectedBranches = temp;
                }
            }
        }

        function renderNavigator(select) {
            var elems = document.getElementsByClassName("js-branches-subnav");

            if ( elems === undefined )
                throw("GitSense: We can't find the object with the class 'js-branches-subnav'");

            $(elems[0]).hide();

            $(navAndSearchBody).show();

            var navBuilder = new sdes.github.ui.subnav(),
    
                types = [
                    {
                        id: "branches",
                        html: "Select branches"
                    },
                    {
                        id: "search",
                        html: "Search results"
                    },
                ],

                i,
                type;
    
            if ( varUtil.isNoU(select) )
                select = types[0].id;
    
            for ( i = 0; i < types.length; i++ )  {
                type = types[i];
    
                navBuilder.add({
                    id: type.id,
                    html: type.html,
                    selected: select === type.id ? true : null,
                    onclick: select === type.id ? null : clicked,
                    show: true
                });
            }
    
            if ( navigator !== undefined )
                navigator.parentNode.removeChild(navigator);
    
            navigator = navBuilder.build(); 
    
            navAndSearchBody.appendChild(navigator);

            function clicked(type) {
                switch (type.id) {
                    case "branches":
                        $(branchGroupsBody).show();
                        $(searchResultsBody).hide();
                        break;
                    case "search" :
                        $(branchGroupsBody).hide();
                        $(searchResultsBody).show();
                        break;
                    default:
                        throw("GitSense Error: Unrecognized navigation type '"+type.id+"'");
                }

                renderNavigator(type.id);
            }
        }

        function renderChartButtons(select) {
            var types  = [ { id: "commits", label: "Commits" } ], 
                btngrp = new sdes.github.ui.btngrp({ align: "right" }),
                showCodeChurn = true,
                head,
                type,
                i;

            for ( i = 0; i < selectedBranches.length; i++ ) {
                head = branchToHead[selectedBranches[i]];

                if ( head.indexedCodeChurn )
                    continue;

                showCodeChurn = false;
                break;
            }

            if ( showCodeChurn )
                types.push({ id: "codechurn", label: "Code Churn" });

            if ( varUtil.isNoU(select) ) 
                select = selectedChartType;

            selectedChartType = select;

            for ( i = 0; i < types.length; i++ ) {
                type = types[i];

                btngrp.add({
                    id: type.id,
                    label: type.label,
                    selected: type.id === select ? true : null,
                    onclick: type.id === select ? null : clickedBtn
                });
            }

            var btns = document.getElementById(chartButtonsId);

            if ( btns !== null )
                btns.parentNode.removeChild(btns);

            btns = btngrp.build();

            btns.id = chartButtonsId;

            chartOptionsBody.appendChild(btns);

            function clickedBtn(btn) {
                btns.parentNode.removeChild(btns);

                renderChartButtons(btn.id);

                if ( btn.id === "commits" )
                    renderChart();
                else if ( btn.id === "codechurn" )
                    renderChart();
                else
                    throw("GitSense Error: Unrecognized button id '"+btn.id+"'");
            }
        }

        function renderSearchInput() {
            var inputBuilder = 
                    new sdes.github.ui.input.search({
                        align: "right",
                        value: page.searchArgs.join(" "),
                        disable: true,
                        icon: "octicon-x",
                        onenter: clicked
                    }),
                search = inputBuilder.build();
    
            navAndSearchBody.appendChild(search);

            function clicked() {
                window.location.href = window.location.href.split(/\?/)[0];
            }
        }

        function renderSearchResults(commitTimeToCommitIds, commitIdToBranches) {
            if ( commitIdToBranches === undefined ) {
                mapCommitIds(renderSearchResults);
                return;
            }

            $(searchResultsBody).html("");

            var matchingCommitsBody = 
                    htmlUtil.createDiv({ 
                        id: "matchingCommitsBody",
                        style: {
                            display: "none"
                        }
                    }),
                matchingCommitsBodyCommits =
                    htmlUtil.createDiv({
                        id: "commits",
                        cls: "commits-listing commits-listing-padded "+
                             "js-navigation-container js-active-navigation-container"
                    }),
                matchingCommitsBodyPagination =
                    htmlUtil.createDiv({
                        id: "pagination",
                        cls: "paginate-container"
                    }),
                tabsBody = 
                    htmlUtil.createDiv({
    
                    }),
                tabs = [
                    {
                        id: "commits",
                        label: "Commits",
                        total: null,
                    }
                ],
                commitsData = 
                    new sdes.gitsense.data.commits(
                        host, 
                        page.owner, 
                        page.repo
                    ),
                branchToBuilder = {},
                commitTimes     = getCommitTimes(),
                lastTimeIndex   = commitTimes.length - 1,
                timesPerPage    = 30,
                selectedTab     = "commits",
                renderToWidth   = Math.floor(100/selectedBranches.length)+"%",
                searchArgs,
                branch,
                renderToShell,
                renderTo,
                builder,
                i;

            renderTabs();

            matchingCommitsBody.appendChild(matchingCommitsBodyCommits);
            matchingCommitsBody.appendChild(matchingCommitsBodyPagination);

            searchResultsBody.appendChild(tabsBody);
            searchResultsBody.appendChild(matchingCommitsBody);

            if ( commitTimes.length === 0 )
                return;

            commitTimes.sort(function(a,b){return b - a;});

            var row   = htmlUtil.createTableRow({}),
                table = htmlUtil.createTable({ append: row }),
                cell;

            matchingCommitsBodyCommits.appendChild(table);

            selectedBranches.sort();

            for ( i = 0; i < selectedBranches.length; i++ ) {
                branch = selectedBranches[i];

                renderTo = 
                    htmlUtil.createDiv({
                        style: {
                            paddingLeft: i !== 0 && selectedBranches.length > 1 ? "5px" : null,
                            width: "100%"
                        }
                    });

                cell = 
                    htmlUtil.createTableCell({
                        append: renderTo,
                        style: {
                            width: selectedBranches.length === 1 ? null : renderToWidth,
                            display: "table-cell",
                            verticalAlign: "top"
                        }
                    });

                row.appendChild(cell);

                branchToBuilder[branch] =
                    new sdes.github.ui.commits(
                        page.owner,
                        page.repo,
                        renderTo,
                        ( i !== 0 ? 0 : null)
                    );

                renderCommits(branch, 1);
            }

            function renderTabs() {
                var tabBuilder = new sdes.github.ui.tabs(),
                    tab,
                    i;

                for ( i = 0; i < tabs.length; i++ ) {
                    tab = tabs[i];

                    tabBuilder.add({
                        id: tab.id,
                        html: tab.label,
                        selected: tab.id === selectedTab ? true : false,
                        onclick: clicked
                    });
                }

                $(tabsBody).html("");
    
                tabsBody.appendChild(tabBuilder.build());

                $(tabBuilder.getRightTab()).html(
                    "<span style='color:#999'>"+
                        "Merge commits with no changes are not shown"+
                    "</span>"
                );

                function clicked(id, tab) {
                    selectedTab = id;
                    
                    switch(id) {
                        case "commits":
                            $(matchingCommitsBody).show();
                            break;
                        default:
                            throw("GitSense: Unrecognized tab type '"+id+"'");
                    }

                    renderTabs();
                }
            }
    
            function renderCommits(branch, page, commits, more) {
                if ( commits === undefined ) {
                    getPageCommits(
                        page,
                        function(commits, more) {
                            renderCommits(branch, page, commits, more);
                        }
                    );

                    return;
                }

                $(matchingCommitsBody).show();
   
                if ( commits.length === 0 )
                    return;

                var builder = branchToBuilder[branch],
                    commit,
                    branches,
                    opacity,
                    i,
                    j;

                for ( i = 0; i < commits.length; i++ ) {
                    commit   = commits[i];
                    branches = commitIdToBranches[commit.id];
                    opacity  = 0;
    
                    for ( j = 0; j < branches.length; j++ ) {
                        if ( branches[j] !== branch )
                            continue;
    
                        opacity = 1;
                        break;
                    }
                    
                    commit.title = 
                        commit.title.
                            replace(/</g, "&lt;").
                            replace(/>/g, "&gt;");
    
                    commit.message = 
                        commit.message.
                            replace(/</g, "&lt;").
                            replace(/>/g, "&gt;");
    
                    builder.add(
                        commit,
                        { 
                            showMsg: false, 
                            target: "_blank", 
                            branches: 
                                "<span class='octicon octicon-git-branch' "+
                                    "style='margin-right:5px;'></span>"+
                                "<span style='font-weight:bold'>"+
                                    branch+
                                    //getBranchesHtml(branches, onBranch)+
                                "</span>",
                            opacity: opacity,
                            titleStyle: {
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                            },
                            authorStyle: {
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                            }
                        }
                    );
                }

                function getBranchesHtml(branches, onBranch) {
                    if ( selectedBranches.length === 1 )
                        return branches[0];

                    var i,
                        branch;

                    for ( i = 0; i < selectedBranches.length; i++ ) {
                        branch = selectedBranches[i];

                        if ( selected[branch] )
                            temp.push(branch);
                        else
                            temp.push("<strike>"+branch+"</strike>");
                    }

                    return temp.join(", &nbsp;");
                }
    
                function renderPagination() {
                    var pagination = matchingCommitsBodyPagination;

                    if ( ! more ) {
                        matchingCommitsBody.removeChild(pagination);
                        return;
                    }

                    $(pagination).html(
                        "<div class='pagination'>"+
                            "<a style='cursor-pointer'>"+
                                "Show more"+
                            "</a>"+
                        "</div>"
                    );

                    pagination.onclick = function() {
                        // Fixme: Need to implement this
                        console.log("GitSense: Yeah we still need to implement this");
                    }
                }
            }

            function getPageCommits(page, callback) {
                var start = (page - 1) * timesPerPage,

                    end = 
                        commitTimes.length < timesPerPage || 
                        start + timesPerPage - 1 >= commitTimes.length ?
                            commitTimes.length :
                            timesPerPage * page,

                    times = commitTimes.slice(start, end),
                    ids   = [],
                    temp,
                    i,
                    j;


                for ( i = 0; i < times.length; i++ ) {
                    temp = commitTimeToCommitIds[times[i]];

                    for ( j = 0; j < temp.length; j++ )
                        ids.push(temp[j]);
                }

                commitsData.mapById(
                    ids, 
                    function(idToCommit, error) {
                        if ( error !== undefined )
                            throw(error);

                        var commits = [],
                            commit,
                            i;

                        for ( i = 0; i < ids.length; i++ ) {
                            commit = idToCommit[ids[i]];

                            if ( commit === undefined )
                                throw("GitSense: Unable to find a commit with the id '"+ids[i]+"'");

                            commits.push(commit);
                        }

                        callback(commits, (end === commitTimes.length) ? false : true);
                    }
                );
            }

            function getCommitTimes() {
                var times = [],
                    time;

                for ( time in commitTimeToCommitIds )
                    times.push(time);

                return times;
            }
        }

        function renderNoIndexedHead(branch) {
            // FIXME: Still need to implement this
            console.log("GitSense: Still need to implement this");
        }

        function defineBranchToChartsData(callback) {
            var ready         = true,
                stopWaitingAt = new Date().getTime() + 1000 * 10,
                stopWaiting   = false,
                branch,
                i;

            for ( i = 0; i < selectedBranches.length; i++ ) {
                branch = selectedBranches[i];

                if ( branchToChartsData[branch] !== undefined )
                    continue;

                ready = false;
            
                getPoints(branch);
            }

            if ( ready ) {
                callback(true);
                return;
            }

            $(chartsBody).html(
                "<table style='width:100%;height:100%'>"+
                    "<tr>"+
                        "<td style='width:100%;text-align:center;'>"+
                            "Loading"+
                        "</td>"+
                    "</tr>"+
                "</table>"
            );

            setTimeout(wait, 100);

            function wait() {
                if ( stopWaiting )
                    return;

                var readyToProcessPoints = true,
                    i, 
                    branch;

                for ( i = 0; i < selectedBranches.length; i++ ) {
                    branch = selectedBranches[i];

                    if ( branchToPoints[branch] !== undefined )
                        continue;

                    readyToProcessPoints = false;
                    break;
                }

                if ( readyToProcessPoints )
                    processPoints();
                else if ( new Date().getTime() < stopWaitingAt )
                    setTimeout(wait, 100);
                else
                    throw("GitSense Error: Stopped waiting for chart information");
            }
            
            function getPoints(branch) {
                var head = branchToHead[branch];

                if ( head === undefined ) 
                    throw("GitSense: No branch head information for the branch "+branch);

                var bhdata =  
                    new sdes.gitsense.data.branch.heads(
                        host, 
                        page.owner, 
                        page.repo, 
                        branch
                    );

                if ( head.indexedCodeChurn ) {
                    bhdata.getCodeChurnPoints(
                        head.sha,
                        function(points, error) {
                            if ( error !== undefined ) {
                                stopWaiting = true;
                                throw(error);
                            }

                            branchToPoints[branch] = points;
                        },
                        page.searchArgs,
                        96
                    );
                } else {
                    bhdata.getCommitPoints(
                        head.sha,
                        function(points, error) {
                            if ( error !== undefined ) {
                                stopWaiting = true;

                                if ( error.responseText.match(/No index information/) ) {
                                    renderNoIndexedHead(branch);
                                    return;
                                }

                                throw(error);
                            }

                            branchToPoints[branch] = points;
                        },
                        page.searchArgs,
                        96
                    );
                }
            }

            function processPoints() {
                var branchToYmdToPoint = {},
                    today = dateUtil.timeToYearMonthDay(null, true),
                    minDate,
                    date,
                    branch,
                    points,
                    i;

                for ( i = 0; i < selectedBranches.length; i++ ) {
                    branch = selectedBranches[i];
                    points = branchToPoints[branch];

                    branchToYmdToPoint[branch] = mapBranchPoints(branchToPoints[branch]);
                    branchToChartsData[branch] = [];

                    if ( points.length === 0 )
                        continue;

                    date = new Date(points[0].label);

                    if ( minDate === undefined )
                        minDate = date;
                    else if ( date.getTime() < minDate.getTime() )
                        minDate = date;
                }

                // Fixme: We shouln't even be here if minDate is undefined
                if ( minDate === undefined )
                    return;

                // Make sure min date is not in the future.  With Git, you can set the
                // time to anything and it's just going to cause havoc with the while
                // loop below.
                if ( minDate.getTime() > new Date(today).getTime() )
                    throw("GitSense Error: The earliest commit date is greater than today");

                var loops = 0,
                    maxLoops = 100000,
                    format   = d3.time.format("%Y-%m-%d"),
                    data,
                    point,
                    churn,
                    time,
                    year,
                    month,
                    day,
                    ymd,
                    ymdToPoint;

                while ( true && loops < maxLoops ) {
                    year  = minDate.getFullYear();
                    month = minDate.getMonth()+1;
                    day   = minDate.getDate();
                    time  = minDate.getTime();

                    if ( day < 10 ) day = "0"+day;

                    if ( month < 10 ) month = "0"+month;

                    ymd = year+"-"+month+"-"+day;

                    for ( i = 0; i < selectedBranches.length; i++ ) {
                        branch     = selectedBranches[i];
                        ymdToPoint = branchToYmdToPoint[branch];
                        point      = ymdToPoint[ymd] === undefined ? getEmptyPoint() : ymdToPoint[ymd];
                        data       = branchToChartsData[branch];
                        churn      = branchToChartsData[branch].churn;

                        data.push({ 
                            label: ymd,
                            day: d3.time.day(format.parse(ymd)),
                            week: d3.time.week(format.parse(ymd)),
                            month: d3.time.month(format.parse(ymd)),
                            commits: point.commits,
                            codechurn: point.churn === undefined ? 0 : point.churn.loc.total
                        });
                    }

                    if ( ymd === today )
                        break;

                    minDate = dateUtil.addDaysToDate(minDate, 1);

                    loops ++;
                }

                if ( loops === maxLoops )
                    console.log("GitSense: Warning, exceeded max loops "+maxLoops);

                callback(true);

                function mapBranchPoints(points) {
                    var i,
                        point,
                        ymdToPoint = {};

                    for ( i = 0; i < points.length; i++ ) {
                        point = points[i];
                        ymdToPoint[point.label] = point;
                    }

                    return ymdToPoint;
                }

                function getEmptyPoint() {
                    return {
                        commits: 0,
                        churn: {
                            loc: {
                                total: 0,
                                add: 0,
                                chg: 0,
                                del: 0
                            },
                            sloc: {
                                total: 0,
                                add: 0,
                                chg: 0,
                                del: 0
                            }
                        }
                    };
                }
            }
        }

        function mapCommitIds(callback) {
            var i,
                branch,
                waitForCommitIds = false;

            for ( i = 0; i < selectedBranches.length; i++ ) {
                branch = selectedBranches[i];

                if ( branchToCommitIds[branch] !== undefined )
                    continue;

                waitForCommitIds = true;

                getOrderedCommitIds(branch);
            }

            var stopAt = new Date().getTime() + 5000;

            if ( waitForCommitIds )
                wait();
            else
                ready();

            function wait() {
                if ( new Date().getTime() > stopAt )
                    throw("GitSense: We've given up on waiting for the ordered commit ids");

                var i,
                    branch,
                    waitForCommitIds = false;

                for ( i = 0; i < selectedBranches.length; i++ ) {
                    branch = selectedBranches[i];

                    if ( branchToCommitIds[branch] !== undefined )
                        continue;

                    waitForCommitIds = true;
                    break; 
                }

                if ( waitForCommitIds )
                    setTimeout(wait, 100);
                else
                    ready();
            }

            function getOrderedCommitIds(branch) {
                var head = branchToHead[branch];

                if ( head === undefined || ! head.indexed )
                    throw("GitSense: Unable to find an indexed branch head for "+branch);

                new sdes.gitsense.data.branch.heads(
                    host,
                    page.owner,
                    page.repo,
                    branch
                ).getOrderedCommitIds(
                    head.sha,
                    processResults,
                    page.searchArgs
                );

                function processResults(ids, error) {
                    if ( error !== undefined )
                        throw(error);

                    branchToCommitIds[branch] = ids;
                }
            }

            function ready() {
                var commitTimeToCommitIds = {},
                    commitIdToBranches    = {},
                    branch,
                    time,
                    entries,
                    ids,
                    id,
                    i,
                    j,
                    k;
   
                for ( i = 0; i < selectedBranches.length; i++ ) { 
                    branch  = selectedBranches[i];
                    entries = branchToCommitIds[branch];

                    for ( j = 0; j < entries.length; j++ ) {
                        id   = entries[j][0];
                        time = entries[j][1];

                        if ( commitTimeToCommitIds[time] === undefined )
                            commitTimeToCommitIds[time] = [ id ];

                        if ( commitIdToBranches[id] === undefined )
                            commitIdToBranches[id] = [branch];
                        else
                            commitIdToBranches[id].push(branch);

                        ids = commitTimeToCommitIds[time];

                        if ( ids.length === 1 || ids[0] === id || ids[ids - 1] === id )
                            continue;

                        for ( k = 1; k < ids.length; k++ ) {
                            if ( ids[k] === id )
                                break;
                        }

                        if ( k === ids.length )
                            ids.push(id);
                    }
                }
        
                callback(commitTimeToCommitIds, commitIdToBranches);
            }
        }
    }
}
