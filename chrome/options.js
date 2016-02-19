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

    var updatedTextArea = false,

        isValidHostType = { 
            "bitbucket": true, 
            "github": true, 
            "github-enterprise": true
        };

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
                    JSON.stringify(value, null, 2);

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

                switch(key) {
                    case "page_rules":
                        var rules = null;

                        try {
                            rules = JSON.parse(input.value);
                        } catch ( e ) {
                            continue;
                        }

                        var currentJson = JSON.stringify(localConfig[key]);
                        var thisJson    = JSON.stringify(rules);

                        if ( currentJson === thisJson )
                            continue;

                        break;
                    default:
                        throw("Unrecognized key '"+key+"'");
                }

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
                statusBody = document.getElementById("save-status"),
                errorBody  = document.getElementById("save-error");
        
            statusBody.textContent   = "Saving ...";
            statusBody.style.display = null;

            for ( var key in sdes.config ) {
                var input = document.getElementById(key+"-input");
        
                if ( input === null ) {
                    newConfig[key] = sdes.config[key];
                    continue;
                }

                switch ( key )  {
                    case "page_rules": 
                        var rules = getPageRules(input.value);

                        if ( typeof(rules) === "string" ) {
                            renderError("page rules", rules);
                            return;
                        }

                        newConfig[key] = rules;
                        break;
                    default:
                        throw("Unrecognized key '"+key+"'");
                }
            }

            errorBody.style.display = "none";
       
            chrome.storage.local.set(
                newConfig,
                function() {
                    statusBody.textContent = "Saved";
                    document.getElementsByClassName("reminder")[0].style.display = "block";
        
                    setTimeout(
                        function() { 
                            statusBody.textContent   = ""; 
                            statusBody.style.display = "none";
                            saveButton.disabled  = true;
                            update(newConfig);
                        }, 
                        750
                    ); 
                }
            );

            function getPageRules(json) {
                json = json.replace(/^\s+/,"").replace(/\s+$/,"");

                if (json === "" )
                    return "No rules found";

                var rules = null;

                try {
                    rules = JSON.parse(json);
                } catch ( e ) {
                    return e.message;
                }

                if ( rules.length === undefined )
                    return "Expected an array but found "+typeof(rules);

                var atts = ["matches", "gitsense", "host" ];

                for ( var ruleIdx = 0; ruleIdx < rules.length; ruleIdx++ ) {
                    var rule    = rules[ruleIdx],
                        ruleNum = ruleIdx + 1;
  
                    for ( var attIdx = 0; attIdx < atts.length; attIdx++ ) {
                        var att = atts[attIdx];

                        if ( rule[att] === undefined )
                            return "Missing \""+att+"\" attribute in rule "+ruleNum;

                        var attType = typeof(rule[att]);

                        if ( 
                            (att === "type" || att === "matches") &&
                            attType !== "string" 
                        ) {
                            var error = 
                                "Expected a string value for the \""+att+"\" attribute "+
                                "but found a "+attType+" type instead in rule "+ruleNum;

                            return error;
                        }

                        if ( 
                            (att === "gitsense" || att === "host") &&
                            attType !== "object" 
                        ) {

                            var error = 
                                "Expected an object type for the \""+att+"\" attribute "+
                                "but found a "+attType+" type instead";

                            return error;
                        }

                        switch(att) {
                            case "matches":
                                // Don't need to do anything else. We just needed
                                // to know it's a string, which was confirmed earlier.
                                break;
                            case "gitsense":
                                var gitsense     = rule[att],
                                    gitsenseAtts = ["api", "hostId" ];

                                for ( var i = 0; i < gitsenseAtts.length; i++ ) {
                                    var gitsenseAtt = gitsenseAtts[i];

                                    if ( gitsense[gitsenseAtt] === undefined )  {
                                        var error = 
                                            "Missing gitsense "+gitsenseAtt+" attribute in "+
                                            "in rule "+ruleNum;

                                        return error;
                                    }

                                    var type = typeof(gitsense[gitsenseAtt]);

                                    if ( type !== "string" ) {
                                        var error = 
                                            "Expected a string value for gitsense "+
                                            gitsenseAtt+", but found a "+type+" type "+
                                            "instead in rule "+ruleNum;

                                        return error;
                                    }

                                    // Remove white spaces and trailing slash
                                    gitsense[gitsenseAtt] = 
                                        gitsense[gitsenseAtt]
                                            .replace(/\s/g,"")
                                            .replace(/\/$/,"");
                                }

                                break;
                            case "host":
                                var host     = rule[att],
                                    hostAtts = ["api", "type" ];

                                for ( var i = 0; i < hostAtts.length; i++ ) {
                                    var hostAtt = hostAtts[i];

                                    if ( host[hostAtt] === undefined )  {
                                        var error = 
                                            "Missing host "+hostAtt+" attribute in "+
                                            "in rule "+ruleNum;

                                        return error;
                                    }

                                    var type = typeof(host[hostAtt]);

                                    if ( type !== "string" ) {
                                        var error = 
                                            "Expected a string value for host "+
                                            hostAtt+", but found a "+type+" type "+
                                            "instead in rule "+ruleNum;

                                        return error;
                                    }

                                    // Remove white spaces and trailing slash
                                    host[hostAtt] = 
                                        host[hostAtt]
                                            .replace(/\s/g,"")
                                            .replace(/\/$/,"");

                                    if ( hostAtt !== "type" )
                                        continue;

                                    var hostType = host[hostAtt];

                                    if ( isValidHostType[hostType] !== undefined )
                                        continue;

                                    var error = 
                                            "Found invalid host type \""+hostType+"\" "+
                                            "in rule "+ruleNum;

                                    return error;
                                }

                                break;
                            default:
                                throw("Unrecognized attribute '"+att+"'");
                        }
                    }
                }

                return rules;
            }

            function renderError(rules, message) {
                statusBody.style.display = "none";
                errorBody.style.display = "block";
    
                errorBody.innerHTML = 
                    "<strong>Error</strong><br>"+
                    "<pre style='white-space:pre-wrap;line-height:1.5'>"+
                        message+" in \""+rules+"\"</pre>";
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
