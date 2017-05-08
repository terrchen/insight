sdes.gitsense.data.auth = function(rule) {
    "use strict";

    var varUtil    = new sdes.utils.variable(),
        urlPrefix  = rule.gitsense.baseUrl+"/insight";

    this.getTempToken = function(host, owner, repo, callback) {
        $.ajax({
            url: urlPrefix+"/auth/"+host+"/temp",
            data: {
                owner: owner,
                repo: repo   
            },
            success: function(result) {
                var temp = result.split(":");
                callback(temp[0], parseInt(temp[1]), parseInt(temp[2]));
            },
            error: function(e) {
                if ( e.responseText.match(/Sorry/) )
                    callback(false);
                else
                    callback(null, null, null, e);
            }
        });
    }
}
