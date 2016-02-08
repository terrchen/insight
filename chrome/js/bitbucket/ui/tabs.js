sdes.bitbucket.ui.tabs = function() {
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
                htmlUtil.createList({
                    cls: "menu-item "+(selected ? " active-tab" : ""),
                }),

            link = 
                htmlUtil.createLink({
                    html: params.html,
                    append: params.append,
                    style: {
                        cursor: selected ? "default"  : "pointer",
                        borderTop: selected ? null : "0px",
                        backgroundColor: "#fff",
                        paddingTop: "8px",
                        paddingBottom: "8px",
                        paddingLeft: "14px",
                        paddingRight: "14px"
                    }
                });

        tab.link = link;
        tab.selected = selected;

        tab.appendChild(link);

        tabs.push(tab);

        if ( varUtil.isNoU(params.onclick) || selected )
            return;

        tab.onclick = function() {
            params.onclick(params.id, tab);
        }
    }

    this.build = function() {
        var container = 
                htmlUtil.createDiv({
                    cls: "aui-tabs horizontal-tabs aui-tabs-disabled",
                    color: "#777"
                }),
            tabsBody =
                htmlUtil.createUnorderedList({
                    cls: "tabs-menu",
                    style: {
                        listStyleType: "none",
                        position: "relative",
                        top: "1px"
                    }
                }),
    
            pane =
                htmlUtil.createDiv({
                    cls: "tabs-pane active-pane",
                    style: {
                        paddingTop: "5px"
                    }
                });
        
        rightTab =
            htmlUtil.createList({
                style: {
                    cssFloat: "right",
                    paddingTop: "8px"
                }
            });

        var tab,
            i;

        for ( i = 0; i < tabs.length; i++ )  {
            tab = tabs[i];

            if ( i === 0 )
                tab.style.marginLeft = "0px";

            if ( ! tab.selected ) {
                if  ( i === 0 || ! tabs[i-1].selected )
                    tab.link.style.borderLeft = "0px";

                if ( tabs[i+1] === undefined || ! tabs[i+1].selected )
                    tab.link.style.borderRight = "0px";
            }

            tabsBody.appendChild(tab);
        }

        tabsBody.appendChild(rightTab);
        container.appendChild(tabsBody);
        container.appendChild(pane);

        return container;
    }
}
