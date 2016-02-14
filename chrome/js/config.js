// Default configuration settings.  Values will be overriden
// at runtime if they are defined locally by the user.
//
// See options.html and options.js for more information
//
sdes.config = {
    "page_rules" : [ 
        { 
            "__type": "bitbucket", 
            "__matches": "https://bitbucket.org/*",
            "host": {
                "api": "https://api.bitbucket.org",
                "username": "",
                "secret": ""
            },
            "gitsense": {
                "api": "https://api.gitsense.com",
                "secret": ""
            }
        },
        { 
            "__type": "github", 
            "__matches": "https://github.com/*",
            "host": {
                "api": "https://api.github.com",
                "username": "",
                "secret": ""
            },
            "gitsense": {
                "api": "https://api.gitsense.com",
                "secret": ""
            }
        }
    ]
}
