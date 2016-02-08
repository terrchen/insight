sdes.bitbucket.data.repo = function(owner, name) {
    "use strict";

    var _this    = this,
        v1ApiUrl = sdes.config.bitbucketApiUrl.replace(/\/$/,"")+"/1.0",
        v2ApiUrl = sdes.config.bitbucketApiUrl.replace(/\/$/,"")+"/2.0";

    this.get = function(callback) {
        $.ajax({
            url: v1ApiUrl+"/repositories/"+owner+"/"+name,
            success: function (data) {
                callback(data);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

    this.getBranchesAndTags = function(callback) {
        var url = v1ApiUrl+"/repositories/"+owner+"/"+name+"/branches-tags";
        $.ajax({
            url: url,
            success: function (data) {
                callback(data);
            },
            error: function(e) {
                if ( e.status === 403 || e.status === 401 )
                    queryFromServer(url, callback);
                else
                    callback(null, e);
            }
        });
    }

    this.getMainBranch = function(callback) {
        var url = v1ApiUrl+"/repositories/"+owner+"/"+name+"/main-branch";

        $.ajax({
            url: url,
            success: function (data) {
                callback(data);
            },
            error: function(e) {
                if ( e.status === 403 || e.status === 401 )
                    queryFromServer(url, callback);
                else
                    callback(null, e);
            }
        });
    }

    this.getCommit = function(sha, callback) {
        var url = v2ApiUrl+"/repositories/"+owner+"/"+name+"/commit/"+sha;

        $.ajax({
            url: url,
            success: function (commit) {
                callback(commit);
            },
            error: function(e) {
                if ( e.status === 403 || e.status === 401 )
                    queryFromServer(url, callback);
                else
                    callback(null, e);
            }
        });
    }

    function queryFromServer(url, callback) {
        new sdes.gitsense.data.relay().query({
            host: "bitbucket",
            owner: owner,
            repo: name,
            url: url,
            callback: function(data, error) {
                if ( error !== undefined )
                    throw(error);

                callback(data);
            }
        });
    }
}
