sdes.ui.pills = function(options) {
    "use strict";

    if ( options === undefined )
        options = {};

    var htmlUtil = new sdes.utils.html(),
        varUtil  = new sdes.utils.variable(),

        selectedBackgroundColor = 
            varUtil.isNoU(options.selectedBackgroundColor) ? 
                "#4078c0" : 
                options.selectedBackgroundColor,

        selectedBorderColor =
            varUtil.isNoU(options.selectedBorderColor) ?
            "#4078c0" :
            options.selectedBorderColor,

        selectedColor =
            varUtil.isNoU(options.selectedColor) ?
            "white" :
            options.selectedColor,

        backgroundColor = 
            varUtil.isNoU(options.backgroundColor) ? 
                "white" : 
                options.backgroundColor,

        borderColor =
            varUtil.isNoU(options.borderColor) ?
            "#e5e5e5" :
            options.borderColor,

        color =
            varUtil.isNoU(options.color) ?
            "#666" :
            options.color,

        pills = [];

    this.add = function(params) {
        pills.push(params);
    }

    this.build = function() {
        var body = htmlUtil.createDiv(),
            last = pills.length - 1,
            i;

        for (i = 0; i < pills.length; i++ )
            addPill(pills[i], i);

        return body; 

        function addPill(pill, index) {
            var span = 
                htmlUtil.createSpan({
                    text: pill.text,
                    html: pill.html,
                    style: {
                        border: 
                            pill.selected ? 
                                "1px solid "+selectedBorderColor : 
                                "1px solid "+borderColor,

                        backgroundColor: 
                            pill.selected ? 
                                selectedBackgroundColor : 
                                backgroundColor,

                        color: pill.selected ? selectedColor : color,
                        padding: "8px 17px",
                        fontWeight: "bold",
                        borderTopLeftRadius: i === 0 ? "3px" : null,
                        borderTopRightRadius: i === last ? "3px" : null,
                        borderBottomLeftRadius: i === 0 ? "3px" : null,
                        borderBottomRightRadius: i === last ? "3px" : null,
                        position: "relative",
                        left: i == 0 ? null : "-"+(index)+"px",
                        zIndex: i+1,
                        cursor: pill.selected ? "default" : "pointer"
                    }
                });

            body.appendChild(span);

            if ( ! varUtil.isNoU(pill.onclick) )
                span.onclick = clicked;  

            if ( pill.selected )
                return;
    
            span.onmouseover = function() { this.style.backgroundColor = "#f5f5f5"; };
            span.onmouseout  = function() { this.style.backgroundColor = backgroundColor; };

            function clicked() {
                pill.onclick(pill);
            }
        }
    }
}
