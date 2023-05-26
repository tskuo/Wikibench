(function ($, mw) {
    $(document).ready(function() {

        // init
        var wikibenchURL = "User:Tzusheng/sandbox/Wikipedia:Wikibench/";
        var entityType = "diff";
        var entityPagePrefix = wikibenchURL + entityType.charAt(0).toUpperCase() + entityType.slice(1) + ":";
        var entityPageHeader = "{{Warning |heading=Script installation is required for reading and editing |This page is part of the Wikibench project on the English Wikipedia. Please read the [[en:User:Tzusheng/sandbox/Wikipedia:Wikibench/Campaign:Editquality|project page]] and install the script to see this page correctly rendered. Do not edit the source without installing the script.}}";
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
            userIntent: ["alert", "heart"]
        };

        // get config
        var wgPageName = mw.config.get("wgPageName");

        if(wgPageName.startsWith(entityPagePrefix) && mw.config.get("wgAction") === "view") {

            // widgets
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

            var mwApi = new mw.Api();
            

            var entityId = Number(wgPageName.substring(entityPagePrefix.length));
            var userName = mw.config.get("wgUserName");
            var userId = mw.config.get("wgUserId");
            var revisionId = mw.config.get("wgRevisionId");

            var getDiffContent = mwApi.get({
                action: "compare",
                fromrev: entityId,
                torelative: "prev",
            });

            var setDiffTable = getDiffContent.then(function(ret) {
                diffTableContent = ret.compare["*"];
                diffTableTitle = 
                "<tr class=\"diff-title\" lang=\"" + language + "\">" +
                    "<td colspan=\"2\" class=\"diff-otitle diff-side-deleted\">" +
                        "<div id=\"mw-diff-otitle1\">" + 
                            "<strong><a href=\"/w/index.php?oldid=" + ret.compare.fromrevid + "\" title=\"" + ret.compare.fromtitle + "\">Previous revision</a>" +
                        "</div>" +
                        "<div id=\"mw-diff-otitle5\"></div>" +
                    "</td>" +
                    "<td colspan=\"2\" class=\"diff-ntitle diff-side-added\">" +
                        "<div id=\"mw-diff-ntitle1\">" +
                            "<strong><a href=\"/w/index.php?oldid=" + ret.compare.torevid + "\" title=\"" + ret.compare.fromtitle + "\">Edited revision</a>" +
                        "</div>" +
                        "<div id=\"mw-diff-ntitle5\"></div>" +
                        "</td>" +
                "</tr>";
            });

            var getPageContent = mwApi.get({
                action: "parse",
                page: wgPageName,
                prop: "wikitext"
            });

            var setPageWidgets = getPageContent.then(function(ret) {
                mw.loader.using(["oojs-ui-core", "oojs-ui-widgets", "oojs-ui-windows", "mediawiki.diff.styles"]).done(async function(){
                    var label = JSON.parse(ret.parse.wikitext["*"].split(entityPageSplit)[1]);

                    /* ===== WINDOR MANAGER ===== */
                    windowManager = new OO.ui.WindowManager();
                    $(document.body).append(windowManager.$element);

                    noticeBox = new OO.ui.MessageWidget({
                        type: "notice",
                        label: "Please do not directly edit source of this page. To update the primary or your label, click the edit buttons. To discuss, visit the talk page."
                    });

                    /* ===== PRIMARY LABEL ===== */
                    
                    primaryFieldset = new OO.ui.FieldsetLayout({ 
                        label: "Primary label",
                        classes: ["wikibench-entity-primary-label"],
                    });

                    for (var i = 0; i < facets.length; i++) {
                        var f = facets[i];
                        var facetPrimaryLabel = new OO.ui.LabelWidget({
                            label: label.facets[f].primaryLabel.label
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
                            label: "Please respect and refer to other Wikipedians' perspectives before editing the primary label on behalf of the community."
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
                                    for (var i = 0; i < facets.length; i++) {
                                        submitContent.facets[facets[i]].primaryLabel.lastModifier = userName;
                                        submitContent.facets[facets[i]].primaryLabel.lastModifierId = userId;
                                        submitContent.facets[facets[i]].primaryLabel.label = primaryLabels[facets[i]];
                                        submitContent.facets[facets[i]].primaryLabel.touched = "time";
                                        submitContent.facets[facets[i]].primaryLabel.autolabeled = false;
                                    }
                                    mwApi.postWithToken("csrf",{
                                        action: "edit",
                                        title: wgPageName,
                                        section: 0,
                                        text: entityPageHeader + "\n" + entityPageSplit + "\n" + JSON.stringify(submitContent),
                                        summary: "Primary label change from the Wikibench entity page: " + summary,
                                    }).done(function(result,jqXHR) {
                                        location.reload();
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

                    primaryFieldset.addItems(
                        new OO.ui.FieldLayout(editPrimaryBtn, {
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
                                displayLabelName = l.label
                                if (l.lowConfidence) {
                                    displayLabelName = "likely " + displayLabelName;
                                }
                            }
                        });
                        userFieldset.addItems(
                            new OO.ui.FieldLayout(
                                new OO.ui.LabelWidget({
                                    label: displayLabelName
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
                                            "created": "time1",
                                            "touched": "time2",
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
                                        summary: "Individual label change from the Wikibench entity page",
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

                    var divRender = $(".mw-parser-output");

                    divRender.find("table").remove(); // remove warning message
                    divRender.find("hr").remove(); // remove horizontal line
                    divRender.find("p").remove(); // remove json content

                    divRender
                        .append(noticeBox.$element)
                        .append(diffTableHeader + diffTableTitle + diffTableContent + diffTableFooter)
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
                                    individualFieldset[f][l].addItems(
                                        new OO.ui.FieldLayout(
                                            new OO.ui.LabelWidget({label: individualLabel.note}),
                                            {label: $("<a>")
                                                .attr("href","/wiki/User:"+individualLabel.userName)
                                                .text(individualLabel.userName)
                                            }
                                        )
                                    );
                                    labelCount[l]++;
                                    if (individualLabel.lowConfidence) labelLowConfidenceCount[l]++;
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
                        var stackBarNames = [
                            facetLabels[f][0],
                            "likely " + facetLabels[f][0],
                            "likely " + facetLabels[f][1],
                            facetLabels[f][1]
                        ];
                        var stackBarColors = ["#b32424", "#fee7e6", "#d5fdf4", "#14866d"]
                        stackBarText[f] = "{{Stacked bar|height=18px|";
                        for (var k = 0; k < 4; k++) {
                            if (stackBarCounts[k] > 0) {
                                var tmp = (k+1).toString();
                                stackBarText[f] += "A" + tmp + "=" + stackBarCounts[k].toString() + "|C" + tmp + "=" + stackBarColors[k] + "|T" + tmp + "=" + stackBarNames[k] + "|";
                            }
                        }
                        stackBarText[f] += "Total=" + (stackBarCounts.reduce((a, b) => a + b, 0)).toString() + "}}";

                        await mwApi.get({
                            action: "parse",
                            text: stackBarText[f],
                            contentmodel: "wikitext"
                        }).done(function(ret) {
                            stackBars[f] = ret.parse.text["*"];
                            divRender
                                .append("<h2>" + facetNames[f].charAt(0).toUpperCase() + facetNames[f].slice(1) + "</h2>")
                                .append("<h3>Label distribution</h3>")
                                .append(stackBars[f])
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
                        });
                    }
                });
            });
        }
    });
})(jQuery, mediaWiki);