sdes.gitsense.data.branch.heads = function(host, owner, repo, branch) {
    "use strict";

    var urlPrefix       = sdes.config.gitsenseApiUrl+"/host/"+host+"/"+owner+"/"+repo,
        token           = sdes.config.gitsenseAccessToken,
        varUtil         = new sdes.utils.variable(),
        cache           = sdes.cache.gitsense.data.branch.heads,
        branchUrlPrefix = varUtil.isNoU(branch) ? null : urlPrefix+"/"+branch;

    if ( varUtil.isNoU(cache) )
        throw("GitSense Error: No cache object for sdes.gitsense.data.branch.heads");

    this.getLatest = function(callback) {
        $.ajax({
            url: branchUrlPrefix+"/heads/latest",
            data: {
                token: token
            },
            success: function(head) {
                callback(head);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

    this.getSummary = function(head, callback) {
        $.ajax({
            url: branchUrlPrefix+"/heads/"+head,
            data: {
                token: token
            },
            success: function(summary) {
                callback(summary);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    } 

    this.getCommitPoints = function(params) {
        if ( cache.getCommitPoints === undefined ) 
            cache.getCommitPoints = {};

        if ( varUtil.isNoU(params.head) )
            throw("GitSense: No branch head defined");

        if ( varUtil.isNoU(params.callback) )
            throw("GitSense: No callback defined");

        var data = { 
                grouping: params.grouping, 
                args: params.args,
                maxPoints: params.maxPoints,
                notIn: params.notIn
            },

            key = CryptoJS.MD5(params.head+":"+JSON.stringify(data));

        if ( cache.getCommitPoints[key] !== undefined ) {
            params.callback(cache.getCommitPoints[key]);
            return;
        }

        data.token = token;

        $.ajax({
            url: branchUrlPrefix+"/heads/"+params.head+"/points/commits",
            data: data,
            success: function(points) {
                cache.getCommitPoints[key] = points;
                params.callback(points);
            },
            error: function(e) {
                params.callback(null, e);
            }
        });
    }

    this.getCodeChurnPoints = function(params) {
        if ( cache.getCodeChurnPoints === undefined ) 
            cache.getCodeChurnPoints = {};

        if ( varUtil.isNoU(params.head) )
            throw("GitSense: No branch head defined");

        if ( varUtil.isNoU(params.callback) )
            throw("GitSense: No callback defined");

        var data = { 
                grouping: params.grouping, 
                args: params.args,
                maxPoints: params.maxPoints,
                notIn: params.notIn
            },

            key = CryptoJS.MD5(params.head+":"+JSON.stringify(data));

        if ( cache.getCodeChurnPoints[key] !== undefined ) {
            params.callback(cache.getCodeChurnPoints[key]);
            return;
        }

        data.token = token; 

        $.ajax({
            url: branchUrlPrefix+"/heads/"+params.head+"/points/codechurn",
            data: data,
            success: function(points) {
                cache.getCodeChurnPoints[key] = points;
                params.callback(points);
            },
            error: function(e) {
                params.callback(null, e);
            }
        });
    }

    this.getLoCPoints = function(params) {
        if ( cache.getLocPoints === undefined ) 
            cache.getLocPoints = {};

        if ( varUtil.isNoU(params.head) )
            throw("GitSense: No branch head defined");

        if ( varUtil.isNoU(params.callback) )
            throw("GitSense: No callback defined");

        var data = { 
                grouping: params.grouping, 
                args: params.args,
                maxPoints: params.maxPoints,
                notIn: params.notIn
            },

            key = CryptoJS.MD5(params.head+":"+JSON.stringify(data));

        if ( cache.getLocPoints[key] !== undefined ) {
            params.callback(cache.getLocPoints[key]);
            return;
        }

        data.token = token;

        $.ajax({
            url: branchUrlPrefix+"/heads/"+params.head+"/points/loc",
            data: data,
            success: function(points) {
                cache.getLocPoints[key] = points;
                params.callback(points);
            },
            error: function(e) {
                params.callback(null, e);
            }
        });
    }

    this.getTreePoints = function(params) {
        if ( cache.getTreePoints === undefined ) 
            cache.getTreePoints = {};

        if ( varUtil.isNoU(params.head) )
            throw("GitSense: No branch head defined");

        if ( varUtil.isNoU(params.callback) )
            throw("GitSense: No callback defined");

        var data = { 
                grouping: params.grouping, 
                args: params.args,
                maxPoints: params.maxPoints,
                notIn: params.notIn
            },

            key = CryptoJS.MD5(params.head+":"+JSON.stringify(data));

        if ( cache.getTreePoints[key] !== undefined ) {
            params.callback(cache.getTreePoints[key]);
            return;
        }

        data.token = token;

        $.ajax({
            url: branchUrlPrefix+"/heads/"+params.head+"/points/tree",
            data: data,
            success: function(points) {
                cache.getTreePoints[key] = points;
                params.callback(points);
            },
            error: function(e) {
                params.callback(null, e);
            }
        });
    }

    this.getOrderedCommitIds = function(head, callback, args, notIn) {
        if ( cache.getOrderedCommitIds === undefined )
            cache.getOrderedCommitIds = {};

        var data = varUtil.isNoU(args) ? null : { args: JSON.stringify(args) },
            key  = CryptoJS.MD5(head+":"+JSON.stringify(data));

        if ( cache.getOrderedCommitIds[key] !== undefined ) {
            callback(cache.getOrderedCommitIds[key]);
            return;
        }

        data.token = token;

        $.ajax({
            url: branchUrlPrefix+"/heads/"+head+"/commits/ordered-ids",
            data: data,
            success: function(commitIds) {
                cache.getOrderedCommitIds[key] = commitIds;
                callback(commitIds);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

    this.getChangesTreeKids = function(head, path, callback, callbackParams) {
        if ( cache.getOrderedCommitIds === undefined )
            cache.getChangesTreeKids = {};

        var data = { path: path },
            key  = CryptoJS.MD5(head+":"+JSON.stringify(data));

        if ( cache.getChangesTreeKids[key] !== undefined ) {
            callback(cache.getChangesTreeKids[key]);
            return;
        }

        data.token = token;
        
        $.ajax({
            url: branchUrlPrefix+"/heads/"+head+"/chgstree/kids",
            data: data,
            success: function(kids) {
                cache.getChangesTreeKids[key] = kids;
                callback(kids, callbackParams);
            },
            error: function(e) {
                callback(null, e)
            }
        });
    }

    this.getChangesTreeHistory = function(head, path, page, callback, callbackParams) {
        if ( cache.getChangesTreeHistory === undefined )
            cache.getChangesTreeHistory = {};

        var data = { path: path, page: page },
            key  = CryptoJS.MD5(head+":"+JSON.stringify(data));

        if ( cache.getChangesTreeKids[key] !== undefined ) {
            callback(cache.getChangesTreeKids[key]);
            return;
        }

        data.token = token;
        
        $.ajax({
            url: branchUrlPrefix+"/heads/"+head+"/chgstree/history",
            data: data,
            success: function(results) {
                cache.getChangesTreeKids[key] = results;
                callback(results, callbackParams);
            },
            error: function(e) {
                callback(null, e)
            }
        });
    }

    this.search = function(params) {
        if ( varUtil.isNoU(params.head) )
            throw("GitSense: Missing branch head paramater");

        if ( varUtil.isNoU(params.type) )
            throw("GitSense: Missing search type paramater");

        if ( varUtil.isNoU(params.args) )
            throw("GitSense: Missing search arguments paramater");

        if ( varUtil.isNoU(params.callback) )
            throw("GitSense: Missing callback paramater");

        var page          = varUtil.isNoU(params.page) ? 1 : params.page;
        var caseSensitive = varUtil.isNoU(params.caseSensitive) ? false : params.caseSensitive;

        if ( cache.search === undefined )
            cache.search = {};
       
        var data = { 
                args: JSON.stringify(params.args), 
                page: page, 
                caseSensitive: caseSensitive
            },
            key = CryptoJS.MD5(params.head+":"+params.type+":"+JSON.stringify(data));

        if ( cache.search[key] !== undefined ) {
            params.callback(cache.search[key]);
            return;
        }

        data.token = token;

        $.ajax({
            url: branchUrlPrefix+"/heads/"+params.head+"/search/"+params.type,
            data: data,
            success: function(results) {
                cache.search[key] = results;
                params.callback(results);
            },
            error: function(e) {
                params.callback(null, e);
            }
        });
    }

    this.getBranchHeads = function(callback) {
        if ( cache.getBranchHeads === undefined ) 
            cache.getBranchHeads = {};

        var url = urlPrefix+"/branches/heads";

        if ( cache.getBranchHeads[url] !== undefined ) {
            callback(cache.getBranchHeads[url]);
            return;
        }

        $.ajax({
            url: url,
            data: {
                token: token
            },
            success: function(branchToHead) {
                cache.getBranchHeads[url] = branchToHead;
                callback(branchToHead);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }
}
