sdes.github.ui.btngrp = function(_params) {
   "use strict";

    var links    = [],
        htmlUtil = new sdes.utils.html(),
        varUtil  = new sdes.utils.variable(),
        params   = varUtil.isNoU(_params) ? {} : _params,
        align    = varUtil.isNoU(params.align) ? "left" : params.align;

    this.setAlign = function(value) {
        align = value;
    }

    this.add = function(params) {
        var link = htmlUtil.createLink({
            cls: 
                "btn btn-sm "+
                (params.selected ? "selected" : "")+
                (params.disabled ? "disabled" : ""),
            text: params.label,
            style: {
                cursor: params.selected || params.disabled ? "default" : "pointer" 
            }
        });

        link.onclick = function() {
            if ( varUtil.isNoU(params.onclick) )
                return;

            params.onclick(params);
        }

        links.push(link);
    }

    this.build = function() {
        var container = 
            htmlUtil.createDiv({
                cls: "btn-group "+align
            }),
        i;

        for ( i = 0; i < links.length; i++ )
            container.appendChild(links[i]);

        return container;
    }
}
