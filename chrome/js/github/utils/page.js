sdes.github.utils.page = function() {
    var varUtil = new sdes.utils.variable();

    this.parse = function(callback) {
        var names = window.location.pathname.replace(/^\//, "").split(/\//);

        if ( names.length < 3 ) {
            callback(null);
            return;
        }

        var repoOwner = names.shift(),
            repoName  = names.shift(),
            page      = names.shift();

        if ( page !== "commits" && page !== "branches" ) {
            callback(null);
            return;
        }

        if ( page === "commits" )
            parseCommitsPage();
        else if ( page === "branches" ) 
            parseBranchesPage(names);
        else
            throw("GitSense: Unrecognized GitHub page type '"+page+"'");

        function parseCommitsPage() {
            // In order for GitSense to work, it needs to know what
            // branch you are on.  Since GitHub doesn't work this way,
            // we may or may not be able to infer what branch you are
            // on. In situations where it can't get the branch information
            // by parsing the URL or scraping the page, it'll make sure
            // a query string called "gitsense-branch" is defined.
            var gitsenseBranch = null;

            if ( 
                ! varUtil.isNoU(window.location.search) && 
                window.location.search !== ""
            ) {
                if ( ! window.location.search.match(/\?gitsense-branch=/) ) {
                    callback({ 
                        type: page,
                        owner: repoOwner,
                        repo: repoName,
                        branch: null,
                        head: null
                    });
                    return;
                }

                gitsenseBranch = window.location.search.split("=").pop();
            }

            // Since GitHub uses push state, we can't be 100% sure the page has
            // finished loading.  The best that we can do is scrape this page every
            // "x" milliseconds to see if we have enough information to continue
            // and give up after "x" milliseconds of testing.
            var sleep  = 100,
                stopAt = new Date().getTime() + 2000; // Give up after 2 seconds
 
            wait(stopAt);

            function wait(stopAt) {
                if ( new Date().getTime() > stopAt )
                    throw("GitSense: We've given up on waiting for the page to load");

                var elems = document.getElementsByClassName("commit");

                if ( elems === null )
                    throw("GitSense: Couldn't find the commit class");
                
                if ( elems.length === 0 )
                    setTimeout(function(){ wait(stopAt); }, sleep);
                else
                    ready();
            }

            function ready(giveUp) {
                var buttons = document.getElementsByClassName("select-menu-button");

                if ( buttons === null )
                    throw("GitSense: Couldn't find the select-menu-button class");

                var i,
                    button,
                    arialLabel;

                for ( i = 0; i < buttons.length; i++ ) {
                    button    = buttons[i];
                    ariaLabel = button.getAttribute("aria-label");

                    if ( ariaLabel !== null && ariaLabel === "Switch branches or tags" )
                        break;

                    button = null;
                }

                if ( varUtil.isNoU(button) ) {
                    if ( giveUp ) 
                        throw("GitSense: We've given up on waiting for the page to load");
                
                    // We'll try one last time 
                    setTimeout(function(){ ready(true); }, 250);
                    return; 
                }

                var type  = button.childNodes[1].innerText.replace(/:$/, "").toLowerCase(),
                    value = button.childNodes[3].innerText,
                    head  = type === "tag" ? null : getHeadCommit(type),

                    branch = 
                        gitsenseBranch === null ? 
                            type === "tree" || type === "tag" ? 
                                null : value : 
                            gitsenseBranch;

                callback({
                    type: page,
                    owner: repoOwner,
                    repo: repoName,
                    branch: branch,
                    head: head
                });

                function getHeadCommit(type) {
                    switch(type) {
                        case "branch":
                            var elems = document.getElementsByClassName("commit");

                            if ( elems === null )
                                throw("GitSense: Couldn't find the 'commit' class");

                            return elems[0].dataset.channel.split(":").pop();
                        case "tree":
                            var head = window.location.pathname.split("/").pop();

                            if ( head.length === 40 )
                                return head;

                            throw("GitSense: Expected to find a 40 character SHA1 but got '"+head+"'");
                        default:
                            throw("GitSense: Unrecognized button type '"+type+"'");
                    }
                }
            }
        }

        function parseBranchesPage(names) {
            // Like the commits page, we'll just have to test the page x times
            // to see if we have enough information to proceed.
            var sleep  = 100,
                stopAt = new Date().getTime() + 2000,
                footer = "site-footer-links";

            if ( document.getElementsByClassName(footer) === null )
                setTimeout(wait, sleep);
            else
                ready(true);

            function wait() {
                if ( new Date().getTime() > stopAt )
                    throw("GitSense: Giving up on waiting for the branches page to load");

                if ( document.getElementById(footer) === null ) 
                    setTimeout(wait, sleep);
                else
                    ready(true);
            }

            function ready(tryAgain) {
                var elems    = document.getElementsByClassName("branch-summary"),
                    branches = [],
                    defaultBranch,
                    nodes,
                    node,
                    i,
                    j;

                for ( i = 0; i < elems.length; i++ ) {
                    nodes     = elems[i].children[0].children;
                    action    = null;
                    branch    = null;
                    isDefault = false;

                    for ( j = 0; j < nodes.length; j++ ) {
                        node = nodes[j];

                        if ( node.className.match(/branch-details/) )
                            branch = getName(node.children);
                        else if ( node.className.match(/default-label/) )
                            isDefault = true;
                        else if ( node.className.match(/branch-actions/) )
                            actions = node;
                    }

                    if ( isDefault )
                        defaultBranch = branch;

                    branches.push({
                        name: branch,
                        actions: actions
                    });
                }

                if ( branches.length === 0 && tryAgain ) {
                    setTimeout(function(){ ready(false); }, 500);
                    return;
                }

                // When a user does a commits search, we give them the option to
                // execute the search across branches.  If they click on that 
                // option, we'll pass the search arguments that were used in the
                // commits page to the branches page. Hence the test below.
                //
                // Note, at the present moment, we are going to assume 
                // gitsense-search-args is the only parameter that will be
                // passed to the branches page.
                var searchArgs = null;

                if ( window.location.search.match(/\?gitsense-search-args=/) ) {
                    try {
                        searchArgs = JSON.parse(decodeURI(window.location.search.split("=").pop()));
                    } catch ( e ) {
                        throw("GitSense: Failed to parse search arguments - "+e);
                    }
                }

                callback({
                    type: page,
                    owner: repoOwner,
                    repo: repoName,
                    branches: branches,
                    defaultBranch: defaultBranch,
                    searchArgs: searchArgs
                });

                function getName(nodes) {
                    var i,
                        node;

                    for ( i = 0; i < nodes.length; i++ ) {
                        node = nodes[i];

                        if ( ! node.className.match(/branch-name/) )
                            continue;

                        return node.innerText;  
                    }

                    throw("GitSense: Unable to find the branch name");
                }
            }
        }
    }
}
