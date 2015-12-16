sdes.gitsense.data.commits = function(host, owner, repo) {
    "use strict";

    if ( host !== "github" )
        throw("GitSense: Unsupported git host provider '"+host+"'")

    var apiServer = sdes.config.gitsenseApiUrls[host],
        varUtil   = new sdes.utils.variable(),
        urlPrefix = apiServer+"/"+owner+"/"+repo+"/commits",
        cache     = sdes.cache.gitsense.data.commits;

    if ( cache === undefined )
        throw("GitSense: Cache not setup properly for sdes.gitsense.data.commits");

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
                ids: JSON.stringify(temp)
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
