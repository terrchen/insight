sdes.gitsense.data.repo = function() {
    "use strict";

    var urlPrefix = sdes.config.gitsenseApiUrl+"/host",
        token     = sdes.config.gitsenseAccessToken,
        varUtil   = new sdes.utils.variable();

    this.isSupported = function(host, owner, repo, callback) {
        $.ajax({
            url: urlPrefix+"/"+host+"/"+owner+"/"+repo,
            data: {
                token: token
            },
            success: function(data) {
                callback(true);
            },
            error: function(e) {
                if ( e.responseText.match(/Sorry/) )
                    callback(false);
                else
                    callback(null, e);
            }
        });
    }

    this.getMainBranch = function(host, owner, repo, callback) {
        $.ajax({
            url: urlPrefix+"/"+host+"/"+owner+"/"+repo+"/main-branch",
            data: {
                token: token
            },
            success: function(branch) {
                callback(true);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }
}
