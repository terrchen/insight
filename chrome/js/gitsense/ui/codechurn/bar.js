sdes.gitsense.ui.codechurn.bar = function(options) {
    if ( options === undefined )
        options = {};

    var htmlUtil    = new sdes.utils.html(),
        varUtil     = new sdes.utils.variable(),
        scale       = varUtil.isNoU(options.scale) ? 3 : options.scale,
        height      = varUtil.isNoU(options.height) ? 5 : options.height,
        padding     = varUtil.isNoU(options.padding) ? null : options.padding,
        width       = varUtil.isNoU(options.width) ? "100%" : options.width,
        left        = varUtil.isNoU(options.left) ? null : options.left,
        position    = varUtil.isNoU(options.position) ? null : options.position,
        colors      = { add: "#55a532", chg: "#08c", del: "#bd2c00" }
        typeOrder   = [ "loc", "sloc"],
        actionOrder = [ "add", "chg", "del"];

    this.create = function(churn) {
        return create(churn);
    }

    function create(churn)
    {
        var container = 
                htmlUtil.createDiv({ 
                    style: { 
                        position: position,
                        left: left,
                        width: width,
                        overflow: "hidden"
                    } 
                }),
            add,
            chg,
            del,
            stat,
            i,
            j,
            table, 
            row,
            cell;

        for ( i = 0; i < typeOrder.length; i++ )
        {
            type = typeOrder[i];
            stat = churn[type];

            if ( varUtil.isNoU(stat) )
                stat = { add: -1, del: -1, chg: -1 };

            table = 
                htmlUtil.createTable({
                    style: {
                        marginTop: i === 0 ? "8px" : "3px"
                    }
                });

            row = htmlUtil.createTableRow();

            for ( j = 0; j < actionOrder.length; j++ ) 
            {
                action = actionOrder[j];
                value  = stat[action] * scale;

                cell =
                    htmlUtil.createTableCell({
                        html: "<div style='width:"+value+"px;height:"+height+"px'></div>",
                        style: {
                            width: value+"px",
                            backgroundColor: colors[action]
                        }
                    });

                row.appendChild(cell);
            }

            if ( stat.total === 0 )
                continue;

            row.appendChild(
                htmlUtil.createTableCell({
                    html: 
                        "<div style='height:"+height+"px;background-color:#fafafa;"+
                        "border:1px solid #e1e1e1;width:100%;'></div>",
                    style: {
                        width: "100%" 
                    }
                })
            );

            table.appendChild(row);

            container.appendChild(table);
        }

        return container;
    }
}
