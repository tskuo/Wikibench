(function ($, mw) {
    $(document).ready(function() {
        if(mw.config.get("wgDiffNewId") !== null) {

            // init
            var wikibenchURL = "User:Tzusheng/sandbox/Wikipedia:Wikibench";
            var campaignURL = "User:Tzusheng/sandbox/Wikipedia:Wikibench/Campaign:Editquality";
            var entityType = "diff";
            var entityPageSplit = "-----";
            var facets = ["editDamage", "userIntent"];
            var facetNames = {
                editDamage: "edit damage",
                userIntent: "user intent"
            };
            var facetHelp = {
                editDamage: "Please check the <a href=\"/wiki/" + campaignURL + "#Label_definitions\">campaign page</a> for the definition of edit damage. The optional checkbox on the right lets you specify that you provide the label with lower confidence when you're not so sure.",
                userIntent: "Please check the <a href=\"/wiki/" + campaignURL + "#Label_definitions\">campaign page</a> for the definition of user intent. The optional checkbox on the right lets you specify that you provide the label with lower confidence when you're not so sure."
            };
            var facetLabels = {
                editDamage: ["damaging", "not damaging"],
                userIntent: ["bad faith", "good faith"]
            };
            var facetIcons = {
                editDamage: ["alert", "success"],
                userIntent: ["alert", "success"]
            }
            var successMessage = "Your submission has been recorded";
            var warningMessage = "Your submission has been recorded but is different from the primary label";
            
            // get config
            var mwApi = new mw.Api();
            var diffNewId = mw.config.get("wgDiffNewId");
            var diffOldId = mw.config.get("wgDiffOldId");
            var userName = mw.config.get("wgUserName");
            var userId = mw.config.get("wgUserId");
            var revisionId; // revision ID of the entity page, not the diff page
            var entityPageTitle = wikibenchURL + "/Entity:" + entityType.charAt(0).toUpperCase() + entityType.slice(1) + "/" + diffOldId.toString() + "/" + diffNewId.toString();
            var entityPageHeader = "{{Warning |heading=Script installation is required for reading and editing |This page is part of the Wikibench project on the English Wikipedia. Please read the [[" + campaignURL + "|project page]] and install the script to see this page correctly rendered. Do not edit the source without installing the script.}}";
            var routingMessage = "You are welcome to review other Wikipedians' labels on the <a href=\"/wiki/" + entityPageTitle + "\">entity page of this " + entityType + "</a> or close this message for resubmission.";

            // labels
            var primaryLabels = {};
            var autolabeled = {};
            var userLabels = {};
            var userLowConfidences = {};
            var userNotes = {};

            // widgets
            var facetBtns = {};
            var facetLowConfidenceCheckboxes = {};
            var facetWidgets = {};
            var facetNoteInputs = {}; // assume notes might be different
            var submitBtn;
            var submitMessage;

            var getEntityPage = mwApi.get({ // get the entity page. if it doesn't exist, return revisionId = "-1"
                action: "query",
                prop: "revisions",
                rvprop: "content",
                titles: entityPageTitle,
                format: "json"
            });

            var parseEntityPage = getEntityPage.then(function(ret) {
                revisionId = Object.keys(ret.query.pages)[0];
                if (revisionId !== "-1") { // the entity page already exists                    
                    var revisions = ret.query.pages;
                    var pageId = Object.keys(revisions)[0];
                    var entityPageContent = JSON.parse(revisions[pageId].revisions[0]["*"].split(entityPageSplit)[1]);
                    facets.forEach(function(f) {
                        primaryLabels[f] = entityPageContent.facets[f].primaryLabel.label;
                        autolabeled[f] = entityPageContent.facets[f].primaryLabel.autolabeled;
                        entityPageContent.facets[f].individualLabels.forEach(function(l) {
                            if (userName === l.userName) {
                                userLabels[f] = l.label;
                                userLowConfidences[f] = l.lowConfidence;
                                userNotes[f] = l.note;
                            }
                        });
                    });
                }
            });

            var renderPlugIn = parseEntityPage.then(function() {
                mw.loader.using(["oojs-ui-core", "oojs-ui-widgets", "oojs-ui-windows"]).done(function(){
                    facets.forEach(function(f) {
                        facetBtns[f] = new OO.ui.ButtonSelectWidget({
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
                        
                        if (!$.isEmptyObject(userLabels)) {
                            facetBtns[f].selectItemByLabel(userLabels[f]);
                        }

                        facetBtns[f].on("choose", function(item){
                            userLabels[f] = item.getData();
                        });

                        facetLowConfidenceCheckboxes[f] = new OO.ui.CheckboxInputWidget();

                        if (!$.isEmptyObject(userLowConfidences[f])) {
                            facetLowConfidenceCheckboxes[f].setSelected(userLowConfidences[f]);
                        }

                        facetWidgets[f] = new OO.ui.Widget({
                            content: [
                                new OO.ui.HorizontalLayout({
                                    items: [
                                        facetBtns[f],
                                        facetLowConfidenceCheckboxes[f],
                                        new OO.ui.LabelWidget({label: "low confidence"})
                                    ]
                                })
                            ]
                        });

                        facetNoteInputs[f] = new OO.ui.TextInputWidget({});

                        if (!$.isEmptyObject(userNotes)){
                            facetNoteInputs[f].setValue(userNotes[f]);
                        }
                    });

                    submitBtn = new OO.ui.ButtonWidget({
                        label: "Submit",
                        flags: ["primary", "progressive"]
                    });

                    submitMessage = new OO.ui.MessageWidget({
                        showClose: true
                    });

                    submitMessage.toggle(false);

                    var fieldset = new OO.ui.FieldsetLayout({ 
                        label: new OO.ui.HtmlSnippet("Wikibench Plug-In"),
                        id: "wikibench-diff-plugin",
                        help: new OO.ui.HtmlSnippet("<a href=\"/wiki/" + campaignURL + "\">Editquality Campaign</a>"),
                        helpInline: true
                    });

                    // if user label already exists, compare it with the primary label and update submitMessage accordingly
                    if (!$.isEmptyObject(userLabels)) {
                        var isSameAsPrimary = true;
                        if (!$.isEmptyObject(primaryLabels)) { // make sure the primary label exist
                            facets.forEach(function(f) {
                                if (userLabels[f] !== primaryLabels[f]) {
                                    isSameAsPrimary = false;
                                }
                            });
                        }
                        if (isSameAsPrimary) {
                            submitMessage.setType("success");
                            submitMessage.setLabel(new OO.ui.HtmlSnippet("<strong>" + successMessage + "</strong>" + "<br>" + routingMessage));
                        }
                        else {
                            var primaryLabelMessage = "("
                            for (var i = 0; i < facets.length; i++) {
                                primaryLabelMessage += primaryLabels[facets[i]];
                                primaryLabelMessage += ", ";
                            }
                            primaryLabelMessage = primaryLabelMessage.slice(0,-2) + ")";
                            submitMessage.setType("warning");
                            submitMessage.setLabel(new OO.ui.HtmlSnippet("<strong>" + warningMessage + " " + primaryLabelMessage + "</strong>" + "<br>" + routingMessage));
                        }
                        submitMessage.toggle(true);
                        submitBtn.setDisabled(true);
                        submitBtn.toggle(false);
                    }

                    // add all the widgets to feildset
                    fieldset.addItems(
                        new OO.ui.FieldLayout(
                            new OO.ui.LabelWidget({label: diffOldId.toString() + "/" + diffNewId.toString()}), {
                            label: "Diff IDs",
                            align: "left"
                        })
                    );

                    for (var i = 0; i < facets.length; i++) {
                        fieldset.addItems(
                            new OO.ui.FieldLayout(facetWidgets[facets[i]], {
                                label: facetNames[facets[i]].charAt(0).toUpperCase() + facetNames[facets[i]].slice(1),
                                align: "left",
                                help: new OO.ui.HtmlSnippet(facetHelp[facets[i]])
                            })
                        );
                    }

                    for (var i = 0; i < facets.length; i++) {
                        fieldset.addItems(
                            new OO.ui.FieldLayout(facetNoteInputs[facets[i]], {
                                label: "Note for " + facetNames[facets[i]].toLowerCase(),
                                align: "left",
                                help: "An optional note that explains the labels you provide and, in case of low confidence, why so."
                            })
                        );
                    }

                    fieldset.addItems([
                        new OO.ui.FieldLayout(submitBtn, {}),
                        new OO.ui.FieldLayout(submitMessage, {})
                    ]);

                    //$("#mw-oldid").after(fieldset.$element);
                    //$(".mw-revslider-container").after(fieldset.$element);
                    $("#contentSub").after(fieldset.$element);

                    submitBtn.on("click", function() {

                        // labels and user login are required for submission
                        var isLabelUndefined = false;
                        facets.forEach(function(f) {
                            if (userLabels[f] === undefined) {
                                isLabelUndefined = true;
                            }
                        });
                        if (isLabelUndefined) { 
                            OO.ui.alert("Labels are required for submission.");
                        }
                        else if (userName === null){
                            OO.ui.alert("User login is required for submission.");
                        }
                        else {

                            // TODO: consider autolabel here

                            mwApi.get({ // get primary label again in case there are any changes from others
                                action: "query",
                                prop: "revisions",
                                rvprop: "content",
                                titles: entityPageTitle,
                                format: "json"
                            }).done(function(ret) {
                                var submitLabels = {};
                                var submitContent;
                                facets.forEach(function(f) {
                                    submitLabels[f] = {
                                        "userName": userName,
                                        "userId": userId,
                                        "label": userLabels[f],
                                        "note": facetNoteInputs[f].getValue(),
                                        "origin": "wikibench-enwiki-diff-plugin",
                                        "created": new Date(new Date().getTime()).toUTCString(),
                                        "touched": new Date(new Date().getTime()).toUTCString(),
                                        "lowConfidence": facetLowConfidenceCheckboxes[f].isSelected(),
                                        "category": []
                                    }
                                });
                                if (Object.keys(ret.query.pages)[0] === "-1") { // entity page doesn't exist
                                    submitContent = {
                                        "entityType": entityType,
                                        "entityId": diffOldId.toString() + "/" + diffNewId.toString(),
                                        "entityNote": $("td.diff-multi").text(),
                                        "facets": {}
                                    }
                                    facets.forEach(function(f) {
                                        submitContent.facets[f] = {};
                                        submitContent.facets[f]["primaryLabel"] = {
                                            "lastModifier": userName,
                                            "lastModifierId": userId,
                                            "label": userLabels[f],
                                            "touched": submitLabels[f].touched,
                                            "autolabeled": false
                                        };
                                        submitContent.facets[f]["individualLabels"] = [submitLabels[f]];  
                                    });
                                }
                                else { // entity page already exists
                                    var revisions = ret.query.pages;
                                    var pageId = Object.keys(revisions)[0];
                                    submitContent = JSON.parse(revisions[pageId].revisions[0]["*"].split(entityPageSplit)[1]);
                                    for (var i = 0; i < facets.length; i++) {
                                        var f = facets[i];
                                        var isUserLabelExist = false;
                                        primaryLabels[f] = submitContent.facets[f].primaryLabel.label; // get primary label again in case someone updates it in between
                                        for (var j = 0; j < submitContent.facets[f].individualLabels.length; j++) {
                                            if (submitContent.facets[f].individualLabels[j].userName === userName) {
                                                submitLabels[f].created = submitContent.facets[f].individualLabels[j].created;
                                                submitContent.facets[f].individualLabels[j] = submitLabels[f];
                                                isUserLabelExist = true;
                                                break;
                                            }
                                        }
                                        if (isUserLabelExist && (submitContent.facets[f].individualLabels.length === 1) && (submitContent.facets[f].primaryLabel.lastModifier === userName)) {
                                            // allow changing the primary label from the plug-in if the user is the only laber submitter
                                            submitContent.facets[f]["primaryLabel"] = {
                                                "lastModifier": userName,
                                                "lastModifierId": userId,
                                                "label": userLabels[f],
                                                "touched": submitLabels[f].touched,
                                                "autolabeled": false
                                            };
                                            primaryLabels[f] = submitContent.facets[f]["primaryLabel"].label; // update primary label for submitMessage
                                        }
                                        if (!isUserLabelExist) {
                                            submitContent.facets[f]["individualLabels"].push(submitLabels[f]);
                                        }
                                    }
                                }

                                mwApi.postWithToken("csrf",{
                                    action: "edit",
                                    title: entityPageTitle,
                                    section: 0,
                                    text: entityPageHeader + "\n" + entityPageSplit + "\n" + JSON.stringify(submitContent),
                                    summary: "Label submission from the Wikibench diff plug-in",
                                }).done(function(result,jqXHR){

                                    var isSameAsPrimary = true;
                                    if (!$.isEmptyObject(primaryLabels)) { // primary label already exist
                                        facets.forEach(function(f) {
                                            if (userLabels[f] !== primaryLabels[f]) {
                                                isSameAsPrimary = false;
                                            }
                                        });
                                    }

                                    if (isSameAsPrimary) {
                                        submitMessage.setType("success");
                                        submitMessage.setLabel(new OO.ui.HtmlSnippet("<strong>" + successMessage + "</strong>" + "<br>" + routingMessage));
                                    }
                                    else {
                                        var primaryLabelMessage = "("
                                        facets.forEach(function(f) {
                                            primaryLabelMessage += primaryLabels[f];
                                            primaryLabelMessage += ", ";
                                        });
                                        primaryLabelMessage = primaryLabelMessage.slice(0,-2) + ")";
                                        submitMessage.setType("warning");
                                        submitMessage.setLabel(new OO.ui.HtmlSnippet("<strong>" + warningMessage + " " + primaryLabelMessage + "</strong>" + "<br>" + routingMessage));
                                    }
                                    submitMessage.toggle(true);
                                    submitBtn.setDisabled(true);
                                    submitBtn.toggle(false);

                                }).fail(function(code,result){
                                    if ( code === "http" ) {
                                        mw.log( "HTTP error: " + result.textStatus ); // result.xhr contains the jqXHR object
                                    } else if ( code === "ok-but-empty" ) {
                                        mw.log( "Got an empty response from the server" );
                                    } else {
                                        mw.log( "API error: " + code );
                                    }
                                });
                            }); 
                        }
                    });

                    submitMessage.on("close", function() {
                        submitMessage.toggle(false);
                        submitBtn.setDisabled(false);
                        submitBtn.toggle(true);
                    });
                });
            });

            $.when(renderPlugIn).done(function(data) {
                //console.log("done");
            });
        }
    });
})(jQuery, mediaWiki);