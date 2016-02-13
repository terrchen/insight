// Default configuration settings.  Values will be overriden
// at runtime if they are defined locally by the user.
//
// See options.html and options.js for more information
//
sdes.config = {
    "page_rules" : [ 
        { 
            "type": "bitbucket", 
            "matches": "https://bitbucket.org/*",
            "host_api": "https://api.bitbucket.org",
            "gitsense_api": "https://api.gitsense.com"
        },
        { 
            "type": "github", 
            "matches": "https://github.com/*",
            "host_api": "https://api.github.com",
            "gitsense_api": "https://api.gitsense.com"
        }
    ],
    "auth_rules": []
}
