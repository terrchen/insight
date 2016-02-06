sdes.github.ui.subnav = function(_params) {
    "use strict";

    var links    = [],
        idToLink = {},
        htmlUtil = new sdes.utils.html(),
        varUtil  = new sdes.utils.variable(),
        params   = varUtil.isNoU(_params) ? {} : _params,
        align    = varUtil.isNoU(params.align) ? "left" : params.align;

    this.setAlign = function(value) {
        align = value;
    }

    this.add = function(params) {
        if ( varUtil.isNoU(params.selected) )
            params.selected = false;

        if ( varUtil.isNoU(params.show) )
            params.show = true;

        var link = htmlUtil.createLink({
            cls: 
                "js-selected-navigation-item"+
                (params.selected ? " selected " : " ")+
                "subnav-item",
            ariaSelected: params.selected,
            text: params.text,
            html: params.html,
            style: {
                cursor: params.selected ? "default" : "pointer",
                display: params.show ? null : "none"
            }
        });

        idToLink[params.id] = link;

        link.onclick = function() {
            if ( varUtil.isNoU(params.onclick) )
                return;

            params.onclick(params);
        }

        links.push(link);
    }

    this.getLink = function(id) {
        return idToLink[id];
    }

    this.build = function() {
        var container = 
                htmlUtil.createDiv({
                    cls: "subnav-links "+align,
                    role: "navigation"
                }),
            i;

        for ( i = 0; i < links.length; i++ )
            container.appendChild(links[i]);

        return container;
    }
}
