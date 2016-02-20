sdes.utils.config = function() {
    var _this = this;

    this.getRule = function() {
        for ( var i = 0; i < sdes.config.pageRules.length; i++ ) {
            var rule = sdes.config.pageRules[i],
                patt = new RegExp(rule.matches.replace("*", ".*"));

            if ( window.location.href.match(patt) )
                return rule;
        }

        return null;
    }

    this.getHost = function() {
        return _this.getRule().type;
    }

    this.getBitbucketApi = function() {
        return _this.getRule().host.api;
    }

    this.getGitSenseApi = function() {
        return _this.getRule().gitsense.api;
    }

    this.getGitHubApi = function() {
        return _this.getRule().host.api;
    }
}
