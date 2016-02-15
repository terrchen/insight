sdes.utils.config = function() {
    var _this = this;

    this.getRule = function() {
        for ( var i = 0; i < sdes.config.page_rules.length; i++ ) {
            var rule = sdes.config.page_rules[i],
                patt = new RegExp(rule.matches.replace("*", ".*"));

            if ( window.location.href.match(patt) )
                return rule;
        }

        throw("GitSense: No rule found for current URL: "+window.location.href);
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
