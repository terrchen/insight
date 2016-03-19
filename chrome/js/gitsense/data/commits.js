sdes.gitsense.data.commits = function(host, owner, repo) {
    "use strict";

    var varUtil    = new sdes.utils.variable(),
        configUtil = new sdes.utils.config(),
        rule       = configUtil.getRule(),
        urlPrefix  = rule.gitsense.api+"/host/"+host+"/"+owner+"/"+repo+"/commits",
        cache      = sdes.cache.gitsense.data.commits;

    if ( cache === undefined )
        throw("GitSense: No cache object for sdes.gitsense.data.commits");

    this.getCodeChurn = function(commits, callback) {
        if ( cache.getCommitsCodeChurn === undefined )
            cache.getCommitsCodeChurn = {};

        var data = { commits: JSON.stringify(commits) },
            key  = CryptoJS.MD5(JSON.stringify(data));

        if ( cache.getCommitsCodeChurn[key] !== undefined ) {
            callback(cache.getCommitsCodeChurn[key]);
            return;
        }

        $.ajax({
            url: urlPrefix+"/codechurn",
            data: { 
                commits: JSON.stringify(commits),
                rule: JSON.stringify(rule)
            },
            success: function(results) {
                cache.getCommitsCodeChurn[key] = results;
                callback(results);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

    this.mapById = function(ids, callback) {
        if ( cache.idToCommit === undefined )
            cache.idToCommit = {};

        var i, 
            id,
            temp = [],
            idToCommit = {};

        for ( i = 0; i < ids.length; i++ ) {
            id = ids[i];

            if ( cache.idToCommit[id] === undefined )
                temp.push(id);
            else
                idToCommit[id] = cache.idToCommit[id];
        }

        if ( temp.length === 0 ) {
            callback(idToCommit);
            return;
        }

        $.ajax({
            url: urlPrefix+"/map-by-id",
            data: {
                ids: JSON.stringify(temp),
                rule: JSON.stringify(rule)
            },
            success: function(_idToCommit) {
                for ( var id in _idToCommit ) {
                    cache.idToCommit[id] = _idToCommit[id];
                    idToCommit[id]       = _idToCommit[id];
                }
        
                callback(idToCommit);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }
}
