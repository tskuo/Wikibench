(function ($, mw) {
    $(document).ready(function() {

        // init
        var wikibenchURL = "User:Tzusheng/sandbox/Wikipedia:Wikibench";
        var wikibenchTalkURL = "User_talk:Tzusheng/sandbox/Wikipedia:Wikibench"
        var campaignURL = wikibenchURL + "/Campaign:Editquality";
        var entityType = "diff";
        var entityPagePrefix = wikibenchURL + "/Entity:" + entityType.charAt(0).toUpperCase() + entityType.slice(1) + "/";
        var entityPageHeader = "{{Warning |heading=Script installation is required for reading and editing |This page is part of the Wikibench project on the English Wikipedia. Please read the [[" + campaignURL + "|project page]] and install the script to see this page correctly rendered. Do not edit the source without installing the script.}}";
        var entityPageSplit = "-----";
        var language = "en";
        var facets = ["editDamage", "userIntent"];
        var facetNames = {
            editDamage: "edit damage",
            userIntent: "user intent"
        };
        var facetLabels = {
            editDamage: ["damaging", "not damaging"],
            userIntent: ["bad faith", "good faith"]
        };
        var facetIcons = {
            editDamage: ["alert", "success"],
            userIntent: ["alert", "success"]
        };
        var facetColors = {
            editDamage: ["#b32424", "#14866d"],
            userIntent: ["#b32424", "#14866d"]
        };

        // get config
        var wgPageName = mw.config.get("wgPageName");

        if(wgPageName.startsWith(entityPagePrefix) && mw.config.get("wgAction") === "view") {

            // widgets
            var divRender = $(".mw-parser-output");
            var diffTableHeader = "<table class=\"diff diff-contentalign-left diff-editfont-monospace\" data-mw=\"interface\"><colgroup><col class=\"diff-marker\"><col class=\"diff-content\"><col class=\"diff-marker\"><col class=\"diff-content\"></colgroup><tbody>";
            var diffTableFooter = "</tbody></table>";
            var diffTableContent, diffTableTitle;
            var windowManager;
            var noticeBox;
            var primaryFieldset;
            var userFieldset;
            var userLabel = {};
            var userLowConfidences = {};
            var userNote = {};
            var individualFieldset = {};
            var stackBars = {};
            var stackBarText = {};
            var lowConfidenceHtmlSnippet = "<font color=\"#72777d\">(low confidence)</font>"

            var mwApi = new mw.Api();
            var entityId = wgPageName.substring(entityPagePrefix.length);
            var userName = mw.config.get("wgUserName");
            var userId = mw.config.get("wgUserId");

            mwApi.get({
                action: "parse",
                page: wgPageName,
                prop: "wikitext"
            }).done(function(ret) {
                mw.loader.using(["oojs-ui-core", "oojs-ui-widgets", "oojs-ui-windows", "mediawiki.diff.styles"]).done(function(){
                    var label = JSON.parse(ret.parse.wikitext["*"].split(entityPageSplit)[1]);

                    /* ===== WINDOR MANAGER ===== */
                    windowManager = new OO.ui.WindowManager();
                    $(document.body).append(windowManager.$element);

                    noticeBox = new OO.ui.MessageWidget({
                        type: "notice",
                        label: new OO.ui.HtmlSnippet("Please do not directly edit the source of this page. To update the primary or your label, click the edit buttons below. To discuss, visit the talk page. To view the labeling progress of the campaign, visit the <a href=\"/wiki/" + campaignURL + "\">campaign page</a>.")
                    });
                    
                    /* ===== PRIMARY LABEL ===== */
                    
                    primaryFieldset = new OO.ui.FieldsetLayout({ 
                        label: "Primary label",
                        classes: ["wikibench-entity-primary-label"],
                    });

                    var labelColor = {};
                    for (var i = 0; i < facets.length; i++) {
                        labelColor[facets[i]] = {};
                        for (var j = 0; j < facetLabels[facets[i]].length; j++) {
                            labelColor[facets[i]][facetLabels[facets[i]][j]] = facetColors[facets[i]][j];
                        }
                    }

                    for (var i = 0; i < facets.length; i++) {
                        var f = facets[i];
                        var facetPrimaryLabel = new OO.ui.LabelWidget({
                            label: new OO.ui.HtmlSnippet("<font color=\"" + labelColor[f][label.facets[f].primaryLabel.label] + "\">" + label.facets[f].primaryLabel.label + "</font>")
                        });
                        primaryFieldset.addItems(
                            new OO.ui.FieldLayout(facetPrimaryLabel, {
                                label: facetNames[f].charAt(0).toUpperCase() + facetNames[f].slice(1),
                                align: "left"
                            })
                        )
                    }

                    primaryFieldset.addItems([
                        new OO.ui.FieldLayout(
                            new OO.ui.LabelWidget({
                                label: $("<a>")
                                    .attr("href","/wiki/User:"+label.facets[facets[0]].primaryLabel.lastModifier)
                                    .text(label.facets[facets[0]].primaryLabel.lastModifier)
                            }), {
                                label: "Last modifier",
                                align: "left"
                            }
                        ),
                        new OO.ui.FieldLayout(
                            new OO.ui.LabelWidget({
                                label: label.facets[facets[0]].primaryLabel.touched
                            }), {
                                label: "Last modified time",
                                align: "left"
                            }
                        )
                    ]);

                    var editPrimaryBtn = new OO.ui.ButtonWidget({
                        label: "Edit"
                    });

                    // Make a subclass of ProcessDialog for editing the primary label
                    function EditPrimaryDialog( config ) {
                        EditPrimaryDialog.super.call( this, config );
                    }
                    OO.inheritClass( EditPrimaryDialog, OO.ui.ProcessDialog );

                    // Specify a name for .addWindows()
                    EditPrimaryDialog.static.name = "editPrimaryDialog";
                    EditPrimaryDialog.static.title = "Edit primary label";
                    EditPrimaryDialog.static.actions = [
                        { 
                            flags: [ "primary", "progressive" ], 
                            label: "Publish changes", 
                            action: "publish" 
                        },
                        { 
                            flags: "safe", 
                            label: "Cancel" 
                        }
                    ];

                    // Customize the initialize() function to add content and layouts: 
                    EditPrimaryDialog.prototype.initialize = function () {
                        EditPrimaryDialog.super.prototype.initialize.call( this );
                        this.panel = new OO.ui.PanelLayout( { 
                            padded: true, 
                            expanded: false 
                        } );
                        this.content = new OO.ui.FieldsetLayout();
                        
                        this.primaryLabelMessage = new OO.ui.MessageWidget({
                            type: "warning",
                            label: new OO.ui.HtmlSnippet("When editing primary labels, <a href=\"/wiki/Wikipedia:Be_bold\">be bold</a> yet respectful of others' views. Wikibench will notify the last modifier on the <a href=\"/wiki/" + wikibenchTalkURL + "/Entity:" + entityType.charAt(0).toUpperCase() + entityType.slice(1) + "/" + entityId + "\">talk page</a> with <a href=\"/wiki/Wikipedia:Signatures#Using_four_tildes\">your signature</a> after publishing changes.")
                        });

                        this.content.addItems([this.primaryLabelMessage]);

                        this.primaryFacetBtns = {};
                        for (var i = 0 ; i < facets.length; i++) {
                            this.primaryFacetBtns[facets[i]] = new OO.ui.ButtonSelectWidget({
                                items: [
                                    new OO.ui.ButtonOptionWidget({
                                        data: facetLabels[facets[i]][0],
                                        label: facetLabels[facets[i]][0],
                                        icon: facetIcons[facets[i]][0]
                                    }),
                                    new OO.ui.ButtonOptionWidget({
                                        data: facetLabels[facets[i]][1],
                                        label: facetLabels[facets[i]][1],
                                        icon: facetIcons[facets[i]][1]
                                    })
                                ]
                            });
                            this.primaryFacetBtns[facets[i]].selectItemByLabel(label.facets[facets[i]].primaryLabel.label);
                            this.content.addItems([
                                new OO.ui.FieldLayout(this.primaryFacetBtns[facets[i]], {
                                    label: facetNames[facets[i]].charAt(0).toUpperCase() + facetNames[facets[i]].slice(1),
                                    align: "left"
                                })
                            ]);
                        }

                        this.primaryLabelSummary = new OO.ui.TextInputWidget({
                            placeholder: "Briefly describe your changes"
                        });

                        this.content.addItems([
                            new OO.ui.FieldLayout(this.primaryLabelSummary, {
                                label: "Edit summary",
                                align: "top"
                            })
                        ]);

                        this.panel.$element.append( this.content.$element );
                        this.$body.append( this.panel.$element );
                    };

                    EditPrimaryDialog.prototype.getBodyHeight = function () {
                        return this.panel.$element.outerHeight( true );
                    };

                    // Specify processes to handle the actions.
                    EditPrimaryDialog.prototype.getActionProcess = function ( action ) {
                        if ( action === "publish" ) {
                            // Create a new process to handle the action
                            return new OO.ui.Process( function () {
                                var primaryLabels = {}
                                var summary = this.primaryLabelSummary.getValue();
                                for (var i = 0; i < facets.length; i++) {
                                    primaryLabels[facets[i]] = this.primaryFacetBtns[facets[i]].findSelectedItem().getData();
                                }
                                mwApi.get({
                                    action: "query",
                                    prop: "revisions",
                                    rvprop: "content",
                                    titles: wgPageName,
                                    format: "json"
                                }).done(function(ret) {
                                    var revisions = ret.query.pages;
                                    var pageId = Object.keys(revisions)[0];
                                    var submitContent = JSON.parse(revisions[pageId].revisions[0]["*"].split(entityPageSplit)[1]);
                                    var lastModifier = submitContent.facets[facets[0]].primaryLabel.lastModifier;
                                    for (var i = 0; i < facets.length; i++) {
                                        submitContent.facets[facets[i]].primaryLabel.lastModifier = userName;
                                        submitContent.facets[facets[i]].primaryLabel.lastModifierId = userId;
                                        submitContent.facets[facets[i]].primaryLabel.label = primaryLabels[facets[i]];
                                        submitContent.facets[facets[i]].primaryLabel.touched = new Date(new Date().getTime()).toUTCString();
                                        submitContent.facets[facets[i]].primaryLabel.autolabeled = false;
                                    }
                                    mwApi.postWithToken("csrf",{
                                        action: "edit",
                                        title: wgPageName,
                                        section: 0,
                                        text: entityPageHeader + "\n" + entityPageSplit + "\n" + JSON.stringify(submitContent),
                                        summary: "Primary label change from the Wikibench entity page: " + summary,
                                    }).done(function(result,jqXHR) {
                                        // notify the previous labeler on the talk page
                                        mwApi.postWithToken("csrf", {
                                            action: "edit",
                                            title: wikibenchTalkURL + "/Entity:" + entityType.charAt(0).toUpperCase() + entityType.slice(1) + "/" + entityId,
                                            section: "new",
                                            sectiontitle: "The primary label has been edited",
                                            text: "{{Ping|" + lastModifier + "}} [[User:" + userName + "|" + userName + "]] edited the primary label that you previously submitted. If you disagree with the change, please kindly engage in a discussion on this talk page and consider seeking a third opinion if needed. ~~~~"
                                        }).done(function(result,jqXHR) {
                                            location.reload();
                                        });
                                    });
                                });
                            }, this );
                        }
                        // Fallback to parent handler
                        return EditPrimaryDialog.super.prototype.getActionProcess.call( this, action );
                    };


                    // Create a new process dialog window.
                    var editPrimaryDialog = new EditPrimaryDialog();

                    // Add the window to window manager using the addWindows() method.
                    windowManager.addWindows( [ editPrimaryDialog ] );

                    editPrimaryBtn.on("click", function() {
                        windowManager.openWindow( editPrimaryDialog );
                    });

                    var discussPrimaryBtn = new OO.ui.ButtonWidget({
                        label: "Talk"
                    });

                    discussPrimaryBtn.on("click", function() {
                        window.open("/wiki/" + wikibenchTalkURL + "/Entity:" + entityType.charAt(0).toUpperCase() + entityType.slice(1) + "/" + entityId, "_self");
                    })

                    // primaryFieldset.addItems(
                    //     new OO.ui.FieldLayout(editPrimaryBtn, {
                    //         align: "left"
                    //     })
                    // );
                    primaryFieldset.addItems(
                        new OO.ui.FieldLayout(new OO.ui.Widget({
                            content: [
                                new OO.ui.HorizontalLayout({
                                    items: [
                                        editPrimaryBtn,
                                        discussPrimaryBtn
                                    ]
                                })
                            ]
                        }), {
                            align: "left"
                        })
                    );

                    /* ===== USER LABEL ===== */
                    userFieldset = new OO.ui.FieldsetLayout({ 
                        label: "Your label (" + userName + ")",
                        classes: ["wikibench-entity-user-label"]
                    });

                    for (var i = 0; i < facets.length; i++) {
                        var f = facets[i];
                        userLabel[f] = undefined;
                        userNote[f] = "";
                        var displayLabelName = "undefined";
                        label.facets[f].individualLabels.forEach(function(l) {
                            if (userName === l.userName) {
                                userLabel[f] = l.label;
                                userLowConfidences[f] = l.lowConfidence;
                                userNote[f] = l.note;
                                displayLabelName = "<font color=\"" + labelColor[f][l.label] + "\">" + l.label + "</font>";
                                if (l.lowConfidence) {
                                    displayLabelName = displayLabelName + " " + lowConfidenceHtmlSnippet;
                                }
                            }
                        });
                        userFieldset.addItems(
                            new OO.ui.FieldLayout(
                                new OO.ui.LabelWidget({
                                    label: new OO.ui.HtmlSnippet(displayLabelName)
                                }), {
                                    label: facetNames[f].charAt(0).toUpperCase() + facetNames[f].slice(1),
                                    align: "left" 
                            })
                        );
                    }

                    var editUserBtn = new OO.ui.ButtonWidget({
                        label: "Edit"
                    });

                    // Make a subclass of Process Dialog for editing the user label
                    function EditUserLabelDialog(config) {
                        EditUserLabelDialog.super.call(this, config);
                    }
                    OO.inheritClass(EditUserLabelDialog, OO.ui.ProcessDialog);

                    EditUserLabelDialog.static.name = "editUserLabelDialog";
                    EditUserLabelDialog.static.title = "Edit your label";
                    EditUserLabelDialog.static.actions = [
                        {
                            flags: ["primary", "progressive"],
                            label: "Publish changes",
                            action: "publish"
                        },
                        {
                            flags: "safe",
                            label: "Cancel"
                        }
                    ];

                    EditUserLabelDialog.prototype.initialize = function() {
                        EditUserLabelDialog.super.prototype.initialize.call(this);
                        this.panel = new OO.ui.PanelLayout({
                            padded: true,
                            expanded: false
                        });
                        this.content = new OO.ui.FieldsetLayout();
                        this.userFacetBtns = {};
                        this.userFacetLowConfidenceCheckboxes = {};
                        this.userFacetNoteInputs = {};
                        for (var i = 0; i < facets.length; i++) {
                            var f = facets[i];
                            this.userFacetBtns[f] = new OO.ui.ButtonSelectWidget({
                                items: [
                                    new OO.ui.ButtonOptionWidget({
                                        data: facetLabels[f][0],
                                        label: facetLabels[f][0],
                                        icon: facetIcons[f][0]
                                    }),
                                    new OO.ui.ButtonOptionWidget({
                                        data: facetLabels[f][1],
                                        label: facetLabels[f][1],
                                        icon: facetIcons[f][1]
                                    })
                                ]
                            });
                            if (userLabel[f] !== undefined) {
                                this.userFacetBtns[f].selectItemByLabel(userLabel[f]);
                            }
                            this.userFacetLowConfidenceCheckboxes[f] = new OO.ui.CheckboxInputWidget();
                            if (userLowConfidences[f] === true) {
                                this.userFacetLowConfidenceCheckboxes[f].setSelected(true);
                            }
                            this.userFacetNoteInputs[f] = new OO.ui.TextInputWidget({
                                value: userNote[f]
                            })
                            this.content.addItems([
                                new OO.ui.FieldLayout(this.userFacetBtns[f], {
                                    label: facetNames[f].charAt(0).toUpperCase() + facetNames[f].slice(1),
                                    align: "left"
                                }),
                                new OO.ui.FieldLayout(new OO.ui.Widget({
                                    content: [
                                        new OO.ui.HorizontalLayout({
                                            items: [
                                                this.userFacetLowConfidenceCheckboxes[f],
                                                new OO.ui.LabelWidget({label: "low confidence"})
                                            ]
                                        })
                                    ]
                                }), {
                                    label: " ",
                                    align: "left"
                                }),
                                new OO.ui.FieldLayout(this.userFacetNoteInputs[f], {
                                    label: "Note for " + facetNames[f],
                                    align: "left"
                                })
                            ])
                        }

                        this.panel.$element.append(this.content.$element);
                        this.$body.append(this.panel.$element);
                    }

                    EditUserLabelDialog.prototype.getBodyHeight = function() {
                        return this.panel.$element.outerHeight(true);
                    }

                    EditUserLabelDialog.prototype.getActionProcess = function(action) {
                        if ( action === "publish" ) {
                            // Create a new process to handle the action
                            return new OO.ui.Process( function () {
                                var tmpUserLabel = {};
                                var tmpUserLowConfidences = {};
                                var tmpUserNote = {};
                                for (var i = 0; i < facets.length; i++) {
                                    tmpUserLabel[facets[i]] = this.userFacetBtns[facets[i]].findSelectedItem().getData();
                                    tmpUserLowConfidences[facets[i]] = this.userFacetLowConfidenceCheckboxes[facets[i]].isSelected();
                                    tmpUserNote[facets[i]] = this.userFacetNoteInputs[facets[i]].getValue();
                                }
                                mwApi.get({
                                    action: "query",
                                    prop: "revisions",
                                    rvprop: "content",
                                    titles: wgPageName,
                                    format: "json"
                                }).done(function(ret) {
                                    var revisions = ret.query.pages;
                                    var pageId = Object.keys(revisions)[0];
                                    var submitContent = JSON.parse(revisions[pageId].revisions[0]["*"].split(entityPageSplit)[1]);
                                    for (var i = 0; i < facets.length; i++) {
                                        var isUserLabelExist = false;
                                        var f = facets[i];
                                        var submitLabel = {
                                            "userName": userName,
                                            "userId": userId,
                                            "label": tmpUserLabel[f],
                                            "note": tmpUserNote[f],
                                            "origin": "wikibench-enwiki-entity-page",
                                            "created": new Date(new Date().getTime()).toUTCString(),
                                            "touched": new Date(new Date().getTime()).toUTCString(),
                                            "lowConfidence": tmpUserLowConfidences[f],
                                            "category": []
                                        }
                                        for (var j = 0; j < submitContent.facets[f].individualLabels.length; j++) {
                                            if (submitContent.facets[f].individualLabels[j].userName === userName) {
                                                submitLabel.created = submitContent.facets[f].individualLabels[j].created;
                                                submitContent.facets[f].individualLabels[j] = submitLabel;
                                                isUserLabelExist = true;
                                                break;
                                            }
                                        }
                                        if (!isUserLabelExist) {
                                            submitContent.facets[f].individualLabels.push(submitLabel);
                                        }
                                    }
                                    mwApi.postWithToken("csrf",{
                                        action: "edit",
                                        title: wgPageName,
                                        section: 0,
                                        text: entityPageHeader + "\n" + entityPageSplit + "\n" + JSON.stringify(submitContent),
                                        summary: "Individual label edit from the Wikibench entity page",
                                    }).done(function(result,jqXHR) {
                                        location.reload();
                                    })
                                });;
                            }, this );
                        }
                        // Fallback to parent handler
                        return EditUserLabelDialog.super.prototype.getActionProcess.call( this, action );
                    }
                    var editUserLabelDialog = new EditUserLabelDialog();
                    windowManager.addWindows([editUserLabelDialog]);
                    editUserBtn.on("click", function() {
                        windowManager.openWindow(editUserLabelDialog);
                    });

                    userFieldset.addItems([
                        new OO.ui.FieldLayout(editUserBtn, {
                            align: "left"
                        })
                    ]);

                    divRender.find("table").remove(); // remove warning message
                    divRender.find("hr").remove(); // remove horizontal line
                    divRender.find("p").remove(); // remove json content

                    divRender
                        .append(noticeBox.$element)
                        .append("<h2>Difference between revisions</h2>")
                        .append("<div id=\"wikibench-entity-page-diff-table\"></div>")
                        .append("<h2>Primary and your labels</h2>")
                        .append(primaryFieldset.$element)
                        .append(userFieldset.$element);


                    /* ===== INDIVIDUAL LABEL ===== */
                    for (var i = 0; i < facets.length; i++) {
                        var f = facets[i];
                        individualFieldset[f] = {};
                        var labelCount = {};
                        var labelLowConfidenceCount = {};
                        for (var j = 0; j < facetLabels[f].length; j++) {
                            var l = facetLabels[f][j];
                            labelCount[l] = 0;
                            labelLowConfidenceCount[l] = 0;
                            individualFieldset[f][l] = new OO.ui.FieldsetLayout({
                                icon: "expand",
                                classes: ["wikibench-entity-individual-labels"]
                            });
                            label.facets[f].individualLabels.forEach(function(individualLabel) {
                                if (individualLabel.label === l) {
                                    var labelText = "<a href=\"/wiki/User:" + individualLabel.userName + "\">" + individualLabel.userName + "</a>";
                                    labelCount[l]++;
                                    if (individualLabel.lowConfidence) {
                                        labelLowConfidenceCount[l]++;
                                        labelText = labelText + " " + lowConfidenceHtmlSnippet;
                                    }
                                    individualFieldset[f][l].addItems(
                                        new OO.ui.FieldLayout(
                                            new OO.ui.LabelWidget({label: individualLabel.note}),
                                            {label: new OO.ui.HtmlSnippet(labelText)}
                                        )
                                    );
                                }
                            });
                            individualFieldset[f][l].setLabel(l + " (" + labelCount[l].toString() + ")");
                            individualFieldset[f][l].$group.toggle(false);
                        }

                        // stack bars (assume binary labels)
                        var stackBarCounts = [
                            labelCount[facetLabels[f][0]] - labelLowConfidenceCount[facetLabels[f][0]],
                            labelLowConfidenceCount[facetLabels[f][0]],
                            labelLowConfidenceCount[facetLabels[f][1]],
                            labelCount[facetLabels[f][1]] - labelLowConfidenceCount[facetLabels[f][1]]
                        ];
                        var stackBarTotal = 0;
                        var stackBarNames = [
                            facetLabels[f][0],
                            facetLabels[f][0] + " (low confidence)",
                            facetLabels[f][1] + " (low confidence)",
                            facetLabels[f][1]
                        ];
                        var stackBarColors = ["#b32424", "#fee7e6", "#d5fdf4", "#14866d"]
                        stackBarText[f] = "{{Stacked bar|height=18px|";
                        for (var k = 0; k < 4; k++) {
                            if (stackBarCounts[k] > 0) {
                                var tmp = (k+1).toString();
                                stackBarText[f] += "A" + tmp + "=" + stackBarCounts[k].toString() + "|C" + tmp + "=" + stackBarColors[k] + "|T" + tmp + "=" + stackBarNames[k] + "|";
                            }
                            stackBarTotal += stackBarCounts[k];
                        }
                        stackBarText[f] += "Total=" + (stackBarTotal).toString() + "}}";

                        divRender
                                .append("<h2>" + facetNames[f].charAt(0).toUpperCase() + facetNames[f].slice(1) + " labels</h2>")
                                .append("<h3>Label distribution</h3>")
                                .append("<div id=\"Wikibench-StackBar-" + f + "\"></div>")
                                .append("<h3>Individual labels</h3>");
                        for (var j = 0; j < facetLabels[f].length; j++) {
                            var l = facetLabels[f][j];
                            divRender.append(individualFieldset[f][l].$element);
                            individualFieldset[f][l].$element.find(".oo-ui-fieldsetLayout-header").click(function(){
                                var header = $(this);
                                var content = header.next();
                                content.slideToggle(function () {
                                    header.children(".oo-ui-iconElement-icon").toggleClass("oo-ui-icon-collapse").toggleClass("oo-ui-icon-expand");
                                });
                            })
                        }
                    }

                    // get and append the stackbars outside the for loop to bypass the await time
                    // p.s. await is not available in ES5
                    facets.forEach(function(f) {
                        mwApi.get({
                            action: "parse",
                            text: stackBarText[f],
                            contentmodel: "wikitext"
                        }).done(function(ret) {
                            $("#Wikibench-StackBar-"+f).append(ret.parse.text["*"]);
                        });
                    });

                    // diff table
                    mwApi.get({
                        action: "compare",
                        fromrev: parseInt(entityId.split("/")[0]),
                        torev: parseInt(entityId.split("/")[1]),
                    }).done(function(ret) {
                        diffTableContent = ret.compare["*"];
                        diffTableTitle = 
                        "<tr class=\"diff-title\" lang=\"" + language + "\">" +
                            "<td colspan=\"2\" class=\"diff-otitle diff-side-deleted\">" +
                                "<div id=\"mw-diff-otitle1\">" + 
                                    "<strong><a href=\"/wiki/Special:Permalink/" + ret.compare.fromrevid + "\">Revision before edit</a></strong>" +
                                "</div>" +
                                "<div id=\"mw-diff-otitle3\"> <span class=\"comment\">Revision ID: " + ret.compare.fromrevid + "</span></div>" +
                                "<div id=\"mw-diff-otitle5\"></div>" +
                            "</td>" +
                            "<td colspan=\"2\" class=\"diff-ntitle diff-side-added\">" +
                                "<div id=\"mw-diff-ntitle1\">" +
                                    "<strong><a href=\"/wiki/Special:Permalink/" + ret.compare.torevid + "\">Revision after edit</a></strong>" +
                                    " (<a href=\"/wiki/Special:Diff/" + ret.compare.fromrevid + "/" + ret.compare.torevid + "\">diff page</a>)" +
                                "</div>" +
                                "<div id=\"mw-diff-ntitle3\"> <span class=\"comment\">Revision ID: " + ret.compare.torevid + "</span></div>" +
                                // "<div id=\"mw-diff-ntitle5\"></div>" +
                            "</td>" +
                        "</tr>" +
                        "<tr><td colspan=\"4\" class=\"diff-multi\" lang=\"" + language + "\">" + label.entityNote + "</td></tr>";
                        divRender.find("#wikibench-entity-page-diff-table").append(diffTableHeader + diffTableTitle + diffTableContent + diffTableFooter);
                    });
                });
            });
        }
    });
})(jQuery, mediaWiki);