sdes.events.page = function() {
    "use strict";

    var _this            = this,
        lastLocation     = $.extend(true, {}, window.location),
        timeout          = 200,
        varUtil          = new sdes.utils.variable(),
        callbackOnChange = [];

    this.setTimeout = function(newTimeout) {
        timeout = newTimeout;
    }

    this.addOnChange = function(callback) {
        callbackOnChange.push(callback);
    }

    this.startTracking = function(callbackNow) {
        if ( varUtil.isNoU(callbackNow) )
            callbackNow = false;

        if ( ! callbackNow && lastLocation.href === window.location.href ) {
            setTimeout(_this.startTracking, timeout);
            return;
        }

        lastLocation = $.extend(true, {}, window.location);

        var host = getHost();

        for ( var i = 0; i < callbackOnChange.length; i++ )
            callbackOnChange[i](host);

        setTimeout(_this.startTracking, timeout);
    }

    function getHost() {
        if ( window.location.host.match(/bitbucket/) )
            return "bitbucket";

        if ( window.location.host.match(/github/) )
            return "github";

        throw("GitSense: Unable to determine host provider based on URI");
    }
}
