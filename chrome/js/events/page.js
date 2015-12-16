sdes.events.page = function() {
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

        for ( var i = 0; i < callbackOnChange.length; i++ )
            callbackOnChange[i]();

        setTimeout(_this.startTracking, timeout);
    }
}
