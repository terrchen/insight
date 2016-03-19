// Default configuration settings.  Values will be overriden
// at runtime if they are defined locally by the user.
//
// See options.html and options.js for more information
//
sdes.config = {
    "routingRules" : [ 
        { 
            "matches": "https://bitbucket.org/*",
            "host": {
                "type": "bitbucket",
                "api": "https://api.bitbucket.org",
                "username": "",
                "secret": ""
            },
            "gitsense": {
                "api": "https://api.gitsense.com",
                "hostId": "bitbucket",
                "secret": "",
                "commitDecorator": ""
            }
        },
        {
            "matches": "https://github.com/*",
            "host": {
                "type": "github",
                "api": "https://api.github.com",
                "username": "",
                "secret": ""
            },
            "gitsense": {
                "api": "https://api.gitsense.com",
                "hostId": "github",
                "secret": "",
                "commitDecorator": ""
            }
        }
    ]
}
