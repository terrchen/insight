sdes.gitsense.data.repo = function() {
    "use strict";

    var varUtil    = new sdes.utils.variable(),
        configUtil = new sdes.utils.config(),
        rule       = configUtil.getRule(),
        urlPrefix  = rule.gitsense.api+"/host";

    this.isSupported = function(host, owner, repo, callback) {
        $.ajax({
            url: urlPrefix+"/"+host+"/"+owner+"/"+repo,
            data: {
                rule: JSON.stringify(rule)
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
                rule: JSON.stringify(rule)
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
