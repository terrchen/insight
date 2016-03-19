sdes.utils.config = function() {
    var _this = this;

    this.getRule = function() {
        for ( var i = 0; i < sdes.config.routingRules.length; i++ ) {
            var rule = sdes.config.routingRules[i],
                patt = new RegExp(rule.matches.replace("*", ".*"));

            if ( window.location.href.match(patt) )
                return rule;
        }

        return null;
    }

    this.getHost = function() {
        var rule = _this.getRule();
        
        if ( rule === null )
            return null;

        return rule.type;
    }

    this.getGitSenseApi = function() {
        var rule = _this.getRule();
        
        if ( rule === null )
            return null;

        return rule.gitsense.api;
    }

    this.getBitbucketApi = function() {
        var rule = _this.getRule();
        
        if ( rule === null )
            return null;

        return rule.host.api;
    }

    this.getGitHubApi = function() {
        var rule = _this.getRule();
        
        if ( rule === null )
            return null;

        return rule.host.api;
    }
}
