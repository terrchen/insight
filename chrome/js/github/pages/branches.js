// Since GitHub uses push state, you'll find a bunch of code here
// that tests if something exists and removes it, if it does.
// There is probably a better way to do things, but for now we'll
// go with this, so don't be surprised if you find things getting
// deleted for no apparent reason.

sdes.github.pages.branches = function(rule, page) {
    "use strict";

    var host     = rule.gitsense.hostId,
        htmlUtil = new sdes.utils.html(),
        dateUtil = new sdes.utils.date(),
        varUtil  = new sdes.utils.variable(),

        bhdata = new sdes.gitsense.data.branch.heads(
            host, 
            page.owner, 
            page.repo
        ),

        idPrefix = "id"+CryptoJS.MD5(
            page.owner+":"+page.repo+":branches"
        ),

        chartsBodyId            = idPrefix+"-charts",
        chartSettingsBodyId     = idPrefix+"-chart-settings",
        chartTypesButtonsId     = idPrefix+"-chart-types-buttons",
        chartDateRangeButtonsId = idPrefix+"-chart-groupings-buttons",
        navAndSearchBodyId      = idPrefix+"-nav-and-search",
        searchResultsBodyId     = idPrefix+"-search-results",
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
                chartSettingsBodyId,
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
        var branchToRangeToTypeToData      = {},
            branchToRangeToTypeToRawPoints = {},
            branchToSearchToCommitIds      = {},
            rangeToTypeToBranchesToMinMaxY = {},
            commitIdToCommit               = {},
            commitIdToBranches             = {},
            selectedBranches               = [],
            isSelected                     = {},
            commitsLayout                  = "row",
            selectedChartType              = "commits",
            selectedChartRange             = "1month",
            branchGroupsBody     = document.getElementsByClassName("branch-groups")[0],
            branchesViewSwitcher = document.getElementsByClassName("branches-view-switcher")[0],
            branchSearchInput    = document.getElementsByClassName("branch-search")[0],
            chartsBody,
            chartSettingsBody,
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
            renderChartTypeButtons();
            renderChartRangeButtons();
            renderLineChart();
            return;
        }

        renderNavigator();
        renderSearchInput(page.searchArgs);
        renderSearchResults(page.searchArgs);

        function renderLayout() {
            chartsBody = document.getElementById(chartsBodyId);
            chartSettingsBody = document.getElementById(chartSettingsBodyId);

            if ( chartsBody !== null )
                chartsBody.parentNode.removeChild(chartsBody);

            if ( chartSettingsBody !== null )
                chartSettingsBody.parentNode.removeChild(chartSettingsBody);

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

            chartSettingsBody = htmlUtil.createDiv({
                    id: chartSettingsBodyId,
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
                        display: "none"
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

            pageHeaderBody.parentNode.insertBefore(chartSettingsBody, pageHeaderBody);
            pageHeaderBody.parentNode.insertBefore(chartsBody, pageHeaderBody);
            pageHeaderBody.parentNode.insertBefore(navAndSearchBody, pageHeaderBody);
            pageHeaderBody.parentNode.insertBefore(searchResultsBody, pageHeaderBody);
        }

        function renderLineChart(ready) {
            if ( ready === undefined && selectedBranches.length !== 0 ) {
                defineChartData(renderLineChart);
                return;
            }

            $(chartsBody).html("");

            if ( selectedBranches.length === 0 )
                return;

            var branchToGroup = {},
                branchToDays  = {},
                range         = selectedChartRange,
                type          = selectedChartType,
                branches      = JSON.stringify(selectedBranches),
                minMaxY       = rangeToTypeToBranchesToMinMaxY[range][type][branches],
                minY          = minMaxY.min,
                maxY          = minMaxY.max,
                chartHeight   = $(chartsBody).height() - 60,
                yRatio        = (maxY - minY)/chartHeight,
                yOffset       = Math.floor(20 * yRatio),
                chartsData,
                branch,
                group,
                data,
                days,
                i;

            maxY += yOffset;
            minY -= yOffset;

            for ( i = 0; i < selectedBranches.length; i++ ) {
                branch     = selectedBranches[i];
                chartsData = branchToRangeToTypeToData[branch][range][type];

                days = 
                    crossfilter(chartsData).dimension(
                        function(d){ 
                            return d.day; 
                        }
                    );
    
                group = 
                    days.group().reduceSum(
                        function(d) {
                            return d[type];
                        }
                    );

                branchToGroup[branch] = group;
                branchToDays[branch]  = days;
            }

            branch     = selectedBranches[0];
            group      = branchToGroup[branch];
            days       = branchToDays[branch];
            chartsData = branchToRangeToTypeToData[branch][range][type];

            var grouping   = getGrouping(),
                daysOffset = grouping === "monthly" || grouping === "weekly" ? 15 : 1,

                firstDay = 
                    d3.time.day(
                        d3.time.day.offset(chartsData[0].day, -daysOffset)
                    ),

                lastDay = 
                    d3.time.day(
                        d3.time.day.offset(chartsData[chartsData.length - 1].day, daysOffset)
                    ),

                lineChart  = dc.compositeChart(chartsBody),
                lineCharts = [],
                colors     = d3.scale.category10(),
                left       = type === "codechurn" || type === "loc" ? 70 : 50;

            lineChart.width( $(chartsBody).width() )
                .height( $(chartsBody).height() )
                .margins({ 
                    top: 20, 
                    bottom: 35, 
                    left: left,
                    right: 20
                })
                .dimension(days)
                .valueAccessor(function(d){ return d.value; })
                .brushOn(false)
                .y(d3.scale.linear().domain([minY, maxY]))
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

            lineChart.selectAll(".dot")
                .style("cursor", "pointer")
                .on(
                    "click", 
                    function(e,x) {
                        var grouping = getGrouping(),
                            date     = getDateLabel(grouping, e.data.key),
                            args     = [];

                        switch(grouping) {
                            case "daily":
                                args.push("day:"+date);
                                break;
                            case "weekly":
                                args.push("week:"+date);
                                break;
                            case "monthly":
                                args.push("month:"+date);
                                break;
                            default:
                                throw("GitSense: Unrecognized date grouping '"+grouping+"'");
                        }

                        renderChartRangeButtons(range, true);
                        renderChartTypeButtons(type, true);

                        $(branchGroupsBody).hide();

                        renderNavigator("search", true);
                        renderSearchInput(args);
                        renderSearchResults(args);
                        $(searchResultsBody).show();
                    }
                );
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
                        if ( selectedChartType === "commits" )
                            renderLineChart();
                        else if ( selectedChartType === "codechurn" )
                            renderLineChart();
                        else if ( selectedChartType === "loc" )
                            renderLineChart();
                        else if ( selectedChartType === "unique" )
                            reset();
                        else
                            throw("GitSense: Unrecognized chart type '"+selectedChartType+"'");
                            
                        renderChartTypeButtons();
                    } else {
                        renderSearchResults(page.searchArgs);
                    }

                    function reset() {
                        selectedChartType = "commits";
                        renderLineChart();
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

        function renderNavigator(select, hideSelectBranches) {
            if ( varUtil.isNoU(hideSelectBranches) )
                hideSelectBranches = false;

            $(branchesViewSwitcher).hide();
            $(branchSearchInput).hide();
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
                    show: type.id === "branches" && hideSelectBranches ? false : true
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

        function renderChartRangeButtons(select, disableAllExceptSelected) {
            if ( varUtil.isNoU(disableAllExceptSelected) )
                disableAllExceptSelected = false;
 
            var types = [
                    { id: "2weeks", label: "2 weeks" },
                    { id: "1month", label: "1 month" },
                    { id: "3months", label: "3 months" },
                    { id: "1year", label: "1 year" },
                    { id: "5years", label: "5 years" }
                ], 
                btngrp = new sdes.github.ui.btngrp({ align: "left" }),
                selected,
                type,
                i;

            if ( varUtil.isNoU(select) ) 
                select = selectedChartRange;

            selectedChartRange = select;

            for ( i = 0; i < types.length; i++ ) {
                type = types[i];

                selected = type.id === select ? true : false;

                btngrp.add({
                    id: type.id,
                    label: type.label,
                    selected: selected,
                    disabled: selected || ! disableAllExceptSelected ? false : true,
                    onclick: selected || disableAllExceptSelected ? null : clickedBtn
                });
            }

            var btns = document.getElementById(chartDateRangeButtonsId);

            if ( btns !== null )
                btns.parentNode.removeChild(btns);

            btns = btngrp.build();

            btns.id = chartDateRangeButtonsId;

            chartSettingsBody.appendChild(btns);

            function clickedBtn(btn) {
                btns.parentNode.removeChild(btns);
                renderChartRangeButtons(btn.id);

                switch(selectedChartType) {
                    case "commits":
                        renderLineChart();
                        break;
                    case "loc":
                        renderLineChart();
                        break;
                    case "codechurn":
                        renderLineChart();
                        break;
                    case "unique":
                        selectedChartType = "commits";
                        renderChartTypeButtons();
                        renderLineChart();
                        break;
                    default:
                        throw("GitSense: Unrecognized chart type '"+selectedChartType+"'");
                }
            }
        }

        function renderChartTypeButtons(select, disableAllExceptSelected) {
            if ( varUtil.isNoU(disableAllExceptSelected) )
                disableAllExceptSelected = false;
 
            var types         = [ { id: "commits", label: "Commits"} ],
                btngrp        = new sdes.github.ui.btngrp({ align: "right" }),
                showLoCs      = selectedBranches.length === 0 ? false : true,
                showCodeChurn = selectedBranches.length === 0 ? false : true,
                selected, 
                head,
                type,
                i;

            for ( i = 0; i < selectedBranches.length; i++ ) {
                head = branchToHead[selectedBranches[i]];

                if ( head.builtCodeChurn )
                    continue;

                showCodeChurn = false;
                break;
            }

            for ( i = 0; i < selectedBranches.length; i++ ) {
                head = branchToHead[selectedBranches[i]];

                if ( head.builtLoCs )
                    continue;

                showLoCs = false;
                break;
            }

            if ( selectedBranches.length == 2 )
                types.push({ id: "unique", label: "Unique"});

            if ( showLoCs )
                types.push({id: "loc", label: "Lines of Code"});

            if ( showCodeChurn )
                types.push({id: "codechurn", label: "Code Churn"});

            if ( varUtil.isNoU(select) ) 
                select = selectedChartType;

            selectedChartType = select;

            for ( i = 0; i < types.length; i++ ) {
                type     = types[i];
                selected = type.id === select ? true : false;

                btngrp.add({
                    id: type.id,
                    label: type.label,
                    selected: type.id === select ? true : null,
                    selected: selected,
                    disabled: selected || ! disableAllExceptSelected ? false : true,
                    onclick: selected || disableAllExceptSelected ? null : clickedBtn
                });
            }

            var btns = document.getElementById(chartTypesButtonsId);

            if ( btns !== null )
                btns.parentNode.removeChild(btns);

            btns = btngrp.build();

            btns.id = chartTypesButtonsId;

            chartSettingsBody.appendChild(btns);

            function clickedBtn(btn) {
                btns.parentNode.removeChild(btns);

                renderChartTypeButtons(btn.id);

                if ( btn.id === "commits" || btn.id === "unique")
                    renderLineChart();
                else if ( btn.id === "codechurn" )
                    renderLineChart();
                else if ( btn.id === "loc" )
                    renderLineChart();
                else
                    throw("GitSense Error: Unrecognized button id '"+btn.id+"'");
            }
        }

        function renderSearchInput(args) {
            if ( args === undefined )
                args = [];

            if ( ! varUtil.isNoU(searchInput) )
                searchInput.parentNode.removeChild(searchInput);

            var inputBuilder = 
                    new sdes.github.ui.input.search({
                        isEnterprise: 
                            rule.host.type === "github-enterprise" ? 
                                true : false,
                        align: "right",
                        value: args.join(" "),
                        disable: true,
                        icon: "octicon-x",
                        onenter: clicked
                    });

            searchInput = inputBuilder.build();
    
            navAndSearchBody.appendChild(searchInput);

            function clicked() {
                if ( ! varUtil.isNoU(page.searchArgs) ) {
                    window.location.href = window.location.href.split(/\?/)[0];
                    return;
                }

                searchInput.parentNode.removeChild(searchInput);

                searchInput = null;

                $(searchResultsBody).html("");

                renderChartRangeButtons(selectedChartRange);
                renderChartTypeButtons(selectedChartType);
 
                $(navAndSearchBody).hide();
                $(searchResultsBody).hide();

                $(branchesViewSwitcher).show();
                $(branchSearchInput).show();
                $(branchGroupsBody).show();
            }
        }

        function renderSearchResults(args, commitTimeToCommitIds, commitIdToBranches) {
            if ( commitIdToBranches === undefined ) {
                mapCommitIds(args, renderSearchResults);
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
                        rule,
                        page.owner,
                        page.repo,
                        renderTo, 
                        {
                            groupHeaderOpacity: i === 0 ? null : 0
                        }
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
                        "Empty merge commits excluded"+
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

                if ( more )
                    renderPagination();
                else
                    $(matchingCommitsBodyPagination).html("");

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
                        for ( var i = 0; i < selectedBranches.length; i++ ) {
                            var branch = selectedBranches[i];

                            renderCommits(branch, (page+1) );
                        }
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

        function defineChartData(callback) {
            var ready         = true,
                range         = selectedChartRange,
                type          = selectedChartType,
                stopWaitingAt = new Date().getTime() + 1000 * 10,
                stopWaiting   = false,
                branch,
                i;
    
            for ( i = 0; i < selectedBranches.length; i++ ) {
                branch = selectedBranches[i];

                if (
                    branchToRangeToTypeToData[branch] !== undefined &&
                    branchToRangeToTypeToData[branch][range] !== undefined &&
                    branchToRangeToTypeToData[branch][range][type] !== undefined 
                ) {
                    continue;
                }

                ready = false;
            
                getPoints(branch);
            }

            if ( ready ) {
                processRawPoints();
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

                var readyToProcessRawPoints = true,
                    branch,
                    i;

                for ( i = 0; i < selectedBranches.length; i++ ) {
                    branch = selectedBranches[i];
                    
                    if ( 
                        branchToRangeToTypeToRawPoints[branch] !== undefined &&
                        branchToRangeToTypeToRawPoints[branch][range] !== undefined &&
                        branchToRangeToTypeToRawPoints[branch][range][type] !== undefined
                    ) {
                        continue;
                    }

                    readyToProcessRawPoints = false;
                    break;
                }

                if ( readyToProcessRawPoints )
                    processRawPoints();
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

                switch(type) {
                    case "commits":
                        bhdata.getCommitPoints({
                            head: head.sha,
                            grouping: getGrouping(),
                            maxPoints: getMaxPoints(),
                            callback: function(points, error) {
                                if ( error !== undefined ) {
                                    stopWaiting = true;

                                    if ( error.responseText.match(/No index information/) ) {
                                        renderNoIndexedHead(branch);
                                        return;
                                    }

                                    throw(error);
                                }

                                if ( branchToRangeToTypeToRawPoints[branch] === undefined )
                                    branchToRangeToTypeToRawPoints[branch] = {};
    
                                var rangeToTypeToRawPoints = branchToRangeToTypeToRawPoints[branch];

                                if ( rangeToTypeToRawPoints[range] === undefined )
                                    rangeToTypeToRawPoints[range] = {};

                                var typeToRawPoints = rangeToTypeToRawPoints[range];

                                if ( typeToRawPoints === undefined )
                                    typeToRawPoints = {};

                                typeToRawPoints[type] = points;
                            }
                        });

                        break;
                    case "codechurn":
                        bhdata.getCodeChurnPoints({
                            head: head.sha,
                            grouping: getGrouping(),
                            maxPoints: getMaxPoints(),
                            callback: function(points, error) {
                                if ( error !== undefined ) {
                                    stopWaiting = true;

                                    if ( error.responseText.match(/No index information/) ) {
                                        renderNoIndexedHead(branch);
                                        return;
                                    }

                                    throw(error);
                                }

                                if ( branchToRangeToTypeToRawPoints[branch] === undefined )
                                    branchToRangeToTypeToRawPoints[branch] = {};
    
                                var rangeToTypeToRawPoints = branchToRangeToTypeToRawPoints[branch];

                                if ( rangeToTypeToRawPoints[range] === undefined )
                                    rangeToTypeToRawPoints[range] = {};

                                var typeToRawPoints = rangeToTypeToRawPoints[range];

                                if ( typeToRawPoints === undefined )
                                    typeToRawPoints = {};

                                typeToRawPoints[type] = points;
                            }
                        });

                        break;
                    case "loc":
                        bhdata.getLoCPoints({
                            head: head.sha,
                            grouping: getGrouping(),
                            maxPoints: getMaxPoints(),
                            callback: function(points, error) {
                                if ( error !== undefined ) {
                                    stopWaiting = true;

                                    if ( error.responseText.match(/No index information/) ) {
                                        renderNoIndexedHead(branch);
                                        return;
                                    }

                                    throw(error);
                                }

                                if ( branchToRangeToTypeToRawPoints[branch] === undefined )
                                    branchToRangeToTypeToRawPoints[branch] = {};
    
                                var rangeToTypeToRawPoints = branchToRangeToTypeToRawPoints[branch];

                                if ( rangeToTypeToRawPoints[range] === undefined )
                                    rangeToTypeToRawPoints[range] = {};

                                var typeToRawPoints = rangeToTypeToRawPoints[range];

                                if ( typeToRawPoints === undefined )
                                    typeToRawPoints = {};

                                typeToRawPoints[type] = points;
                            }
                        });

                        break;
                    case "unique":
                        var otherHead =
                                selectedBranches[0] === branch ?
                                    branchToHead[selectedBranches[1]] :
                                    branchToHead[selectedBranches[0]];

                        bhdata.getCommitPoints({
                            head: head.sha,
                            grouping: getGrouping(),
                            maxPoints: getMaxPoints(),
                            notIn: otherHead.sha,
                            callback: function(points, error) {
                                if ( error !== undefined ) {
                                    stopWaiting = true;

                                    if ( error.responseText.match(/No index information/) ) {
                                        renderNoIndexedHead(branch);
                                        return;
                                    }

                                    throw(error);
                                }

                                if ( branchToRangeToTypeToRawPoints[branch] === undefined )
                                    branchToRangeToTypeToRawPoints[branch] = {};
    
                                var rangeToTypeToRawPoints = branchToRangeToTypeToRawPoints[branch];

                                if ( rangeToTypeToRawPoints[range] === undefined )
                                    rangeToTypeToRawPoints[range] = {};

                                var typeToRawPoints = rangeToTypeToRawPoints[range];

                                if ( typeToRawPoints === undefined )
                                    typeToRawPoints = {};

                                typeToRawPoints[type] = points;
                            }
                        });

                        break;                           
                    default:
                        throw("GitSense: Unrecognized chart type '"+type+"'");
                }
            }

            function processRawPoints() {
                var format = getDateFormat(),
                    type   = selectedChartType,
                    range  = selectedChartRange,
                    minDate,
                    maxDate,
                    date,
                    branch,
                    points,
                    i;

                // Iterate through all the selected branches to find
                // the min and max date.  Since the GitSense returns the 
                // points in chronological order, we just need to look
                // at the first and last array element
                for ( i = 0; i < selectedBranches.length; i++ ) {
                    branch = selectedBranches[i];
                    points = branchToRangeToTypeToRawPoints[branch][range][type];

                    if ( points === undefined || points.length === 0 )
                        continue;  

                    // The d3 format.parse function will return a date object
                    date = format.parse(points[0].label);

                    if ( maxDate === undefined )
                        maxDate = date;
                    else if ( date.getTime() > maxDate.getTime() )
                        maxDate = date;

                    date = format.parse(points[ points.length - 1 ].label);

                    if ( minDate === undefined )
                        minDate = date;
                    else if ( date.getTime() < minDate.getTime() )
                        minDate = date;
                }

                if ( varUtil.isNoU(minDate) ) {
                    $(chartsBody).html(
                        "<table style='width:100%;height:100%'>"+
                            "<tr>"+
                                "<td style='width:100%;text-align:center;'>"+
                                    "No activity for this date range"+
                                "</td>"+
                            "</tr>"+
                        "</table>"
                    );

                    // No points were found
                    return;
                }

                // Make sure min date is not in the future.  With Git, you can set the
                // time to anything and it's just going to cause havoc if we need to 
                // padd the days
                if ( minDate.getTime() > new Date().getTime() )
                    throw("GitSense: The earliest date is greater than now");

                // Initialize the has
                var branchToLabelToPoint = {},
                    labelToPoint,
                    point,
                    j;

                for ( i = 0; i < selectedBranches.length; i++ ) {
                    branch = selectedBranches[i];
                    points = branchToRangeToTypeToRawPoints[branch][range][type];

                    labelToPoint = {};

                    for ( j = 0; j < points.length; j++ ) {
                        point = points[j];
                        labelToPoint[point.label] = point;
                    }

                    branchToLabelToPoint[branch] = labelToPoint;

                    branchToRangeToTypeToData[branch] = {};
                    branchToRangeToTypeToData[branch][range] = {};
                    branchToRangeToTypeToData[branch][range][type] = [];
                }

                var branchToLast = {},
                    grouping     = getGrouping(),
                    stopAt       = getDateLabel(grouping, maxDate),
                    maxLoops     = 5 * 365,
                    loop         = 0,
                    minY,
                    maxY,
                    dateLabel,
                    data,
                    point,
                    churn,
                    codechurn,
                    loc,
                    unique,
                    commits;

                while ( loop < maxLoops ) {
                    dateLabel = getDateLabel(grouping, minDate);

                    for ( i = 0; i < selectedBranches.length; i++ ) {
                        branch = selectedBranches[i];
                        point  = branchToLabelToPoint[branch][dateLabel];
                        data   = branchToRangeToTypeToData[branch][range][type];

                        churn = {
                            loc: { total: 0, add: 0, chg: 0, del: 0 },
                            sloc: { total: 0, add: 0, chg: 0, del: 0 }
                        }

                        if ( point === undefined ) {
                            commits   = 0;
                            unique    = 0;
                            loc       = branchToLast[branch] === undefined ? 0 : branchToLast[branch].loc;
                            codechurn = 0;
                        } else {
                            commits = point.commits;
                            unique  = point.commits;
                            loc     = point.loc;

                            if ( point.churn !== undefined ) {
                                codechurn = point.churn.loc.total;
                                churn     = point.churn;
                            }

                            branchToLast[branch] = {
                                commits: commits,
                                unique: unique,
                                loc: loc,
                                codechurn: codechurn,
                                churn: churn
                            };
                        }

                        switch(type) {
                            case "commits":
                                if ( minY === undefined || commits < minY ) 
                                    minY = commits;

                                if ( maxY === undefined || commits > maxY ) 
                                    maxY = commits;

                                break; 
                            case "codechurn":
                                if ( minY === undefined || churn.loc.total < minY ) 
                                    minY = churn.loc.total;

                                if ( maxY === undefined || churn.loc.total > maxY ) 
                                    maxY = churn.loc.total;

                                break;
                            case "loc":
                                if ( minY === undefined || loc < minY ) 
                                    minY = loc;

                                if ( maxY === undefined || loc > maxY ) 
                                    maxY = loc;

                                break;
                            case "unique":
                                if ( minY === undefined || commits < minY ) 
                                    minY = commits;

                                if ( maxY === undefined || commits > maxY ) 
                                    maxY = commits;

                                break; 
                            default:
                                throw("GitSense: Unrecognized chart type '"+type+"'");
                        }

                        data.push({ 
                            label: dateLabel,
                            day: d3.time.day(format.parse(dateLabel)),
                            week: d3.time.week(format.parse(dateLabel)),
                            month: d3.time.month(format.parse(dateLabel)),
                            commits: commits,
                            codechurn: codechurn,
                            churn: churn,
                            loc: loc,
                            unique: unique
                        });
                    }

                    if ( dateLabel === stopAt )
                        break;

                    if ( grouping === "daily" )
                        minDate = d3.time.day.offset(minDate,1);
                    else if ( grouping === "weekly" )
                        minDate = d3.time.week.offset(minDate,1);
                    else if ( grouping === "monthly" )
                        minDate = d3.time.month.offset(minDate,1);

                    loop++;
                }

                // See if we need to padd any days. Basically, if the last point was over
                // a year ago, we want to fill in the days from last year to now.  And the
                // reason why we want to do this is want to make it very easily to see how
                // active/inactive the branch is.
                var nowDate  = new Date(),
                    nowTime  = nowDate.getTime(),
                    nowLabel = getDateLabel(grouping, nowDate),
                    maxTime  = maxDate.getTime(),
                    maxLabel = getDateLabel(grouping, maxDate);

                if ( 
                    type !== "loc" && 
                    type !== "codechurn" && 
                    maxLabel !== nowLabel && maxTime < nowTime 
                ) {
                    while ( maxLabel !== nowLabel )  {
                        for ( i = 0; i < selectedBranches.length; i++ ) {
                            branch = selectedBranches[i];
                            point  = branchToLabelToPoint[branch][dateLabel];
                            data   = branchToRangeToTypeToData[branch][range][type];

                            data.push({ 
                                label: maxLabel,
                                day: d3.time.day(maxDate),
                                week: d3.time.week(maxDate),
                                month: d3.time.month(maxDate),
                                commits: 0,
                                codechurn: 0,
                                churn: {
                                    loc: { total: 0, add: 0, chg: 0, del: 0 },
                                    sloc: { total: 0, add: 0, chg: 0, del: 0 }
                                },
                                loc: branchToLast[branch] === undefined ? 0 : branchToLast[branch].loc,
                                unique: 0
                            });
                        }

                        if ( grouping === "daily" )
                            maxDate = d3.time.day.offset(maxDate,1);
                        else if ( grouping === "weekly" )
                            maxDate = d3.time.week.offset(maxDate,1);
                        else if ( grouping === "monthly" )
                            maxDate = d3.time.month.offset(maxDate,1);

                        maxLabel = getDateLabel(grouping, maxDate);
                        maxTime  = maxDate.getTime();
                    }
                }

                var branches = JSON.stringify(selectedBranches);

                if ( rangeToTypeToBranchesToMinMaxY[range] === undefined )
                    rangeToTypeToBranchesToMinMaxY[range] = {};

                if ( rangeToTypeToBranchesToMinMaxY[range][type] === undefined )
                    rangeToTypeToBranchesToMinMaxY[range][type] = {};

                rangeToTypeToBranchesToMinMaxY[range][type][branches] = { 
                    min: minY, 
                    max: maxY 
                };

                callback(true);

                function getDateFormat() {
                    switch(selectedChartRange) {
                        case "2weeks":
                            return d3.time.format("%Y-%m-%d");
                        case "1month":
                            return d3.time.format("%Y-%m-%d");
                        case "3months":
                            return d3.time.format("%Y-%m-%d");
                        case "1year":
                            return d3.time.format("%Y-w%W");
                        case "5years":
                            return d3.time.format("%Y-%m");
                        default:
                            throw("GitSense: Unrecognized date range '"+selectedChartRange+"'");
                    }
                }

            }
        }

        function getGrouping() {
            switch(selectedChartRange) {
                case "2weeks":
                    return "daily";
                case "1month":
                    return "daily";
                case "3months":
                    return "daily";
                case "1year":
                    return "weekly";
                case "5years":
                    return "monthly";
                default:
                    throw("GitSense: Unrecognized date range '"+selectedChartRange+"'");
            }
        }

        function getMaxPoints() {
            switch(selectedChartRange) {
                case "2weeks":
                    return 14;
                case "1month":
                    return 30;
                case "3months":
                    return 90;
                case "1year":
                    return 52;
                case "5years":
                    return 60;
                default:
                    throw("GitSense: Unrecognized date range '"+selectedChartRange+"'");
            }
        }

        function getDateLabel(grouping, date) {
            var year  = date.getFullYear(),
                month = date.getMonth()+1,
                day   = date.getDate(),
                week  = d3.time.weekOfYear(date);

            if ( day < 10 ) day     = "0"+day;
            if ( week < 10 ) week   = "0"+week;
            if ( month < 10 ) month = "0"+month;

            if ( grouping === "daily" )
                return year+"-"+month+"-"+day;

            if ( grouping === "weekly" )
                return year+"-w"+week;

            if ( grouping === "monthly" )
                return year+"-"+month;

            throw("GitSense: Unrecognized grouping '"+grouping+"'");
        }

        function mapCommitIds(args, callback) {
            var waitForCommitIds = false,
                branch,
                search,
                i;
        
            for ( i = 0; i < selectedBranches.length; i++ ) {
                branch = selectedBranches[i];
                search = getSearchId(branch, args);

                if ( 
                    branchToSearchToCommitIds[branch] !== undefined &&
                    branchToSearchToCommitIds[branch][search] !== undefined 
                ) {
                    continue;
                }

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

                var waitForCommitIds = false;
                    branch,
                    search,
                    i;

                for ( i = 0; i < selectedBranches.length; i++ ) {
                    branch = selectedBranches[i];
                    search = getSearchId(branch, args);

                    if ( 
                        branchToSearchToCommitIds[branch] !== undefined &&
                        branchToSearchToCommitIds[branch][search] !== undefined
                    ) {
                        continue;
                    }

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

                var searchArgs = args;

                if ( selectedChartType === "unique" ) {
                    searchArgs = $.extend(true, [], args);
                    searchArgs.push(getNotIn());
                }

                var search = getSearchId(branch, args);

                new sdes.gitsense.data.branch.heads(
                    host,
                    page.owner,
                    page.repo,
                    branch
                ).getOrderedCommitIds(
                    head.sha,
                    processResults,
                    searchArgs
                );

                function processResults(ids, error) {
                    if ( error !== undefined )
                        throw(error);

                    if ( branchToSearchToCommitIds[branch] === undefined )
                        branchToSearchToCommitIds[branch] = {};

                    branchToSearchToCommitIds[branch][search] = ids;
                }

                function getNotIn() {
                    if ( branch === selectedBranches[0] )
                        return "notin:"+branchToHead[selectedBranches[1]].sha;
                    else
                        return "notin:"+branchToHead[selectedBranches[0]].sha;
                }
            }

            function ready() {
                var commitTimeToCommitIds = {},
                    commitIdToBranches    = {},
                    branch,
                    search,
                    time,
                    entries,
                    ids,
                    id,
                    i,
                    j,
                    k;
   
                for ( i = 0; i < selectedBranches.length; i++ ) { 
                    branch  = selectedBranches[i];
                    search  = getSearchId(branch, args);
                    entries = branchToSearchToCommitIds[branch][search];

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
        
                callback(args, commitTimeToCommitIds, commitIdToBranches);
            }
        }

        function getSearchId(branch, args) {
            return branchToHead[branch].sha+":"+JSON.stringify(args)+":"+selectedChartType;
        }
    }
}
