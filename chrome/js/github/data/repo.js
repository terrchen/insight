sdes.github.data.repo = function(owner, name) {
    var apiUrl = sdes.config.githubApiUrl;

    this.get = function(callback) {
        $.ajax({
            url: apiUrl+"/repos/"+owner+"/"+name,
            success: function (data) {
                callback(data);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

    this.getLatestBranchCommit = function(branch, callback) {
        $.ajax({
            url: apiUrl+"/repos/"+owner+"/"+name+"/commits/"+branch,
            success: function (commit) {
                callback(commit);
            },
            error: function(e) {
                callback(null, e);
            }
        });
    }

}
