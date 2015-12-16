sdes.github.ui.tabs = function() {
    "use strict";

    var tabs = [],
        htmlUtil = new sdes.utils.html(),
        varUtil  = new sdes.utils.variable(),
        rightTab;

    this.getRightTab = function() {
        return rightTab;
    }

    this.add = function(params) {
        var selected = varUtil.isNoU(params.selected) ? false : params.selected,

            tab = 
                htmlUtil.createLink({
                    ariaSelected: selected,
                    cls: "js-selected-navigation-item tabnav-tab"+(selected ? " selected" : ""),
                    html: params.html,
                    append: params.append,
                    role: "tab",
                });

        tabs.push(tab);

        if ( varUtil.isNoU(params.onclick) || selected )
            return;

        if ( ! selected )
            tab.style.cursor = "pointer";

        tab.onclick = function() {
            params.onclick(params.id, tab);
        }
    }

    this.build = function() {
        var container = 
                htmlUtil.createDiv({
                    cls: "tabnav"
                }),
            nav =
                htmlUtil.createNav({
                    cls: "tabnav-tabs"
                });
        
        rightTab =
            htmlUtil.createDiv({
                cls: "tabnav-extra right"
            });

        for ( var i = 0; i < tabs.length; i++ )
            nav.appendChild(tabs[i]);

        container.appendChild(rightTab);
        container.appendChild(nav);

        return container;
    }
}
