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

sdes.github.pages.tree = function(rule, page) {
    "use strict";

    var isEntPage = rule.host.type === "github-enterprise" ? true : false,

        bhdata = 
            new sdes.gitsense.data.branch.heads(
                rule.gitsense.hostId,
                page.owner, 
                page.repo, 
                page.branch
            ),

        idPrefix = 
            "id"+CryptoJS.MD5(
                page.owner+":"+
                page.repo+":"+
                page.branch+":tree"
            ),

        searchResultsBodyId = idPrefix+"-search-results",
        searchInputBodyId   = idPrefix+"-search",
        chartsBodyId        = idPrefix+"-charts",
        helpBodyId          = idPrefix+"-help",
        messageId           = idPrefix+"-message";

    this.render = function() {
        var stopAt = new Date().getTime() + 3000;

        if ( page.path === "" ) {
            if ( document.getElementById(searchInputBodyId) === null )
                renderWhenReady();
            else
                destroyExistingElements(renderWhenReady);
        } else {
            destroyExistingElements();
        }

        function destroyExistingElements(callback) {
            var ids = [
                searchInputBodyId,
                searchResultsBodyId,
                chartsBodyId,
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

            if ( callback === undefined )
                return;

            callback();
        }

        function renderWhenReady() {
            if ( new Date().getTime() > stopAt )
                throw("GitSense: We've given up on waiting for the commits page to become ready");
             
            var elems = document.getElementsByClassName("commit-tease");

            if ( elems === null ) {
                setTimeout(renderWhenReady, 100);
                return;
            }

            elems = document.getElementsByClassName("file-navigation");

            if ( elems === null || elems[0].childNodes.length !== 9 ) {
                setTimeout(renderWhenReady, 100);
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
                            if ( error  !== undefined )
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
        var commitTeaseBody = document.getElementsByClassName("commit-tease")[0],
            fileWrapBody    = document.getElementsByClassName("file-wrap")[0],
            readmeBody      = document.getElementById("readme"),
            htmlUtil        = new sdes.utils.html(),
            varUtil         = new sdes.utils.variable(),

            searchResultsBody,
            searchInputBody,
            searchInput,
            caseSensitive, 
            chartsBody,
            helpBody,
            navigator;

        $(fileWrapBody).show();
        $(readmeBody).show();
        $(commitTeaseBody).show();

        if ( varUtil.isNoU(branchHead) && varUtil.isNoU(latestBranchHead) )
            throw("Fixme - need to indicate GitSense is not available for this repo");

        if ( ! varUtil.isNoU(latestBranchHead) ) {
            branchHead = latestBranchHead;
            branchHead.latest = false; 
        } else {
            branchHead.latest = true;
        }

        if ( ! branchHead.indexed ) 
            throw("Fixme: need to indicate branch has not been indexed");

        renderLayout();
        renderSearch();

        function renderNotAvailable() {
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
                var distance = 0,
                    i;

                for ( i = 0; i < page.commits.length; i++ ) {
                    if ( page.commits[i] !== latest.head.name )
                        continue;
                    
                    distance = i + 1;
                    break;  
                }
                    
                var link = 
                        htmlUtil.createLink({
                            id: messageId,
                            href: 
                                "/"+page.owner+"/"+page.repo+"/commits/"+
                                latest.head.name+"?gitsense-branch="+page.branch,
                            html: 
                                "Browse the latest GitSense index<br>"+
                                latest.head.name.substring(0,7)+" - "+
                                (
                                    distance === 0 ? 
                                        new moment(latest.head.commitTime).fromNow() :
                                        distance+" commits ago"
                                ),
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
                            marginBottom: "10px"
                        }
                    });

            searchInputBody = 
                htmlUtil.createDiv({
                    id: searchInputBodyId,
                    style: {
                        width: "100%",
                        marginBottom: "10px"
                    }
                });
    
            searchResultsBody = 
                htmlUtil.createDiv({
                    id: searchResultsBodyId,
                    style: {
                        display: "none",
                        width: "100%",
                        marginTop: branchHead.latest ? "20px" : null
                    }
                });

            helpBody = 
                htmlUtil.createDiv({
                    id: helpBodyId,
                    style: {
                        height: "10px",
                        display: "none"
                    }
                });

            commitTeaseBody.parentNode.insertBefore(chartsBody, commitTeaseBody);
            commitTeaseBody.parentNode.insertBefore(searchInputBody, commitTeaseBody);
            commitTeaseBody.parentNode.insertBefore(searchResultsBody, commitTeaseBody);
        }
    
        function renderSearch() {
            renderSearchInput();

            var search = 
                    new sdes.github.comp.search(
                        rule,
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
                                $(commitTeaseBody).show();
                                $(fileWrapBody).show();

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
                searchInput = 
                        htmlUtil.createTextInput({
                            placeholder: "Search branch...",
                            style: {
                                width: "100%",
                                minHeight: "28px",
                                padding: "4px",
                                paddingLeft: "30px",
                                color: "#888"
                            } 
                        });

                var icon = 
                        htmlUtil.createSpan({
                            cls: "octicon octicon-search left",
                            style: {
                                color: "#ccc",
                                position: "relative",
                                top: "-22px",
                                left: "6px"
                            }
                        }),
                    branch =
                        htmlUtil.createSpan({
                            cls: "right",
                            text: page.branch,
                            style: {
                                borderRadius: "3px",
                                color: "#666",
                                backgroundColor: "#eee",
                                border: "1px solid #ccc",
                                padding: "2px",
                                paddingLeft: "7px",
                                paddingRight: "7px",
                                position: "relative",
                                right: "3px",
                                top: "-25px",
                                fontSize: "12px",
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

                $(commitTeaseBody).hide();
                $(fileWrapBody).hide();
                $(readmeBody).hide();

                $(searchResultsBody).show();

                search.execute(
                    defaultSearch,
                    searchArgs, 
                    caseSensitive,
                    {
                        commits: {
                            execute: branchHead.indexedSource ? false : true,
                            executeSummarySearch: branchHead.indexedSource ? true : false
                        },
                        diffs: {
                            execute: false,
                            executeSummarySearch: branchHead.indexedDiffs ? true : false
                        },
                        source: {
                            execute: branchHead.indexedSource ? true : false
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
}
