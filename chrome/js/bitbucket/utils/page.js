sdes.bitbucket.utils.page = function() {
    "use strict";

    var varUtil = new sdes.utils.variable(),
        host    = "bitbucket";

    this.parse = function(callback) {
        var names = window.location.pathname.replace(/^\//,"").replace(/\/$/, "").split(/\//);

        if ( names.length < 2 || window.location.search.match(/page=\d/) ) {
            callback(null);
            return;
        }

        var owner = names.shift(),
            repo  = names.shift(),
            type  = names.length === 0 ? "overview" : names.shift(),
            supported;

        if ( type !== "overview" && type !== "commits" ) {
            callback(null);
            return;
        }

        new sdes.gitsense.data.repo().isSupported(
            host,
            owner, 
            repo,
            function(_supported, error) {
                if ( error !== undefined )
                    throw(error);

                supported = _supported;

                if ( type === "overview" )
                    processOverviewPage();
                else if ( type === "commits" )
                    processCommitsPage(names);
            }
        );

        function getView() {
            var metas = document.getElementsByTagName("meta"),
                meta,
                i;
 
            for ( i = 0; i < metas.length; i++ ) {
                meta = metas[i];

                if ( meta.name !== "bb-view-name" ) 
                    continue;

                haveView(meta.content);
                return;
            }

            if ( new Date().getTime() > stopAt )
                throw("GitSense: We've given up on waiting for the bb-view-name meta data");
           
            setTimeout(getView, 100);
        }

        function haveView(view) {

        }

        function processOverviewPage() {
            callback({
                type: "overview",
                owner: owner,
                repo: repo,
                supportedRepo: supported
            });
        }

        function processCommitsPage(names) {
            names = names.join("/").replace(/%2F/g, "/").split("/");

            if ( names.length === 1 ) {
                if ( names[0] === "all" ) {
                    callback({ 
                        type: "commits", 
                        owner: owner, 
                        repo: repo, 
                        supportedRepo: supported 
                    });
                } else {
                    callback(null);
                }

                return;
            }

            names.shift();

            callback({
                type: "commits",
                owner: owner,
                repo: repo,
                branch: names.join("/"),
                supportedRepo: supported
            });
        }
    }
}
