sdes.github.comp.search = function(rule, page, branchHead, chartsBody, resultsBody, options) {
    "use strict";

    var isEntPage = rule.host.type === "github-enterprise" ? true : false,

        bhdata = 
            new sdes.gitsense.data.branch.heads(
                rule.gitsense.hostId,
                page.owner, 
                page.repo, 
                page.branch
            ),

        varUtil  = new sdes.utils.variable(),
        htmlUtil = new sdes.utils.html(),

        branchHeadLink = "/"+page.owner+"/"+page.repo+"/commit/"+branchHead.head.name,
        pageHeadLink   = "/"+page.owner+"/"+page.repo+"/commit/"+page.head,

        warningsBody =
            htmlUtil.createDiv({
                html: 
                    branchHead.latest ? 
                        "" :
                        "<span class='octicon octicon-alert'></span> "+
                        "The latest search index for this branch does not include "+
                        "commits from the latest commit "+
                        "<a href='"+pageHeadLink+"' target=_blank>"+
                            page.head.substring(0,8)+
                        "</a> "+
                        "to "+
                        "<a href='"+branchHeadLink+"' target=_blank>"+
                            branchHead.head.name.substring(0,8)+
                        "</a> "+
                        new moment(branchHead.head.commitTime).fromNow()+".",
                cls: "warning",
                style: {
                    width: "100%",
                    display: "none",
                    fontWeight: "normal",
                    border: "1px solid #ccc",
                    paddingLeft: "10px",
                    marginTop: "15px",
                    marginBottom: "15px",
                    position: 
                        varUtil.isNoU(options.warningsPosition) ? 
                            null : 
                            options.warningsPosition,
                    top: 
                        varUtil.isNoU(options.warningsTop) ? 
                            null : 
                            options.warningsTop
                }
            }),
        tabsBody = 
           htmlUtil.createDiv({
    
            }),
        matchingCommitsBody = 
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
        matchingSourceBody = 
            htmlUtil.createDiv({
                style: {
                    display: "none"
                }
            }),
        tabs = [
            { 
                id: "source", 
                label: "Code",
                total: branchHead.indexedSource ? null : "N/A",
                body: matchingSourceBody
            },
            {
                id: "commits",
                label: "Commits",
                total: null,
                searchSha: null,
                body: matchingCommitsBody
            },
            {
                id: "diffs",
                label: "Diffs",
                total: branchHead.indexedDiffs ? null : "N/A",
                searchSha: null,
                body: matchingDiffsBody
            }
        ],
        renderedDiffs   = false,
        renderedSource  = false,
        renderedCommits = false,
        caseSensitive   = false,
        selectedTab,
        searchArgs,
        tabBuilder,
        chartData;

    if ( varUtil.isNoU(options) )
        options = {};

    resultsBody.appendChild(warningsBody);
    resultsBody.appendChild(htmlUtil.createClearDiv());
    resultsBody.appendChild(tabsBody);
    resultsBody.appendChild(matchingCommitsBody);
    resultsBody.appendChild(matchingSourceBody);
    resultsBody.appendChild(matchingDiffsBody);
    resultsBody.appendChild(htmlUtil.createClearDiv());

    if ( ! branchHead.latest )
        $(warningsBody).show();

    this.renderMatchingTimelinesChart = function(sha, points) {
        if ( chartData === undefined  ) 
            initChartData(branchHead.head.name, ready);
        else
            ready();

        function ready() {
            if ( sha === branchHead.head.name )
                renderTimelinesChart();
            else
                renderMatchingTimelinesChart(sha, points);
        }
    }

    this.execute = function(defaultSearch, args, cs, searches) {
        selectedTab   = defaultSearch;
        searchArgs    = args;
        caseSensitive = cs;

        reset();
        renderTabs();

        for ( var type in searches ) {
            var search = searches[type];

            switch ( type ) {
                case "commits":
                    if ( search.execute )
                        executeCommitsSearch();
                    else if ( search.executeSummarySearch )
                        executeCommitsSearch(0);
    
                    break;
                case "diffs":
                    if ( search.execute )
                        executeDiffsSearch();
                    else if ( search.executeSummarySearch )
                        executeDiffsSearch(0);

                    break;
                case "source":
                    if ( search.execute )
                        executeSourceSearch();
                    else if ( search.executeSummarySearch )
                        executeSourceSearch(0);

                    break;
                default:
                    throw("GitSense: Unrecognized search type '"+type+"'");
            }  
        } 
    }

    this.getSelectedTab = function() {
        return selectedTab;
    }

    this.getRightTab = function() {
        if ( varUtil.isNoU(tabBuilder) )
            return null;

        return tabBuilder.getRightTab();
    }

    function reset() {
        renderedCommits = false;
        renderedDiffs   = false;
        renderedSource  = false;

        $(tabsBody).html("");
        $(matchingCommitsBody).html("");
        $(matchingSourceBody).html("");
        $(matchingDiffsBody).html("");

        for ( var i = 0; i < tabs.length; i++ ) {
            var tab = tabs[i];

            switch(tab.id) {
                case "commits":
                    tab.total = null;
                    break;
                case "diffs":
                    tab.total = branchHead.indexedDiffs ? null : "N/A";
                       
                    break;
                case "source":
                    tab.total = branchHead.indexedSource ? null : "N/A";

                    break;
                default:
                    throw("GitSense: Unrecognized tab type '"+tab.id+"'");
            }
        } 
    }

    function renderTabs(select) {
        if ( varUtil.isNoU(select) )
            select = selectedTab;
    
        tabBuilder = new sdes.github.ui.tabs();

        var top        = isEntPage ? "top:-2px" : "top:3px",
            dotsCls    = "octicon octicon-primitive-dot",
            dotsStyle  = "font-size:6px; position:relative;"+top,
            selected,
            tab,
            i;

        for ( i = 0; i < tabs.length; i++ ) {
            tab      = tabs[i];
            selected = tab.id === select ? true : false;

            tabBuilder.add({
                id: tab.id,
                html: getHtml(tab),
                selected: selected,
                onclick: clicked
            });

            if ( selected )
                $(tab.body).show();
            else
                $(tab.body).hide();
        }

        selectedTab = select;

        $(tabsBody).html("");
    
        tabsBody.appendChild(tabBuilder.build());

        if ( varUtil.isNoU(options.showClose) || ! options.showClose )
            return; 

        var close = 
                htmlUtil.createLink({
                    cls: "octicon octicon-x",
                    style: {
                        fontWeight: "bold",
                        cursor: "pointer"
                    } 
                }),
            rightTab = tabBuilder.getRightTab();

        rightTab.appendChild(close);

        if ( ! varUtil.isNoU(options.onclose) )
            close.onclick = options.onclose;

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
                    (
                       isNaN(tab.total) ? 
                            tab.total :
                            Number(tab.total).toLocaleString("en")
                    )+
                    "</span>";

            return html;
        }
   
        function clicked(id, tabElem) {
            var tab = getTab(id);

            switch(id) {
                case "commits":
                    if ( ! renderedCommits )
                        executeCommitsSearch();

                    break;
                case "diffs":
                    if ( ! renderedDiffs )
                        executeDiffsSearch();
    
                    break;
                case "source":
                    if ( ! renderedSource )
                        executeSourceSearch();
    
                    break;
                default:
                    throw("GitSense: Unrecognized tab type '"+id+"'");
            }

            renderTabs(id);
                
            if ( ! varUtil.isNoU(options.ontabchange) )
                options.ontabchange(tab)
        }
    }
   
    function executeCommitsSearch(page) {
        if ( ! branchHead.indexed )
            return;

        if ( varUtil.isNoU(page) )
            page = 1;

        bhdata.search({
            head: branchHead.head.name,
            type: "commits",
            args: searchArgs,
            page: page,
            caseSensitive: caseSensitive,
            callback: function(results, error) {
                if ( error !== undefined )
                    throw(error);

                var tab = getTab("commits");

                tab.total     = results.total;
                tab.searchSha = results.sha;

                renderTabs();

                if ( page === 0 )
                    return;

                renderCommitMatches(results);

                if ( ! varUtil.isNoU(options.onsearchfinish) )
                    options.onsearchfinish("commits", results);
            }
        });
    }

    function executeDiffsSearch(page) {
        if ( ! branchHead.indexedDiffs )
            return;

        if ( varUtil.isNoU(page) )
            page = 1;

        bhdata.search({
            head: branchHead.head.name,
            type: "diffs",
            args: searchArgs,
            page: page,
            callback: function(results, error) {
                if ( error !== undefined )
                    throw(error);

                var tab = getTab("diffs");
                
                tab.total     = results.total;
                tab.searchSha = results.sha;

                renderTabs();

                if ( page === 0 )
                    return;

                renderDiffMatches(results);

                if ( ! varUtil.isNoU(options.onsearchfinish) )
                    options.onsearchfinish("diffs", results);
            }
        });
    }

    function executeSourceSearch(page) {
        if ( ! branchHead.indexedSource )
            return;

        if ( varUtil.isNoU(page) )
            page = 1;

        bhdata.search({
            head: branchHead.head.name,
            type: "source",
            args: searchArgs,
            page: page,
            caseSensitive: caseSensitive,
            callback: function(results, error) {
                if ( error !== undefined )
                    throw(error);

                var tab = getTab("source");
    
                tab.total     = results.total;
                tab.searchSha = results.sha;

                renderTabs();

                if ( page === 0 )
                    return;

                renderSourceMatches(results);

                if ( ! varUtil.isNoU(options.onsearchfinish) )
                    options.onsearchfinish("source", results);
            }
        });
    }

    function renderCommitMatches(results) {
        if ( renderedCommits || results.total === 0 )
            return;

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

        var commitsBuilder = 
            new sdes.github.ui.commits(
                rule,
                page.owner,
                page.repo,
                matchingCommitsBody.commits
            );

        renderedCommits = true;
        renderTabs();

        renderMatches(results);
        renderPagination(results);

        function renderMatches(results) {
            var matches = results.matches,
                span    = "<span style='background-color:rgba(255,255,140,0.5)'>",
                commit,
                showMsg,
                i;
    
            for ( i = 0; i < matches.length; i++ ) {
                commit = $.extend(true, [], matches[i]);

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
    
                commitsBuilder.add(
                    commit, 
                    { 
                        showMsg: commit.showMsg, 
                        target: "_blank",
                        backgroundColor: "white"
                    }
                );
            }
        }
    
        function renderPagination(results) {
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
                    "<a style='cursor:pointer'>"+
                        "Show next "+(matches)+" matches"+
                    "</a>"+
                "</div>"
            );

            pagination.onclick = function() {
                bhdata.search({
                    head: branchHead.head.name,
                    type: "commits",
                    args: results.args,
                    page: (results.page+1),
                    caseSensitive: results.caseSensitive,
                    callback: function(results, error) {
                        if ( error !== undefined )
                            throw(error);

                        renderMatches(results);
                        renderPagination(results);
                    }
                });
            }
        }
    }

    function renderDiffMatches(results) {
        if ( renderedDiffs || results.total === 0 )
            return;

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
                    rule,
                    page.owner,
                    page.repo,
                    matchingDiffsBody.changes
                );

        renderedDiffs = true;

        renderMatches(results);
        renderPagination(results);

        function renderMatches(results) {
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

                if ( matchToFiles[match.commit.name] === undefined ) {
                    matchToFiles[match.commit.name] = [];
                    newMatches.push(match);
                }

                href = 
                    "/"+
                    page.owner+"/"+
                    page.repo+"/"+
                    "commit/"+
                    match.commit.name+
                    "#diff-"+CryptoJS.MD5(match.path);

                if ( match.oldBlob.match("^00000000") )
                    action = "A";
                else if ( match.blob.match("^00000000") )
                    action = "D";
                else
                    action = "M";

                matchToFiles[match.commit.name].push(
                    "<span style='font-weight:bold'>"+
                        "<span style='color:"+actionToColor[action]+";'>"+action+"</span> "+ 
                        "<a href="+href+" target=_blank>"+match.path+"</a>\n"+
                    "</span>"+
                    ( match.diffs === undefined ? "" : getDiffsTable(match.diffs) )
                );
            }

            for ( i = 0; i < newMatches.length; i++ ) {
                match = newMatches[i];

                commitsBuilder.add(
                    match.commit,
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
                                html: matchToFiles[match.commit.name].join("<br>"),
                                style: {
                                    marginTop: "5px" 
                                }
                            })
                    }
                );
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
                    match = regexp.exec(lines[i]);

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

        function renderPagination(results) {
            var pagination = matchingDiffsBody.pagination;

            if ( results === undefined || results.total === results.end ) {
                matchingDiffsBody.removeChild(pagination);
                return;
            }

            var matches = 
                    results.end + results.mpp > results.total ?
                        results.total - results.end :
                        results.mpp;

            $(pagination).html(
                "<div class='pagination'>"+
                    "<a style='cursor:pointer'>"+
                        "Show next "+(matches)+" matches"+
                    "</a>"+
                "</div>"
            );

            pagination.onclick = function() {
                bhdata.search({
                    head: branchHead.head.name,
                    type: "diffs",
                    args: results.args,
                    page: (results.page+1),
                    caseSensitive: results.caseSensitive,
                    callback: function(results, error) {
                        if ( error !== undefined )
                            throw(error);

                        renderMatches(results);
                        renderPagination(results);
                    }
                });
            }
        }
    }

    function renderSourceMatches(results) {
        if ( renderedSource || results.total === 0 )
            return;

        matchingSourceBody.source = 
            htmlUtil.createDiv({
                cls: "commits-listing commits-listing-padded "+
                     "js-navigation-container js-active-navigation-container"
            });

        matchingSourceBody.pagination =
            htmlUtil.createDiv({
                cls: "paginate-container"
            });

        matchingSourceBody.appendChild(matchingSourceBody.source);   
        matchingSourceBody.appendChild(matchingSourceBody.pagination);

        var commitsBuilder = 
                new sdes.github.ui.commits(
                    rule,
                    page.owner,
                    page.repo,
                    matchingSourceBody.source,
                    { groupTitlePrefix: "Last modified on" }
                );

        renderedSource = true;

        renderMatches(results);
        renderPagination(results);

        function renderMatches(results) {
            var matches = results.matches,
                owner   = page.owner,
                repo    = page.repo,
                branch  = page.branch,
                match,
                action,
                lines,
                href,
                i;

            for ( i = 0; i < matches.length; i++ ) {
                match      = matches[i];
                match.name = match.commit;

                href = "/"+owner+"/"+repo+"/tree/"+branch+"/"+match.path

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
                                html: 
                                    "<span style='font-weight:bold'>"+
                                        "<a href="+href+" target=_blank>"+match.path+"</a>\n"+
                                    "</span>"+
                                    getLinesHtml(match.lines),
                                style: {
                                    marginTop: "5px" 
                                }
                            })
                    }
                );
            }

            function getLinesHtml(lines) {
                var regexp = /^\s*(\d+):(.*)$/,
                    html   = "",
                    last   = null,
                    num,
                    match,
                    line,
                    i;

                lines = lines.split("\n");

                for ( i = 0; i < lines.length; i++ ) {
                    match = regexp.exec(lines[i]);
                    num   = parseInt(match[1]);

                    if ( last !== null && last + 1 !== num ) {
                        html +=
                            "<tr>"+
                                "<td style='padding-left:20px;padding-right:10px;"+
                                    "border-right:1px solid #eaeaea;min-width:60px;"+
                                    "text-align:right;'>"+
                                    "..."+
                                "</td>"+
                                "<td style='padding-left:10px;width:100%;'>&nbsp;</td>"+
                            "</tr>";
                    }

                    last = num;

                    line = match[2]  
                           .replace(/</g, "&lt;")
                           .replace(/>/g, "&gt;")
                           .replace(/\n/g, "<br>")
                           .replace(/{%%S%%}/g, "<span style='background-color:#fffdc3'>")
                           .replace(/{%%E%%}/g, "</span>");

                    html += 
                        "<tr>"+
                            "<td style='padding-left:20px;padding-right:10px;"+
                                "border-right:1px solid #eaeaea;min-width:60px;"+
                                "text-align:right;'>"+
                                num+
                            "</td>"+
                            "<td style='padding-left:10px;width:100%;'>"+
                                line+
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

        function renderPagination(results) {
            var pagination = matchingSourceBody.pagination;

            if ( results.total === results.end ) {
                matchingSourceBody.removeChild(pagination);
                return;
            }

            var matches = 
                    results.end + results.mpp > results.total ?
                        results.total - results.end :
                        results.mpp;

            $(pagination).html(
                "<div class='pagination'>"+
                    "<a style='cursor:pointer'>"+
                        "Show next "+(matches)+" matches"+
                    "</a>"+
                "</div>"
            );

            pagination.onclick = function() {
                bhdata.search({
                    head: branchHead.head.name,
                    type: "source",
                    args: results.args,
                    page: (results.page+1),
                    caseSensitve: results.caseSensitive,
                    callback: function(results, error) {
                        if ( error !== undefined )
                            throw(error);

                        renderMatches(results);
                        renderPagination(results);
                    }
                });
            }
        }
    }

    function initChartData(sha, callback) {
        bhdata.getCommitPoints({
            head: sha,
            grouping: "daily",
            callback: processPoints
        });
    
        function processPoints(points, error) {
            if ( error !== undefined )
                throw(error);
    
            var data   = [],
                format = d3.time.format("%Y-%m-%d"),
                date,
                point,
                i;

            for ( i = 0; i < points.length; i++ ) {
                point = points[i];
                date  = format.parse(point.label);

                data.push({ 
                    label: point.label,
                    day: d3.time.day(date),
                    week: d3.time.week(date),
                    month: d3.time.month(date),
                    commits: point.commits,
                    value: point.commits
                });
            }
    
            // See if we need to padd any days. Basically, if the last commit was over
            // a year ago, we want to fill in the days from last year to now.  And the
            // reason why we want to do this is want to make it very easily to see how
            // active/inactive the branch is.
            var nowDate  = new Date(),
                nowTime  = nowDate.getTime(),
                nowLabel = getDateLabel("daily", nowDate),
                maxDate  = format.parse(points[0].label),
                maxTime  = maxDate.getTime(),
                maxLabel = getDateLabel("daily", maxDate);

            if ( maxLabel !== nowLabel && maxTime < nowTime ) {
                while ( maxLabel !== nowLabel )  {
                    data.push({ 
                        label: maxLabel,
                        day: d3.time.day(maxDate),
                        week: d3.time.week(maxDate),
                        month: d3.time.month(maxDate),
                        commits: 0,
                        value: 0
                    });

                    maxDate  = d3.time.day.offset(maxDate, 1);
                    maxLabel = getDateLabel("daily", maxDate);
                    maxTime  = maxDate.getTime();
                }
            }

            chartData = data;

            if ( ! varUtil.isNoU(callback) )
                callback();
        }

        // Fixme: This is being duplicated.  Put this in date util.
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
    }

    function renderMatchingTimelinesChart(sha, points) {
        if ( points === undefined ) {
            if ( varUtil.isNoU(sha) )
                throw("GitSense: Both points and sha cannot be null/undefined");

            bhdata.getCommitPoints({
                head: sha,
                grouping: "daily",
                callback: function(points, error) {
                    if ( error !== undefined )
                        throw(error);

                    renderMatchingTimelinesChart(null, points);
                }
            });

            return;
        }
 
        var labelToPoint  = {},
            newChartsData = $.extend(true, [], chartData),
            point,
            data,
            i;

        for ( i = 0; i < points.length; i++ )
            labelToPoint[points[i].label] = points[i];

        for ( i = 0; i < newChartsData.length; i++ ) {
            data  = newChartsData[i];
            point = labelToPoint[data.label];

            if ( point === undefined ) {
                data.value = 0;
            } else {
                if ( point.commits !== undefined )
                    data.value = point.commits;
                else if ( point.files !== undefined )
                    data.value = point.files;
            }
        }

        renderTimelinesChart(newChartsData);
    }

    function renderTimelinesChart(matchingChartsData) {
        $(chartsBody).html("");

        var values = 
                matchingChartsData === undefined ? 
                    crossfilter(chartData) : 
                    crossfilter(matchingChartsData),

            days   = values.dimension(function(d){ return d.day; }),
            weeks  = values.dimension(function(d){ return d.week; }),
            months = values.dimension(function(d){ return d.month; }),

            valuesByDayGroup = 
                days.group().reduceSum(function(d){
                    return d.value;
                }),

            valuesByWeekGroup = 
                weeks.group().reduceSum(function(d){
                    return d.value;
                }),

            valuesByMonthGroup = 
                months.group().reduceSum(function(d){
                    return d.value;
                }),

            firstDay = chartData[0].day,
            lastDay  = chartData[chartData.length - 1].day,

            numDays   = valuesByDayGroup.top(Number.POSITIVE_INFINITY).length,
            numWeeks  = valuesByWeekGroup.top(Number.POSITIVE_INFINITY).length,
            numMonths = valuesByMonthGroup.top(Number.POSITIVE_INFINITY).length,
            
            timelineChart = dc.barChart(chartsBody),

            useGroup,
            useDim,
            useRound,
            useXUnits;

        if ( numDays < 90 ) {
            useGroup  = valuesByDayGroup;
            useDim    = days;
            useRound  = d3.time.day.round;
            useXUnits = d3.time.days;
        } else if ( numWeeks < 230 ) {
            useGroup  = valuesByWeekGroup;
            useDim    = weeks;
            useRound  = d3.time.week.round;
            useXUnits = d3.time.weeks;
        } else {
            useGroup  = valuesByMonthGroup;
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

    function getTab(id) {
        for ( var i = 0; i < tabs.length; i++ ) {
            if ( tabs[i].id === id )
                return tabs[i];
        }
    }
}
