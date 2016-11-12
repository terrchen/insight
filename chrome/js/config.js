// Default configuration settings.  Values will be overriden
// at runtime if they are defined locally by the user.
//
// See options.html and options.js for more information
//
sdes.config = {
    "routingRules" : [ 
        {
            "matches": "https://github.com/*",
            "host": {
                "type": "github",
                "api": "https://api.github.com",
                "secret": "",
                "xFrameOptions": "DENY"
            },
            "gitsense": {
                "baseUrl": "https://public.gitsense.com",
                "secret": ""
            }
        },
        {
            "matches": "https://gitlab.com/*",
            "host": {
                "type": "gitlab",
                "api": "https://gitlab.com/api/v3",
                "secret": "",
                "xFrameOptions": "DENY"
            },
            "gitsense": {
                "baseUrl": "https://public.gitsense.com",
                "secret": ""
            }
        }
    ]
}
