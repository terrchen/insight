sdes.gitsense.data.branch.heads = function(host, owner, repo, branch) {
    "use strict";

    if ( host !== "github" )
        throw("GitSense: Unsupported git host provider '"+host+"'")

    var apiServer       = sdes.config.gitsenseApiUrls[host],
        varUtil         = new sdes.utils.variable(),
        urlPrefix       = apiServer+"/"+owner+"/"+repo,
        branchUrlPrefix = varUtil.isNoU(branch) ? null : urlPrefix+"/"+branch,
        cache           = sdes.cache.gitsense.data.branch.heads;

    if ( varUtil.isNoU(cache) )
        throw("GitSense: Cache not setup properly for sdes.gitsense.data.branch.heads");

    this.getLatest = function(callback) {
        $.ajax({
            url: branchUrlPrefix+"/heads/latest",
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
            success: function(summary) {
                callback(summary);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    } 

    this.getCommits = function(head, callback, options) {
        if ( options === undefined )
            options = {};

        var page = varUtil.isNoU(options.page) ? 1 : options.page,
            mpp  = varUtil.isNoU(options.mpp) ? 20 : options.mpp;
 
        $.ajax({
            url: branchUrlPrefix+"/heads/"+head+"/list/commits",
            data: {
                mpp: mpp,
                page: page
            },
            success: function(commits) {
                callback(commits);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

    this.getCommitPoints = function(head, callback, args, maxDays) {
        if ( cache.getCommitPoints === undefined ) 
            cache.getCommitPoints = {};

        if ( varUtil.isNoU(args) )
            args = [];

        if ( varUtil.isNoU(maxDays) )
            maxDays = 0;

        var data = { args: JSON.stringify(args), "max-days": maxDays },
            key  = CryptoJS.MD5(head+":"+JSON.stringify(data));

        if ( cache.getCommitPoints[key] !== undefined ) {
            callback(cache.getCommitPoints[key]);
            return;
        }

        $.ajax({
            url: branchUrlPrefix+"/heads/"+head+"/points/commits",
            data: data,
            success: function(points) {
                cache.getCommitPoints[key] = points;
                callback(points);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

    this.getOrderedCommitIds = function(head, callback, args) {
        if ( cache.getOrderedCommitIds === undefined )
            cache.getOrderedCommitIds = {};

        var data = varUtil.isNoU(args) ? null : { args: JSON.stringify(args) },
            key  = CryptoJS.MD5(head+":"+JSON.stringify(data));

        if ( cache.getOrderedCommitIds[key] !== undefined ) {
            callback(cache.getOrderedCommitIds[key]);
            return;
        }

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

    this.getCodeChurnPoints = function(head, callback, args, maxDays) {
        if ( cache.getCodeChurnPoints === undefined )
            cache.getCodeChurnPoints = {};

        if ( varUtil.isNoU(args) )
            args = [];

        if ( varUtil.isNoU(maxDays) )
            maxDays = 0;

        var data = { args: JSON.stringify(args), "max-days": maxDays },
            key  = CryptoJS.MD5(head+":"+JSON.stringify(data));

        if ( cache.getCodeChurnPoints[key] !== undefined ) {
            callback(cache.getCodeChurnPoints[key]);
            return;
        }

        $.ajax({
            url: branchUrlPrefix+"/heads/"+head+"/points/codechurn",
            data: data,
            success: function(points) {
                callback(points);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

    this.getCommitsStats = function(head, callback) {
        $.ajax({
            url: branchUrlPrefix+"/heads/"+head+"/stats/short",
            success: function(stats) {
                callback(stats);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

    this.getChangesTreeKids = function(head, path, callback, callbackParams) {
        $.ajax({
            url: branchUrlPrefix+"/heads/"+head+"/chgstree/kids",
            data: { path: path },
            success: function(kids) {
                callback(kids, callbackParams);
            },
            error: function(e) {
                callback(null, e)
            }
        });
    }

    this.getChangesTreeHistory = function(head, path, page, callback, callbackParams) {
        $.ajax({
            url: branchUrlPrefix+"/heads/"+head+"/chgstree/history",
            data: { 
                path: path
            },
            success: function(results) {
                callback(results, callbackParams);
            },
            error: function(e) {
                callback(null, e)
            }
        });
    }

    this.search = function(head, type, args, page, callback) {
        if ( cache.search === undefined )
            cache.search = {};
       
        var data = { args: JSON.stringify(args), page: page },
            key  = CryptoJS.MD5(head+":"+type+":"+JSON.stringify(data));

        if ( cache.search[key] !== undefined ) {
            callback(cache.search[key]);
            return;
        }

        $.ajax({
            url: branchUrlPrefix+"/heads/"+head+"/search/"+type,
            data: data,
            success: function(results) {
                cache.search[key] = results;
                callback(results);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

    this.getCommitsCodeChurn = function(head, commits, callback) {
        if ( cache.getCommitsCodeChurn === undefined )
            cache.getCommitsCodeChurn = {};

        var data = { commits: JSON.stringify(commits) },
            key  = CryptoJS.MD5(head+":"+JSON.stringify(data));

        if ( cache.getCommitsCodeChurn[key] !== undefined ) {
            callback(cache.getCommitsCodeChurn[key]);
            return;
        }

        $.ajax({
            url: branchUrlPrefix+"/heads/"+head+"/commits/codechurn",
            data: { commits: JSON.stringify(commits) },
            success: function(results) {
                cache.getCommitsCodeChurn[key] = results;
                callback(results);
            },
            error: function(e) {
                callback(null, e);
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
            success: function(branchToHead) {
                cache.getBranchHeads[url] = branchToHead;
                callback(branchToHead);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

    this.buildSearchContext = function(sha, args, callback) {
        $.ajax({
            url: branchUrlPrefix+"/heads/"+sha+"/search/build",
            data: { args: JSON.stringify(args) },
            success: function(results) {
                callback(results);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }
}
