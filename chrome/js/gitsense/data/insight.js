sdes.gitsense.data.insight = function(rule, token) {
    "use strict";

    var varUtil = new sdes.utils.variable(),
        cache   = sdes.cache.gitsense.data.insight,
        baseUrl = rule.gitsense.baseUrl+"/insight",
        auth    = "token:"+token;

    if ( varUtil.isNoU(cache) )
        cache = {};

    this.getBranchHeads = function(branches, callback) {
        var cacheId = "heads:"+JSON.stringify(branches);

        if ( 
            ! varUtil.isNoU(cache[cacheId]) && 
            cache[cacheId].expiresAt > new Date().getTime()
        ) {
            callback(cache[cacheId].branchToLatest);
            return;
        }

        var data = { b: branches.join("::"), auth: auth };

        $.ajax({
            url: baseUrl+"/heads",
            data: data,
            success: function(branchToLatest) {
                cache[cacheId] = {
                    branchToLatest: branchToLatest,
                    expiresAt: new Date().getTime() + 60000 * 5
                };

                callback(branchToLatest);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

    this.search = function(type, branches, args, page, mpp, callback) {
        var sbranches = $.extend(true, [], branches);
        sbranches.sort();

        for ( var i = 0; i < branches.length; i++ ) {
            var branch = branches[i];

            if ( ! branch.match("@@@") )
                throw("Missing branch head commit for the '"+branch+"' branch");
        }
           
        var cacheId = 
                "search:"+
                type+":"+
                JSON.stringify(sbranches)+";"+
                JSON.stringify(args)+":"+
                page+":"+
                mpp;

        if ( cache[cacheId] !== undefined ) {
            callback(cache[cacheId]);
            return;
        }

        var data = { b: branches.join("::"), page: page, mpp: mpp, auth: auth };

        if ( args.length !== 0 ) 
            data.q = args.join("+");

        $.ajax({
            url: baseUrl+"/search/"+type,
            data: data,
            success: function(results) {
                cache[cacheId] = results;
                callback(results);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

    this.stat = function(host, owner, repo, callback) {
        $.ajax({
            url: baseUrl+"/"+host+"/repos/"+owner+"/"+repo+"/stat",
            success: function(result) {
                var temp = result.split(":");
                callback(parseInt(temp[0]), parseInt(temp[1]), temp[2]);
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
