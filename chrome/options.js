"use strict";

// The DOMContentLoaded event is defined at the bottom of this script and is what
// triggers this function.
function load() {
    // The following function will make the blocks in the options.html
    // page collapsible/expandable
    setupBlocks();

    // Get the locally stored settings.  If nothing is stored
    // locally, the current values that are defined by sdes.config
    // will be used.  Take a look at the js/config.js file to see
    // the default sdes.config values.
    chrome.storage.local.get(sdes.config, update);

    // The save button is defined in the options.html file
    var saveButton = document.getElementById("save-button");

    if ( saveButton === null )
        throw("GitSense: Save button does not exist");

    var updatedTextArea = false;

    function update(localConfig) {
        for ( var key in localConfig ) 
            set(key, localConfig[key]);

        updatedTextArea = true;

        function set(key, value) {
            var input = document.getElementById(key+"-input");

            // input == null means the value that is defined by
            // sdes.config.<key> can't be updated
           
            if ( input === null )
                return;

            input.value = 
                value.length === 0 ? 
                    "" : 
                    JSON.stringify(value, null, 2).replace(/__/g, "");

            input.onkeyup = check;

            if ( updatedTextArea )
                return;

            input.autocorrect = input.autocomplete = input.autocapitalize = input.spellcheck = false; 
        }

        function check() {
            var same = true;

            for ( var key in localConfig )  {
                var input = document.getElementById(key+"-input");

                if ( input === null )
                    continue;

                if ( input.value.replace(/^\s+|\s+$/, "") === localConfig[key] )
                    continue;

                same = false;
                break;
            }

            if ( same ) {
                saveButton.style.cursor = "default";
                saveButton.disabled     = true;
                saveButton.onclick      = null;
            } else {
                saveButton.style.cursor = "pointer";
                saveButton.disabled     = false;
                saveButton.onclick      = save;
            }
        }

        function save() {
            var newConfig  = {},
                changedUrl = false,
                status     = document.getElementById("save-status"),
                error      = document.getElementById("save-error");
        
            status.textContent   = "Saving ...";
            status.style.display = null;

            for ( var key in sdes.config ) {
                var input = document.getElementById(key+"-input");
        
                if ( input === null ) {
                    newConfig[key] = sdes.config[key];
                    continue;
                }

                input.value = input.value.replace(/^\s+/,"").replace(/\s+$/,"");

                if ( input.value === "" ) {
                    newConfig[key] = [];
                    continue;
                }

                var rules = null;

                try {
                    rules = JSON.parse(input.value);
                } catch ( e ) {
                    renderError(key, e.message);
                    return;
                }

                switch ( key )  {
                    case "page_rules": {
                        if ( ! validPageRules(key, rules) )
                            return;

                        break;
                    }
                    case "auth_rules":
                        if ( ! validAuthRules(key, rules) )
                            return;

                        break;
                    default:
                        throw("Unrecognized key '"+key+"'");
                }

                newConfig[key] = rules;
            }
       
            console.dir(newConfig);
            return;

            chrome.storage.local.set(
                newConfig,
                function() {
                    status.textContent = "Saved";
                    document.getElementsByClassName("reminder")[0].style.display = "block";
        
                    setTimeout(
                        function() { 
                            status.textContent   = ""; 
                            status.style.display = "none";
                            saveButton.disabled  = true;
                            update(newConfig);
                        }, 
                        750
                    ); 
                }
            );

            function validPageRules(key, rules) {
                if ( rules.length === undefined ) {
                    renderError(
                        key,
                        "Expecting an array but found "+typeof(rules)
                    );

                    return false;
                }

                var atts = [ "type", "matches", "host_api", "gitsense_api" ];

                for ( var i = 0; i < rules.length; i++ ) {
                    var rule = rules[i];

                    for ( var j = 0; j < atts.length; j++ ) {
                        var att   = atts[j];
                        var value = rule[att];

                        if ( value === undefined ) {
                            renderError(
                                key,
                                "Rule "+(i+1)+" is missing the "+
                                "\""+att+"\" attribute"
                            );

                            return false;
                        }

                        var type = typeof(value);

                        if ( type !== "string" ) {
                            renderError(
                                key,
                                input.value,
                                "Expecting a string value for the \""+att+"\" attribute "+
                                "but found a "+type+" type instead"
                            );

                            return false;
                        }
                    }
                }

                return true;
            }

            function validAuthRules(key, rules) {
                if ( rules.length === undefined ) {
                    renderError(
                        key,
                        "Expecting an array but found "+typeof(rules)
                    );

                    return false;
                }

                var atts = [ "matches", "username", "secret" ];

                for ( var i = 0; i < rules.length; i++ ) {
                    var rule = rules[i];

                    if ( rule.type === undefined ) {
                        renderError(
                            key,
                            "Rule "+(i+1)+" is missing the \"type\" attribute"
                        );
    
                        return false;
                    }

                    for ( var j = 0; j < atts.length; j++ ) {
                        var att   = atts[j];
                        var value = rule[att];

                        if ( att === "username" && rule.type === "gitsense" )
                            continue;

                        if ( value === undefined ) {
                            renderError(
                                key,
                                "Rule "+(i+1)+" is missing the "+
                                "\""+att+"\" attribute"
                            );

                            return false;
                        }

                        var type = typeof(value);

                        if ( type !== "string" ) {
                            renderError(
                                key,
                                "Expecting a string value for the \""+att+"\" attribute "+
                                "but found a "+type+" type instead"
                            );

                            return false;
                        }
                    }
                }

                return true;
            }

            function renderError(type, message) {
                status.style.display = "none";
                error.style.display = "block";
    
                var temp = type.split("_"),
                    rule = temp[0] === "auth" ? "authentication rules" : temp.join(" ");

                error.innerHTML = 
                    "<strong>Error</strong><br>"+
                    "<pre style='white-space:pre-wrap;line-height:1.5'>"+
                        message+" in \""+rule+"\"</pre>";
            }
        }
    }

    function setupBlocks(){ 
        var elems = document.getElementsByClassName("block");

        for ( var i = 0; i < elems.length; i++ ) {
            var header = elems[i++];
            var body   = elems[i];

            init(header,body);
        }

        function init(header, body) {
            var triangle = header.children[0],
                title    = header.children[1];

            title.onclick = function() {
                if ( triangle.className.match(/down/) ) {
                    body.style.display = "none";
                    triangle.setAttribute("class", triangle.className.replace(/down/, "right"));
                } else {
                    body.style.display = "block";
                    triangle.setAttribute("class", triangle.className.replace(/right/, "down"));
                }
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", load);
