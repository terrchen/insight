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

    var host = "github",

        bhdata = new sdes.gitsense.data.branch.heads(
            host, 
            page.owner, 
            page.repo, 
            page.branch
        ),

        idPrefix = "id"+CryptoJS.MD5(
            page.owner+":"+
            page.repo+":"+
            page.branch+":commits"
        ),

        chartsBodyId            = idPrefix+"-charts",
        changesTreeBodyId       = idPrefix+"-changes",
        navAndSearchInputBodyId = idPrefix+"-nav-and-search",
        searchResultsBodyId     = idPrefix+"-search-results",
        helpBodyId              = idPrefix+"-help",
        messageId               = idPrefix+"-message",
        commitCodeChurnBars     = [];

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
                navAndSearchInputBodyId,
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
                    if ( error !== undefined ) {
                        if ( error.responseText.match(/Sorry/) )
                            render();
                        else
                            throw(error);
    
                        return;
                    }
  
                    if ( branchHead.indexed ) {
                        render(branchHead);
                        return;
                    }

                    bhdata.getSummary(
                        "latest",
                        function(latestBranchHead, error) {
                            if ( error !== undefined )
                                throw(error);

                            if ( latestBranchHead.indexed )
                                render(null, latestBranchHead);
                            else
                                render(branchHead);
                        }
                    );
                }
            );
        }
    }

    function render(branchHead, latestBranchHead) {
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
            changesTreeBody,
            searchResultsBody,
            navAndSearchInputBody,
            commitsStatsBody,
            warningsBody,
            chartsBody,
            helpBody,
            searchArgs,
            navigator;

        if ( varUtil.isNoU(branchHead) && varUtil.isNoU(latestBranchHead) ) {
            renderNotAvailableForRepo();
            return;
        } else if ( 
            ! varUtil.isNoU(branchHead) && 
            ! branchHead.indexed &&
            varUtil.isNoU(latestBranchHead) 
        ) {
            renderNotAvailableForBranch();
            return;
        }

        if ( ! varUtil.isNoU(latestBranchHead) ) {
            branchHead = latestBranchHead;
            branchHead.latest = false; 
        } else {
            branchHead.latest = true;
        }

        renderLayout();
        renderNavigator();
        renderChangesTree();
        renderSearch();
        renderSearchHelp();

        if ( branchHead.indexedCodeChurn ) 
            renderCommitsCodeChurn();

        function renderNotAvailableForRepo() {
            var message = document.getElementById(messageId);

            if ( message !== null )
                message.parentNode.removeChild(message);

            message =
                 htmlUtil.createLink({
                        id: messageId,
                        href: sdes.config.gitsenseHomeUrl+"/not-available.html",
                        html: 
                            "GitSense is not available<br>"+
                            "for this repository",
                        style: {
                            cssFloat: "right",
                            color: "#aaa",
                            textAlign: "right"
                        }
                    });

            fileNavBody.appendChild(message);
        }

        function renderNotAvailableForBranch() {
            var message = document.getElementById(messageId);

            if ( message !== null )
                message.parentNode.removeChild(message);

            message =
                 htmlUtil.createLink({
                        id: messageId,
                        html: 
                            "This branch has not been<br>"+
                            "indexed by GitSense",
                        style: {
                            cssFloat: "right",
                            color: "#aaa",
                            textAlign: "right"
                        }
                    });

            fileNavBody.appendChild(message);
        }

        function renderLayout() {
            chartsBody = 
                htmlUtil.createDiv({
                    id: chartsBodyId,
                    style: {
                        width: "980px",
                        height: "80px",
                        border: "1px solid #bbb",
                        marginTop: "5px",
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
    
            navAndSearchInputBody = 
                htmlUtil.createDiv({
                    id: navAndSearchInputBodyId,
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
                        marginTop: "10px"
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
            commitsBody.parentNode.insertBefore(navAndSearchInputBody, commitsBody);
            commitsBody.parentNode.insertBefore(helpBody, commitsBody);
            commitsBody.parentNode.appendChild(changesTreeBody);
            commitsBody.parentNode.appendChild(searchResultsBody);
        }
    
        function renderNavigator(select, showSearchResults) {
            if ( showSearchResults === undefined )
                showSearchResults = false;
    
            var isCustomSearch = branchHead.search === undefined ? false : true,  
                navBuilder     = new sdes.github.ui.subnav(),
                types          = [];

            if ( showSearchResults ) {
                types.push({
                    id: "search",
                    show: true,
                    html:
                        "<a target=_blank href='/"+page.owner+"/"+page.repo+"/branches/all?"+
                            "gitsense-search-args="+JSON.stringify(searchArgs)+"'>"+
                            "Search across branches &nbsp;"+
                            "<span class=\"octicon octicon-arrow-right\"></span>"+
                        "</a>"
                });
            } else {
                types.push({
                    id: "commits",
                    show: showSearchResults ? false : true,
                    html: getLabel("commits")
                });
               
                types.push({
                    id: "changes",
                    show: showSearchResults ? false : true,
                    html: getLabel("changes")
                });
            }
 
            if ( varUtil.isNoU(select) )
                select = types[0].id;
    
            var i, 
                type;
    
            for ( i = 0; i < types.length; i++ )  {
                type = types[i];
    
                navBuilder.add({
                    id: type.id,
                    html: type.html,
                    selected: 
                        ! showSearchResults && select === type.id ? 
                            true : 
                            null,
                    onclick: select === type.id ? null : clicked,
                    show: type.show
                });
            }
    
            if ( navigator !== undefined )
                navigator.parentNode.removeChild(navigator);
    
            navigator = navBuilder.build(); 
    
            navAndSearchInputBody.appendChild(navigator);
    
            show(select);
    
            function clicked(params) {
                renderNavigator(params.id, showSearchResults);
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
            var caseSensitive = false;

            renderSearchInput();

            var search = 
                    new sdes.github.comp.search(
                        page, 
                        branchHead,
                        chartsBody,
                        searchResultsBody,
                        {
                            showClose: true,
                            warningsTop: "-10px",
                            warningsPosition: "relative",
                            onclose: function() {
                                searchInputBuilder.getInputElement().value = "";

                                renderNavigator();

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

            search.renderMatchingTimelinesChart(branchHead.head.name);

            function renderSearchInput() {
                searchInputBuilder = 
                        new sdes.github.ui.input.search({
                            align: "right",
                            value: "",
                            placeholder: "Search branch...",
                            onenter: pressedEnter
                        });

                var search = searchInputBuilder.build();
    
                navAndSearchInputBody.appendChild(search);
            }
    
            function pressedEnter(input, inputElem) {
                if ( input.match(/^\s*$/) )
                    return;
    
                searchArgs = new sdes.utils.cli().getArgs(input);

                renderNavigator("search", true);

                search.execute(
                    "commits",
                    searchArgs, 
                    caseSensitive,
                    {
                        commits: {
                            execute: true
                        },
                        diffs: {
                            execute: false,
                            executeSummarySearch: branchHead.indexedDiffs ? true : false
                        },
                        source: {
                            execute: false,
                            executeSummarySearch: branchHead.indexedSource ? true : false
                        }
                    }
                );
            }

            function updateMatchingTimelines(type, searchSha, total)  {
                if ( type !== undefined && search.getSelectedTab() !== type )
                    return;

                setTimeout( 
                    function() {
                        if ( type === undefined )
                            search.renderMatchingTimelinesChart(branchHead.head.name);
                        else if ( varUtil.isNoU(searchSha) || total === 0 )
                            search.renderMatchingTimelinesChart(null, []) ;
                        else
                            search.renderMatchingTimelinesChart(searchSha);
                    },
                    25
                );
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
                var ghrepo = new sdes.github.data.repo(page.owner, page.repo),

                    revsTree = 
                        new sdes.gitsense.ui.trees.changes(
                            host,
                            page.owner,
                            page.repo,
                            page.branch,
                            branchHead.head.name,
                            {
                                onclick: clicked,
                                onclickavatar: clickedAvatar,
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

                function clickedAvatar(avatar, commit) {
                    ghrepo.getCommit(
                        commit.name, 
                        function(ghcommit, error) {
                            if ( error !== undefined )
                                throw(error);

                            if ( 
                                varUtil.isNoU(ghcommit.author) || 
                                varUtil.isNoU(ghcommit.author.avatar_url)
                            ) {
                                console.warn("No GitHub mapping for commit author "+commit.authorEmail);
                                return; 
                            }

                            var avatars = {};

                            avatars[commit.authorEmail] = ghcommit.author.avatar_url;

                            new sdes.gitsense.data.users().storeAvatars(avatars);

                            avatar.src = ghcommit.author.avatar_url;
                        }
                    );
                }
            }
        }

        function renderCommitsCodeChurn(commitToChurn) {
            if ( commitToChurn === undefined ) {
                var commits = getCommits();

                if ( commits.length === 0 )
                    return;

                new sdes.gitsense.data.commits(
                    host,
                    page.owner,
                    page.repo
                ).getCodeChurn(
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
                    elem,
                    commit,
                    i;

                for ( i = 0; i < elems.length; i++ ) {
                    elem = elems[i];

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
    }
}
