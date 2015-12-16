sdes.gitsense.ui.trees.changes = function(host, owner, repo, branch, head, options) {
    "use strict";

    var varUtil  = new sdes.utils.variable(),
        dateUtil = new sdes.utils.date(),
        htmlUtil = new sdes.utils.html(),
        bhdata   = new sdes.gitsense.data.branch.heads(host, owner, repo, branch),

        pathToRow      = {},
        renderedPath   = {},

        triangleDownCls,
        triangleRightCls,
        folderOpenedCls,
        folderClosedCls,
        subFolderCls,
        symlinkFolderCls,
        nameLinkCls,
        searchCls,

        folderFontSize,
        deletedColor,
        deletedFolderColor,
        regularFolderColor,

        textFileCls,
        plusCls,
        minusCls;

    this.setStyle = function(name) {
        switch(name) {
            case "github":
                searchCls        = "octicon octicon-search";
                triangleDownCls  = "octicon octicon-triangle-down";
                triangleRightCls = "octicon octicon-triangle-right";
                folderClosedCls  = "octicon octicon-file-directory";
                folderOpenedCls  = "octicon octicon-file-directory";
                subFolderCls     = "octicon octicon-file-submodule";
                symlinkFolderCls = "octicon octicon-file-symlink-directory";
                nameLinkCls      = "js-directory-link js-navigation-open";

                plusCls = "octicon octicon-plus";

                textFileCls = "octicon octicon-file-text";

                deletedColor       = "#bbb";
                folderFontSize     = "18px";
                deletedFolderColor = deletedColor;
                regularFolderColor = "#4078c0";

                break;
            default:
                throw("GitSense Error: Unrecognized font type '"+name+"'");
        }
    }

    this.toggleRow = function(row) {
        var showKids = row.triangleIcon.className === triangleDownCls ? false : true;

        if ( showKids ) {
            row.triangleIcon.setAttribute("class", triangleDownCls);
            $(row.kidsBody).show();
        } else {
            row.triangleIcon.setAttribute("class", triangleRightCls);
            $(row.kidsBody).hide();
        }
    }

    this.render = function(path, type, renderTo) {
        render(path, type, renderTo);
    }

    function render(path, type, renderTo) {
        if ( renderedPath[path] )
            return;

        if ( varUtil.isNoU(triangleDownCls) )
            throw("GitSense Error: You haven't defined what font icons to use");

        var params = { renderTo: renderTo, dir: path };

        if ( type === "tree" )
            bhdata.getChangesTreeKids(head, path, renderKids, params);
        else
            bhdata.getChangesTreeHistory(head, path, 1, renderHistory, params);

        renderedPath[path] = true;
    }

    function renderKids(kids, params) {
        if ( varUtil.isNoU(params.renderTo) )
            throw("GitSense Error: renderTo was not defined");
    
        if ( varUtil.isNoU(params.dir) )
            throw("GitSense Error: directory was not defined");
    
        var filenames = [],
            treenames = [],
            nameToKid = {},
            i,
            kid;

        for ( i = 0; i < kids.length; i++ ) {
            kid = kids[i];

            nameToKid[kid.name] = kid;

            if ( kid.type === "tree" ) 
                treenames.push(kid.name);
            else
                filenames.push(kid.name);
        }

        treenames.sort();
        filenames.sort();

        for ( i = 0; i < treenames.length; i++ )
            addTree(nameToKid[treenames[i]]);

        for ( i = 0; i < filenames.length; i++ )
            addFile(nameToKid[filenames[i]]);

        function addTree(kid) {
            var path      = getPath(params.dir, kid.name),
                fontColor = kid.deleted ? deletedColor : null,

                triangle = 
                    htmlUtil.createIcon({
                        cls: triangleRightCls,
                        style: {
                            width: "20px",
                            textAlign: "center",
                            fontSize: "14px",
                            position: "relative",
                            top: "-1px",
                            color: fontColor
                        }
                    }),

                folder =
                    htmlUtil.createIcon({
                        cls: folderClosedCls,
                        style: {
                            fontSize: "20px",
                            color: kid.deleted ? deletedFolderColor : regularFolderColor,
                            marginLeft: "1px",
                            marginRight: "5px"
                        }
                    }),

                name = 
                    htmlUtil.createLink({
                        cls: nameLinkCls,
                        text: kid.name,
                        style: {
                            cursor: "pointer",
                            color: fontColor
                        }
                    }),

                searchPlus = getAddToSearch(),

                kidsBody =
                    htmlUtil.createDiv({
                        style: { 
                            display: "none",
                            paddingLeft: "15px",
                            width: "100%"
                        }
                    }),

                row = 
                    htmlUtil.createDiv({
                        style: {
                            width: "100%",
                            whiteSpace: "nowrap",
                            paddingTop: "5px",
                            paddingBottom: "5px",
                            borderTop: "1px solid #eee"
                        }
                    });

            row.kidsBody     = kidsBody;
            row.triangleIcon = triangle;
            row.typeIcon     = folder;
            row.name         = name;
            row.path         = path;
            row.type         = kid.type;
            row.searchPlus  = searchPlus;

            pathToRow[path] = row;

            row.appendChild(triangle);
            row.appendChild(folder);
            row.appendChild(name);
            row.appendChild(searchPlus);

            params.renderTo.appendChild(row);
            params.renderTo.appendChild(kidsBody);

            if ( options.showSearchPlus ) {
                row.onmouseover    = function() { overRow(row); }
                row.onmouseout     = function() { outRow(row); }
                searchPlus.onclick = function() { clicked("search-plus"); }
            }

            if ( varUtil.isNoU(options) || varUtil.isNoU(options.onclick) )
                return;

            triangle.onclick   = function() { clicked("triangle") }
            folder.onclick     = function() { clicked("type"); }
            name.onclick       = function() { clicked("name"); }

            function clicked(clickedOn) {
                if ( ! varUtil.isNoU(options.onclick) )
                    options.onclick(clickedOn, row);
            }
        }

        function addFile(kid) {
            var path = getPath(params.dir, kid.name),
                fontColor = kid.deleted ? deletedColor : null,

                triangle = getTriangle(fontColor),

                file =
                    htmlUtil.createIcon({
                        cls: textFileCls,
                        style: {
                            fontSize: "20px",
                            color: kid.deleted ? deletedFolderColor : regularFolderColor,
                            marginLeft: "1px",
                            marginRight: "5px"
                        }
                    }),

                name = 
                    htmlUtil.createLink({
                        text: kid.name,
                        style: {
                            color: fontColor,
                            cursor: "pointer"
                        }
                    }),

                changes =
                    htmlUtil.createSup({
                        text: Number(kid.changes).toLocaleString("en"),
                        style: {
                            paddingLeft: "5px",
                            color: fontColor
                        }
                    }),

                searchPlus = getAddToSearch(),

                kidsBody =
                    htmlUtil.createDiv({
                        style: { 
                            display: "none",
                            paddingLeft: "15px",
                            width: "100%"
                        }
                    }),

                row = 
                    htmlUtil.createDiv({
                        style: {
                            width: "100%",
                            whiteSpace: "nowrap",
                            paddingTop: "5px",
                            paddingBottom: "5px",
                            borderTop: "1px solid #eee"
                        }
                    });

            triangle.style.opacity = 0;

            row.appendChild(triangle);
            row.appendChild(file);
            row.appendChild(name);
            row.appendChild(changes);
            row.appendChild(searchPlus);
            row.appendChild(kidsBody);

            row.kidsBody     = kidsBody;
            row.triangleIcon = triangle;
            row.typeIcon     = file;
            row.name         = name;
            row.path         = path;
            row.type         = kid.type;
            row.searchPlus   = searchPlus;

            params.renderTo.appendChild(row);

            pathToRow[path] = row;

            if ( options.showSearchPlus ) {
                row.onmouseover    = function() { overRow(row); }
                row.onmouseout     = function() { outRow(row); }
                searchPlus.onclick = function() { clicked("search-plus"); }
            }

            name.onclick = function() { clicked("name"); }
        
            function clicked(clickedOn) {
                if ( ! varUtil.isNoU(options.onclick) )
                    options.onclick(clickedOn, row);
            }
        }
   
        function getTriangle(color) {
            var triangle =
                htmlUtil.createIcon({
                        cls: triangleRightCls,
                        style: {
                            width: "20px",
                            textAlign: "center",
                            fontSize: "14px",
                            position: "relative",
                            top: "-1px",
                            color: color
                        }
                    });

            return triangle;
        }

        function getAddToSearch() {
            var search = 
                    htmlUtil.createIcon({
                        cls: searchCls,
                        style: {
                            position: "relative" ,
                            top: "1px" 
                        }
                    }),
                plus =
                    htmlUtil.createIcon({
                        cls: plusCls,
                        style: {
                            fontSize: "8px"
                        }
                    }),

                container = 
                    htmlUtil.createSpan({
                        cls: "right",
                        style: {
                            display: "none",
                            cursor: "pointer",
                            color: "#999"
                        }
                    });

            container.appendChild(search);
            container.appendChild(plus);
                
            return container;
        }

        function overRow(row) {
            $(row.searchPlus).show();
        }

        function outRow(row) {
            $(row.searchPlus).hide();
        }
    }

    function renderHistory(results, params) {
        if ( varUtil.isNoU(params.renderTo) )
            throw("GitSense Error: renderTo was not defined");

        for ( var i = 0; i < results.commits.length; i++ ) 
            addCommit(results.commits[i]);

        function addCommit(commit) {
            var row =
                    htmlUtil.createDiv({
                        style: {
                            width: "100%",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            paddingLeft: "25px",
                            paddingTop: "5px"
                        }
                    }),
                body = 
                    htmlUtil.createDiv({
                        style: {
                            borderTop: "1px solid #eee",
                            paddingTop: "7px"
                        }
                    }),
                date   = getDate(),
                avatar = getAvatar(),
                title  = getTitle();

            body.appendChild(avatar);
            body.appendChild(title);
            body.appendChild(date);

            row.appendChild(body);

            params.renderTo.appendChild(row);

            function getAction() {
                var change  = commit.changes[0],
                    oldBlob = change.oldBlob,
                    blob    = change.blob,
                    text    = "M",
                    color   = "#08c";

                if ( change.oldBlob === "0000000000000000000000000000000000000000" ) {
                    text  = "A";
                    color = "#55a532";
                } else if ( change.blob === "0000000000000000000000000000000000000000" ) {
                    text  = "D";
                    color = "#bd2c00";
                }

                return htmlUtil.createSpan({
                    text: text,
                    style: {
                        fontWeight: "bold",
                        color: color
                    }
                });
            }

            function getColor() {
                var change  = commit.changes[0],
                    oldBlob = change.oldBlob,
                    blob    = change.blob,
                    color   = "#08c";

                if ( change.oldBlob === "0000000000000000000000000000000000000000" )
                    return "#55a532";

                if ( change.blob === "0000000000000000000000000000000000000000" )
                    return "#bd2c00";

                return "#08c";
            }

            function getDate() {
                return htmlUtil.createSpan({
                    text: moment(commit.commitTime).fromNow(),
                    style: {
                        color: "#999",
                        cssFloat: "right"
                    }
                });
            }

            function getAvatar() {
                var authorMd5 = CryptoJS.MD5(commit.authorEmail),
                    gravatar  = "https://www.gravatar.com/avatar/"+authorMd5,
    
                    avatar = htmlUtil.createImage({
                        cls: "avatar avatar-small",
                        src: gravatar,
                        style: {
                            width: "16px",
                            height: "16px",
                            cssFloat: "left"
                        }
                    });

                return avatar;
            }

            function getTitle() {
                var link = 
                        htmlUtil.createLink({
                            href: "/"+owner+"/"+repo+"/commit/"+commit.name,
                            target: "_blank",
                            text: commit.title,
                            style: {
                                color: "#555"
                            }
                        }),
                    title = 
                        htmlUtil.createDiv({
                            append: link,
                            style: {
                                whiteSpace: "nowrap",
                                maxWidth: "600px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                cssFloat: "left",
                                marginLeft: "5px"
                            }
                        });

                return title;
            }
        }
    }

    function getPath(dir, name) {
        if ( dir === "" )
            return name;

        return dir+"/"+name;
    }
}
