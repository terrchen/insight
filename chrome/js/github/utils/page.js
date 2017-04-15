var lastGitSenseShow = null;

sdes.github.utils.page = function(rule) {
    var varUtil = new sdes.utils.variable();

    this.parse = function(callback) {
        var names = window.location.pathname.replace(/^\/|\/$/, "").split(/\//);

        if ( names[names.length - 1] === "" )
            names.pop();

        if ( names.length === 1 && names[0] === "login" ) {
            callback(null);
            return;
        }

        if ( names.length !== 1 && names[0] !== "orgs" ) {
            if ( names.length > 1 )
                parseRepo(names, callback);
            else 
                callback(null);

            return;
        }

        parseOrg(names.length === 1 ? names[0] : names[1], callback);

        //new sdes.github.data.user(rule).get(
        //    names.length === 1 ? names[0] : names[1],
        //    function(user, error) {
        //        if ( error !== undefined ) {
        //            console.dir(error);
        //            return;
        //        }

        //        if ( user.type === "Organization" )
        //            parseOrg(user, callback);
        //        else
        //            callback(null);
        //    }
        //);
    }

    function parseOrg(name, callback) {
        var show   = window.location.search.match(/gitsense=insight/) ? true : false,
            stopAt = new Date().getTime()+2000;

        if ( lastGitSenseShow && show )
            return;

        lastGitSenseShow = show;

        parse();

        function parse() {
            if ( new Date().getTime() > stopAt ) {
                console.error("Given up on looking for elements");
                return;
            }

            var orgElems   = document.getElementsByClassName("orgnav"),
                containers = document.getElementsByClassName("container");

            if ( 
                orgElems === null || 
                containers == null ||
                orgElems.length === 0 ||
                containers.length === 0 ||
                containers.length < 3
            ) {
                setTimeout(parse, 50);
                return;
            }

            var container = null;

            for ( var i = 0; i < containers.length; i++ )  {
                if ( ! containers[i].className.match(/org-profile/) )
                    continue;

                container = containers[i];
                break;
            }

            callback({
                type: "org",
                org: name,
                tabs: orgElems[0],
                container: container,
                show: show
            });
        }
    }

    function parseRepo(names, callback) {
        var owner     = names.shift(),
            repo      = names.shift(),
            home      = names.length === 0 ? true : false,
            search    = names.length !== 0 && names[0] === "search" ? true : false,
            show      = window.location.search.match(/gitsense=insight/) ? true : false,
            stopAt    = new Date().getTime() + 1000,
            trackerId = "gitsense-content-tracker",
            iframeId  = "gitsense-content-iframe",
            container = document.getElementById(trackerId),
            iframe    = document.getElementById(iframeId);

        if ( lastGitSenseShow && show )
            return;

        if ( show && iframe !== null )
            findContainers();
        else if ( container !== null )
            waitForNewContainers();
        else
            findContainers();

        lastGitSenseShow = show; 

        function waitForNewContainers() {
            if ( new Date().getTime() > stopAt )  {
                stopAt = new Date().getTime() + 2000;
                findContainers();
                return;
            }

            var container = document.getElementById(trackerId);

            if ( container !== null ) {
                setTimeout(waitForNewContainers, 50);
                return;
            }

            stopAt = new Date().getTime() + 2000;
            findContainers();
        }

        function findContainers() {
            if ( new Date().getTime() > stopAt ) {
                console.error("Given up on looking for containers");
                return;
            }

            var containers = document.getElementsByClassName("container");

            if ( containers === null || containers.length < 4 ) {
                setTimeout(findContainers, 50);
                return;
            }

            var tabs    = null,
                content = null,
                fileNav = null,
                branch  = null;

            for ( var i = 0; i < containers.length; i++ ) {
                var container = containers[i];

                if ( container.className === "container" ) {
                    if ( container.childNodes === undefined || container.childNodes[1] === undefined )
                        continue;

                    tabs = container.childNodes[1];
                } else if ( container.className.match(/experiment-repo-nav/) ) {
                    content    = container;
                    content.id = trackerId;

                    if ( show )
                        $(content).hide();
                }
            }

            if ( tabs === null || content === null ) {
                setTimeout(findContainers, 50);
                return;
            }

            if ( home ) {
                var fileNavElems = document.getElementsByClassName("file-navigation"),
                    selectElems  = document.getElementsByClassName("branch-select-menu");

                if ( 
                    fileNavElems === null || 
                    fileNavElems.length === 0 ||
                    selectElems === null ||
                    selectElems.length === 0 ||
                    selectElems[0].children.length === 0 
                ) {
                    setTimeout(findContainers, 50);
                    return;
                }

                fileNav = fileNavElems[0];

                var button = selectElems[0].children[0],
                    type   = button.children[0].innerHTML.replace(/^ /, ""),
                    value  = button.children[1].innerHTML.replace(/^ /g, "");

                if ( type === "Branch:" )
                    branch = value;
            }

            callback({
                type: "repo",
                owner: owner,
                repo: repo,
                home: home,
                show: show,
                tabs: tabs,
                search: search,
                content: content,
                fileNav: fileNav,
                branch: branch
            });
        }
    }
}
