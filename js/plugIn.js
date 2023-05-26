(function ($, mw) {
    $(document).ready(function() {
        if(mw.config.get("wgDiffNewId") !== null) {

            // init
            var wikibenchURL = "User:Tzusheng/sandbox/Wikipedia:Wikibench/";
            var entityType = "diff";
            var entityPageSplit = "-----";
            var facets = ["editDamage", "userIntent"];
            var facetNames = {
                editDamage: "edit damage",
                userIntent: "user intent"
            };
            var facetHelp = {
                editDamage: "The edit damage label indicates whether this edit causes damage to the article or not. The optional checkbox on the right lets you specify that you provide the label with lower confidence when you're not so sure.",
                userIntent: "The user intent label indicates whether the edit was saved in good or bad faith. The optional checkbox on the right lets you specify that you provide the label with lower confidence when you're not so sure."
            };
            var labels = {
                editDamage: ["damaging", "not damaging"],
                userIntent: ["bad faith", "good faith"]
            };
            var labelIcons = {
                editDamage: ["alert", "success"],
                userIntent: ["alert", "heart"]
            }
            var successMessage = "Your submission has been recorded.";
            var warningMessage = "Your submission has been recorded but is different from the primary label ";
            
            // get config
            var mwApi = new mw.Api();
            var diffNewId = mw.config.get("wgDiffNewId");
            var userName = mw.config.get("wgUserName");
            var userId = mw.config.get("wgUserId");
            var revisionId; // revision ID of the entity page
            var entityPageTitle = wikibenchURL + entityType.charAt(0).toUpperCase() + entityType.slice(1) + ":" + diffNewId.toString();
            var entityPageHeader = "{{Warning |heading=Script installation is required for reading and editing |This page is part of the Wikibench project on the English Wikipedia. Please read the [[en:User:Tzusheng/sandbox/Wikipedia:Wikibench/Campaign:Editquality|project page]] and install the script to see this page correctly rendered. Do not edit the source without installing the script.}}";
            var routingMessage = "You are welcome to review other Wikipedians' labels on the <a href=\"/wiki/" + entityPageTitle + "\">entity page of this " + entityType + "</a> or close this message for resubmission.";

            // labels
            var entityLabels = {};
            var primaryLabels = {};
            var autolabeled = {};
            var userLabels = {};
            var userLowConfidences = {};
            var userNotes = {};
            var otherIndividualLabelCount = 0;

            // widgets
            var facetBtns = {};
            var facetLowConfidenceCheckboxes = {};
            var facetWidgets = {};
            var facetNoteInputs = {}; // assume notes might be different
            var submitBtn;
            var submitMessage;


            // ajax call
            var getEntityPage = mwApi.get({
                action: "query",
                prop: "revisions",
                rvprop: "content",
                titles: entityPageTitle,
                format: "json"
            });

            var parseExistingLabels = getEntityPage.then(function(ret) {
                revisionId = Object.keys(ret.query.pages)[0];
                
                if (revisionId === "-1") { // page don't exist
                    console.log("DEBUG: page doesn't exist");

                }
                else { // page exist already
                    console.log("DEBUG: page already exists");
                    
                    var revisions = ret.query.pages;
                    var pageId = Object.keys(revisions)[0];
                    entityLabels = JSON.parse(revisions[pageId].revisions[0]["*"].split(entityPageSplit)[1]);

                    facets.forEach(function(f) {
                        primaryLabels[f] = entityLabels.facets[f].primaryLabel.label;
                        autolabeled[f] = entityLabels.facets[f].primaryLabel.autolabeled;
                        entityLabels.facets[f].individualLabels.forEach(function(i) {
                            if (userName === i.userName) {
                                userLabels[f] = i.label;
                                userLowConfidences[f] = i.lowConfidence;
                                userNotes[f] = i.note;
                            }
                            else {
                                otherIndividualLabelCount += 1;
                            }
                        });
                    });
                    otherIndividualLabelCount /= Math.ceil(facets.length);
                }
            });

            var renderWikibenchPlugIn = parseExistingLabels.then(function() {
                mw.loader.using(["oojs-ui-core", "oojs-ui-widgets", "oojs-ui-windows"]);

                facets.forEach(function(f) {
                    facetBtns[f] = new OO.ui.ButtonSelectWidget({
                        items: [
                            new OO.ui.ButtonOptionWidget({
                                data: labels[f][0],
                                label: labels[f][0],
                                icon: labelIcons[f][0]
                            }),
                            new OO.ui.ButtonOptionWidget({
                                data: labels[f][1],
                                label: labels[f][1],
                                icon: labelIcons[f][1]
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

                    facetNoteInputs[f] = new OO.ui.TextInputWidget({
                        // placeholder:
                    })

                    if (!$.isEmptyObject(userNotes)){
                        facetNoteInputs[f].setValue(userNotes[f]);
                    }
                });

                // var noteInput = new OO.ui.MultilineTextInputWidget({
                //     placeholder: "Add a note to your label",
                //     rows: 2
                // });

                submitBtn = new OO.ui.ButtonWidget({
                    label: "Submit",
                    flags: ["primary", "progressive"]
                });

                submitMessage = new OO.ui.MessageWidget({
                    showClose: true
                });

                submitMessage.toggle(false);

                var fieldset = new OO.ui.FieldsetLayout({ 
                    label: "Wikibench Plug-In",
                    id: "wikibench-diff-plugin"
                });

                // if user label already exists
                if (!$.isEmptyObject(userLabels)) {

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
                        submitMessage.setLabel(new OO.ui.HtmlSnippet("<strong>" + warningMessage + primaryLabelMessage + ".</strong>" + "<br>" + routingMessage));
                    }
                    submitMessage.toggle(true);
                    submitBtn.setDisabled(true);
                    submitBtn.toggle(false);


                    // fieldset.addItems(
                    //     new OO.ui.MessageWidget({
                    //         type: "notice",
                    //         showClose: true,
                    //         label: new OO.ui.HtmlSnippet("<strong>You have previously provided labels for this edit.</strong><br>If you wish to make changes to your previous submission, you may update it below and resubmit.")
                    //     })
                    // );
                }

                fieldset.addItems(
                    new OO.ui.FieldLayout(
                        new OO.ui.LabelWidget({label: diffNewId.toString()}), {
                        label: "Diff new ID",
                        align: "left"
                        // help: "Revision ID of the new revision on the right when viewing a diff."
                    })
                );

                facets.forEach(function(f) {
                    fieldset.addItems(
                        new OO.ui.FieldLayout(facetWidgets[f], {
                            label: facetNames[f].charAt(0).toUpperCase() + facetNames[f].slice(1),
                            align: "left",
                            help: facetHelp[f]
                        })
                    );
                });

                facets.forEach(function(f) {
                    fieldset.addItems(
                        new OO.ui.FieldLayout(facetNoteInputs[f], {
                            label: "Note for " + facetNames[f],
                            align: "left",
                            help: "An optional note that explains the labels you provide and, in case of low confidence, why so."
                        })
                    );
                });

                fieldset.addItems([
                    new OO.ui.FieldLayout(submitBtn, {}),
                    new OO.ui.FieldLayout(submitMessage, {})
                ]);


                $("#contentSub").append(fieldset.$element);

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

                        // TODO: consider auto label here

                        mwApi.get({
                            action: "query",
                            prop: "revisions",
                            rvprop: "content",
                            titles: entityPageTitle,
                            format: "json"
                        }).done(function(ret) {

                            // get primary label again

                            console.log("get revision ID again:")
                            console.log(Object.keys(ret.query.pages)[0]);

                            var submitLabels = {};
                            var submitContent;
                            facets.forEach(function(f) {
                                submitLabels[f] = {
                                    "userName": userName,
                                    "userId": userId,
                                    "label": userLabels[f],
                                    "note": facetNoteInputs[f].getValue(),
                                    "origin": "wikibench-enwiki-diff-plugin",
                                    "created": "time1",
                                    "touched": "time2",
                                    "lowConfidence": facetLowConfidenceCheckboxes[f].isSelected(),
                                    "category": []
                                }
                            });

                            if (Object.keys(ret.query.pages)[0] === "-1") { // page doesn't exist
                                console.log("page doesn't exist");
                                submitContent = {
                                    "entityType": entityType,
                                    "entityId": diffNewId,
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
                            else {
                                console.log("page already exists");
                                var revisions = ret.query.pages;
                                var pageId = Object.keys(revisions)[0];
                                submitContent = JSON.parse(revisions[pageId].revisions[0]["*"].split(entityPageSplit)[1]);
                                facets.forEach(function(f) {
                                    var isUserLabelExist = false;
                                    for (var l in submitContent.facets[f].individualLabels) {
                                        if (submitContent.facets[f].individualLabels[l].userName === userName) {
                                            submitLabels[f].created = submitContent.facets[f].individualLabels[l].created;
                                            submitContent.facets[f].individualLabels[l] = submitLabels[f];
                                            isUserLabelExist = true;
                                            break;
                                        }
                                    }
                                    if (!isUserLabelExist) {
                                        submitContent.facets[f].individualLabels.push(submitLabels[f]);
                                    }
                                    primaryLabels[f] = submitContent.facets[f].primaryLabel.label; // get primary label again in case someone updates it in between
                                });
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
                                    submitMessage.setLabel(new OO.ui.HtmlSnippet("<strong>" + warningMessage + primaryLabelMessage + ".</strong>" + "<br>" + routingMessage));
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

            $.when(renderWikibenchPlugIn).done(function(data) {
                console.log("done");
            });
        }
    });
})(jQuery, mediaWiki);