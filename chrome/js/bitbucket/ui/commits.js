sdes.bitbucket.ui.commits = function(owner, repo, renderTo, groupHeaderOpacity, groupTitlePrefix) {
    var htmlUtil = new sdes.utils.html(),
        varUtil  = new sdes.utils.variable(),
        bbrepo   = new sdes.bitbucket.data.repo(owner, repo),
        commits  = [],
        lastDate,
        group;

    this.add = function(commit, options) {
        if ( options === undefined )
            options = {};

        var date      = new moment(commit.commitTime).format("ll"),
            authorMd5 = CryptoJS.MD5(commit.authorEmail),
            gravatar  = "https://www.gravatar.com/avatar/"+authorMd5,

            body = 
                htmlUtil.createDiv({
                    style: {
                        opacity: varUtil.isNoU(options.opacity) ? null : options.opacity,
                        backgroundColor: 
                            varUtil.isNoU(options.backgroundColor) ? 
                                null : options.backgroundColor,
                        pointerEvents: 
                            ! varUtil.isNoU(options.opacity) && options.opacity === 0 ?
                                "none" : null,
                        paddingTop: "10px",
                        paddingBottom: "10px"
                    }
                }),

            avatar =
                htmlUtil.createImage({
                    cls: "avatar",
                    src: gravatar,
                    title: "Click avatar to sync image with Bitbucket",
                    style: {
                        height: "36px",
                        width: "36px",
                        borderRadius: "5px"
                    }
                }),

            avatarCell =
                htmlUtil.createDiv({
                    append: avatar,
                    style: {
                        verticalAlign: "top",
                        display: "table-cell"
                    }
                }),

            titleLink =
                htmlUtil.createLink({
                    href: "/"+owner+"/"+repo+"/commits/"+commit.name,
                    html: commit.title,
                    target: varUtil.isNoU(options.target) ? null : options.target,
                    style: {
                        color: "black",
                        fontSize: "15px",
                        fontWeight: "bold"
                    }
                }),

            time = 
                htmlUtil.createSpan({
                    html: getCommitterMessage(commit),
                    style: {
                        color: "#888",
                        fontSize: "13px"
                    }
                }),

            br = htmlUtil.createBreak({}),

            detailsCell =
                htmlUtil.createDiv({
                    append: [ titleLink, br, time ],
                    style: {
                        display: "table-cell",
                        paddingLeft: "10px",
                        lineHeight: 1.4,
                        position: "relative",
                        top: "-3px"
                    }
                }),

            msgText =
                htmlUtil.createPre({
                    html: commit.message,
                    style: {
                        borderLeft: "1px solid #ccc",
                        padding: "5px",
                        paddingLeft: "10px",
                        paddingRight: "0px",
                        overflow: "auto",
                        whiteSpace: "pre-wrap"
                    }
                }),

            msg =
                htmlUtil.createDiv({
                    append: msgText,
                    style: {
                        display: options.showMsg ? "block" : "none",
                        paddingLeft: "48px",
                        paddingTop: "5px"
                    }
                }),

            branches =
                htmlUtil.createDiv({
                    style: {
                        position: "relative",
                        left: "-47px",
                        top: "2px",
                        paddingTop: "10px",
                        width: "100%",
                        color: "#666",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis"
                    }
                });

        body.appendChild(avatarCell);
        body.appendChild(detailsCell);
        body.appendChild(msg);

        if ( options.append !== undefined ) {
            if ( options.append.length === undefined ) {
                body.appendChild(options.append);
            } else {
                for ( var i = 0; i < options.append.length; i++ ) 
                    body.appendChild(options.append[i]);
            }
        }

        if ( options.onmouseover !== undefined )
            body.onmouseover = options.onmouseover;

        if ( options.onmouseout !== undefined )
            body.onmouseout = options.onmouseout;

        if ( lastDate !== date )
            createNewGroup(date);
            
        lastDate = date;

        group.appendChild(body);

        updateAvatar(commit.authorEmail, avatar);

        // Everything from here on is very quick hack and
        // will change in the future.
    
        avatar.style.cursor = "pointer";

        avatar.onclick = function() {
            var img = this;

            bbrepo.getCommit(
                commit.name, 
                function(bbcommit, error) {
                    if ( error !== undefined )
                        throw(error);

                    if ( varUtil.isNoU(bbcommit.author.user) ) {
                        console.warn("No Bitbucket mapping for commit author "+commit.authorEmail);
                        return; 
                    }

                    var avatars = {};

                    avatars[commit.authorEmail] = bbcommit.author.user.links.avatar.href;

                    new sdes.gitsense.data.users().storeAvatars(avatars);

                    img.src = bbcommit.author.user.links.avatar.href;
                }
            );
        }
    }

    function createNewGroup(date) {
        var div = 
                htmlUtil.createDiv({ 
                    html: 
                        "<span class='aui-icon aui-icon-small icon-commits' "+
                            "style='opacity:.5;margin-right:8px;"+
                            "position:relative;left:-8px;'></span>"+
                        (
                            varUtil.isNoU(groupTitlePrefix) ? 
                                "Commits on" : 
                                groupTitlePrefix
                        )+
                        " "+date,
                    style: {
                        opacity: varUtil.isNoU(groupHeaderOpacity) ? null : groupHeaderOpacity,
                        fontSize: "13px",
                        color: "#777",
                        paddingTop: "5px",
                        paddingBottom: "5px"
                    }
                });

        group = 
            htmlUtil.createDiv({
                style: {
                    paddingLeft: "27px",
                    borderLeft: "1px solid #ccc"
                }
            });

        renderTo.appendChild(div);
        renderTo.appendChild(group);
    }

    function getCommitterMessage(commit) {
        var msg = 
                new moment(commit.commitTime).fromNow()+
                " by "+commit.committerEmail;

        return msg;
    } 

    function updateAvatar(authorEmail, avatar) {
        chrome.storage.local.get(authorEmail, function(emailToImage){
            if ( emailToImage[authorEmail] === undefined )
                return;

            avatar.src = emailToImage[authorEmail];
        });
    }
}
