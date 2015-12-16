sdes.github.ui.commits = function(owner, repo, renderTo, groupHeaderOpacity) {
    var htmlUtil = new sdes.utils.html(),
        varUtil  = new sdes.utils.variable(),
        commits  = [],
        lastDate,
        ol;

    this.add = function(commit, options) {
        if ( options === undefined )
            options = {};

        var date      = new moment(commit.commitTime).format("ll"),
            authorMd5 = CryptoJS.MD5(commit.authorEmail),
            gravatar  = "https://www.gravatar.com/avatar/"+authorMd5,

            li = 
                htmlUtil.createList({
                    cls: 
                        "commit commits-list-item table-list-item js-navigation-item "+
                        "js-details-container js-socket-channel js-updatable-content",
                    style: {
                        opacity: varUtil.isNoU(options.opacity) ? null : options.opacity,
                        backgroundColor: 
                            varUtil.isNoU(options.backgroundColor) ? 
                                null : options.backgroundColor,
                        pointerEvents: 
                            ! varUtil.isNoU(options.opacity) && options.opacity === 0 ?
                                "none" : null
                    }
                }),
            avatarCell =
                htmlUtil.createDiv({
                    cls: "table-list-cell commit-avatar-cell",
                }),
            avatarContainer =
                htmlUtil.createDiv({
                    cls: "avatar-parent-child"
                }),
            avatarLink =
                htmlUtil.createLink({

                }),
            avatar =
                htmlUtil.createImage({
                    cls: "avatar",
                    src: gravatar,
                    style: {
                        height: "36px",
                        width: "36px"
                    }
                }),
            detailsCell = 
                htmlUtil.createDiv({
                    cls: "table-list-cell"
                }),
            title = 
                htmlUtil.createParagraph({
                    cls: "commit-title",
                    style: options.titleStyle
                }),
            titleLink =
                htmlUtil.createLink({
                    href: "/"+owner+"/"+repo+"/commit/"+commit.name,
                    cls: "message",
                    html: commit.title,
                    target: varUtil.isNoU(options.target) ? null : options.target,
                }),
            time = 
                htmlUtil.createDiv({
                    cls: "commit-meta commit-author-section",
                    html: getCommitterMessage(commit),
                    style: options.authorStyle
                }),
            msg =
                htmlUtil.createDiv({
                    cls: "commit-desc",
                    style: {
                        display: options.showMsg ? "block" : null
                    }
                }),
            msgText =
                htmlUtil.createPre({
                    cls: "text-small",
                    html: commit.message,
                    style: varUtil.isNoU(options.messageStyle) ? null : options.messageStyle
                }),
            branches =
                htmlUtil.createDiv({
                    style: {
                        position: "relative",
                        left: "-47px",
                        top: "2px",
                        paddingTop: "5px",
                        width: "100%",
                        color: "#666",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis"
                    }
                });

        li.appendChild(avatarCell);
        li.appendChild(detailsCell);

        avatarCell.appendChild(avatarContainer);
        avatarContainer.appendChild(avatarLink);
        avatarLink.appendChild(avatar);

        detailsCell.appendChild(title);
        detailsCell.appendChild(time);
        detailsCell.appendChild(msg);
        
        if ( options.append !== undefined )
            detailsCell.appendChild(options.append);

        if ( options.branches !== undefined ) {
            if ( typeof(options.branches) === "string" )
                $(branches).html(options.branches);
            else if ( typeof(options.branches) === "object" )
                branches.appendChild(options.branches);
            else
                throw("GitSense: Don't know how to handle the type '"+typeof(options.branches)+"'");

            detailsCell.appendChild(branches);
        }

        title.appendChild(titleLink);

        msg.appendChild(msgText);

        if ( lastDate !== date )
            createNewGroup(date);
            
        lastDate = date;

        ol.appendChild(li);
    }

    function createNewGroup(date) {
        var div = 
                htmlUtil.createDiv({ 
                    cls: "commit-group-title",
                    html: 
                        "<span class='octicon octicon-git-commit'></span>"+
                        "Commits on "+date,
                    style: {
                        opacity: varUtil.isNoU(groupHeaderOpacity) ? null : groupHeaderOpacity,
                    }
                });

        ol = htmlUtil.createOrderedList({cls: "commit-group table-list table-list-bordered"});

        renderTo.appendChild(div);
        renderTo.appendChild(ol);
    }

    function getCommitterMessage(commit) {
        var msg = 
                new moment(commit.commitTime).fromNow()+
                " by "+commit.committerEmail;

        return msg;
    } 
}
