// Relay lets you query GitHub and BitBucket's REST API from the server. 
// In order for relay to work, the following has to be true:
//
// 1) The login credentials for Bitbucket/GitHub must be setup properly
//    on the server. Please refer to the GitSense administration documents 
//    to learn how to set your login credentials.
//
// 2) The REST URLs that you want to query from the server must be supported.
//    At the present moment, you can only query the following from the server.
//
//    https://bitbucket.org/api/1.0/repositories/{accountname}/{repo_slug}/main-branch/
//    https://bitbucket.org/api/1.0/repositories/{accountname}/{repo_slug}/branches-tags/
//
sdes.gitsense.data.relay = function() {
    "use strict";

    var urlPrefix = sdes.config.gitsenseApiUrl+"/host",
        token     = sdes.config.gitsenseAccessToken,
        varUtil   = new sdes.utils.variable();

    this.query = function(params) {
        if ( varUtil.isNoU(params.host) )
            throw("GitSense: Missing host parameter");

        if ( varUtil.isNoU(params.owner) )
            throw("GitSense: Missing owner parameter");

        if ( varUtil.isNoU(params.repo) )
            throw("GitSense: Missing repo parameter");

        if ( varUtil.isNoU(params.url) )
            throw("GitSense: Missing host api url parameter");

        if ( varUtil.isNoU(params.callback) )
            throw("GitSense: Missing callback parameter");

        $.ajax({
            url: urlPrefix+"/"+params.host+"/"+params.owner+"/"+params.repo+"/relay",
            data: {
                token: token,
                url: params.url
            },
            success: function(data) {
                params.callback(data);
            },
            error: function(e) {
                params.callback(null, e);
            }
        });
    }
}
