// Default configuration settings.  Values will be overriden
// at runtime if they are defined locally by the user.
//
// See options.html and options.js for more information
//
sdes.config = {
    "servers" : [ 
        { "type": "bitbucket-api", "matches": "https://api.bitbucket.org" },
        { "type": "bitbucket", "matches": "https://bitbucket.org/*" },
        { "type": "github-api", "matches": "https://api.github.com" },
        { "type": "github", "matches": "https://github.com" },
        { "type": "gitsense", "matches": "matches": "https://api.gitsense.com" }
    ],
    "access_credentials": []
}
