// Default configuration settings.  Values will be overriden
// at runtime if they are defined locally by the user.
//
// See options.html and options.js for more information
//
sdes.config = {
    "page_rules" : [ 
        { 
            "matches": "https://bitbucket.org/*",
            "host": {
                "type": "bitbucket",
                "api": "https://api.bitbucket.org"
            },
            "gitsense": {
                "api": "https://api.gitsense.com",
                "hostId": "bitbucket"
            }
        },
        { 
            "matches": "https://github.com/*",
            "host": {
                "type": "github",
                "api": "https://api.github.com"
            },
            "gitsense": {
                "api": "https://api.gitsense.com",
                "hostId": "github"
            }
        }
    ]
}
