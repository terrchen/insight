sdes.github.ui.input.group = function(params) {
    var htmlUtil     = new sdes.utils.html(),
        varUtil      = new sdes.utils.variable(),
        align        = varUtil.isNoU(params.align) ? "left" : params.align,
        value        = varUtil.isNoU(params.value) ? "" : params.value,
        placeholder  = varUtil.isNoU(params.placeholder) ? "" : params.placeholder,
        iconCls      = varUtil.isNoU(params.iconCls) ? null : params.iconCls,
        iconStyle    = varUtil.isNoU(params.iconStyle) ? null : params.iconStyle;
        width        = varUtil.isNoU(params.width) ? "200px" : params.width,
        monoSpace    = varUtil.isNoU(params.monoSpace) ? false : params.monoSpace;

    this.build = function() {
        var container = 
                htmlUtil.createDiv({
                    cls: "input-group "+align,
                    style: {
                        width: width
                    }
                }),

            input = 
                htmlUtil.createTextInput({
                    cls: 
                        "input-mini text-small text-muted "+
                        (monoSpace ? "input-monospace" : ""),
                    value: value,
                    placeholder: placeholder
                }),

            icon = 
                htmlUtil.createSpan({
                    cls: iconCls,
                    style: iconStyle
                }),

            button =
                htmlUtil.createButton({
                    append: icon,
                    cls: "btn btn-sm"
                }),

            span = 
                htmlUtil.createSpan({
                    append: button,
                    cls: "input-group-button"
                });

        container.appendChild(input);
        container.appendChild(span);

        $(input).keypress(function(e) {
            if (e.which == 13)
                pressedEnter();
        });

        return container;

        function pressedEnter() {
            if ( varUtil.isNoU(params.onenter) )
                return;

            params.onenter(input.value, input);
        }
    }
}
