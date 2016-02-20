sdes.github.ui.input.search = function(params) {
    var htmlUtil     = new sdes.utils.html(),
        varUtil      = new sdes.utils.variable(),
        align        = varUtil.isNoU(params.align) ? "left" : params.align,
        value        = varUtil.isNoU(params.value) ? "" : params.value,
        placeholder  = varUtil.isNoU(params.placeholder) ? "" : params.placeholder,
        size         = varUtil.isNoU(params.size) ? null : params.size,
        go,
        input;

    this.getInputElement = function() {
        return input;
    }

    this.dokeyup = function() { 
        onkeyup();
    }

    this.build = function() {
        var container = 
                htmlUtil.createDiv({
                    cls: align
                }),

            search = 
                htmlUtil.createSpan({
                    cls: "octicon octicon-search",
                    style: {
                        color: "#bbb",
                        position: "relative",
                        left: "24px",
                        top: "1px"
                    }
                });

        go = 
            htmlUtil.createSpan({
                cls:
                    "btn octicon "+
                    (varUtil.isNoU(params.icon) ? " octicon-search" : params.icon )+
                    (varUtil.isNoU(params.value) ? " disabled" : ""),
                style: {
                    fontSize: "16px",
                    borderLeftWidth: "0px",
                    borderTopLeftRadius: "0px",
                    borderBottomLeftRadius: "0px",
                    minWidth: "33px",
                    textAlign: "center",
                    top: params.isEnterprise ? null : "-8px",
                    padding: params.isEnterprise ? "8px" : null
                }
            });

        input = htmlUtil.createTextInput({
            cls: "subnav-search-input input-contrast",
            value: value,
            placeholder: placeholder,
            disabled: params.disable,
            style: {
                borderTopRightRadius: "0px",
                borderBottomRightRadius: "0px",
                paddingLeft: "10px"
            }
        });

        container.appendChild(input);
        container.appendChild(go);

        go.onclick = pressedEnter;

        $(input).keypress(function(e) {
            if (e.which == 13)
                pressedEnter();
        });

        $(input).keyup(function(e) {
            onkeyup();
        });

        return container;

    }

    function pressedEnter() {
        if ( varUtil.isNoU(params.onenter) )
            return;

        params.onenter(input.value, input);
    }

    function onkeyup() {
        if ( input.value.match(/^\s*$/) )
            go.setAttribute("class", go.className+" disabled");
        else
            go.setAttribute("class", go.className.replace("disabled", ""));
    }
}
