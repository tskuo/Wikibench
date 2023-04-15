(function ($, mw) {
    $(document).ready(function() {
        if(mw.config.get("wgDiffNewId") !== null) {

            var mwApi = new mw.Api();

            console.log("diff page");
            
            mw.loader.using(["oojs-ui-core", "oojs-ui-widgets", "oojs-ui-windows"]).done(function () {
                
                var diffNewId =  mw.config.get("wgDiffNewId");
                var userName = mw.config.get("wgUserName");
                var userId = mw.config.get("wgUserId");

                // Edit quality widgets

                var editDamageLabel = "";     

                var editDamageBtns = new OO.ui.ButtonSelectWidget({
                    items: [
                        new OO.ui.ButtonOptionWidget({
                            data: "damaging",
                            label: "damaging",
                            icon: "alert"
                        }),
                        new OO.ui.ButtonOptionWidget({
                            data: "not damaging",
                            label: "not damaging",
                            icon: "success"
                        })
                    ]
                });

                editDamageBtns.on("choose", function(item){
                    editDamageLabel = item.getData();
                });

                var editDamageLowConfidence = new OO.ui.CheckboxInputWidget();

                var editDamageWidgets = new OO.ui.Widget({
                    content: [
                        new OO.ui.HorizontalLayout({
                            items: [
                                editDamageBtns,
                                editDamageLowConfidence,
                                new OO.ui.LabelWidget({label: "low confidence"})
                            ]
                        })
                    ]
                });

                
                // User intent widgets

                var userIntentLabel = "";  

                var userIntentBtns = new OO.ui.ButtonSelectWidget({
                    items: [
                        new OO.ui.ButtonOptionWidget({
                            data: "bad faith",
                            label: "bad faith",
                            icon: "alert"
                        }),
                        new OO.ui.ButtonOptionWidget({
                            data: "good faith",
                            label: "good faith",
                            icon: "heart"
                        })
                    ]
                });

                userIntentBtns.on("choose", function(item){
                    userIntentLabel = item.getData();
                });

                var userIntentLowConfidence = new OO.ui.CheckboxInputWidget();

                var userIntentWidgets = new OO.ui.Widget({
                    content: [
                        new OO.ui.HorizontalLayout({
                            items: [
                                userIntentBtns,
                                userIntentLowConfidence,
                                new OO.ui.LabelWidget({label: "low confidence"})
                            ]
                        })
                    ]
                });

                var noteInput = new OO.ui.MultilineTextInputWidget({
                    placeholder: "Add a note to your label",
                    rows: 2
                });

                var submitBtn = new OO.ui.ButtonWidget({
                    label: "Submit",
                    flags: [
                        "primary",
                        "progressive"
                    ]
                });

                submitBtn.on("click", function(){
                    // labels are required for submission
                    if (editDamageLabel === "" || userIntentLabel === ""){
                        OO.ui.alert("Edit damage and user intent labels are required for Wikibench submission.").done(function(){
                            // console.log("User closed the dialog.");
                        });
                    }
                    else if (userName === null){
                        OO.ui.alert("Login is required for Wikibench submission.");
                    }
                    else {

                        var entityPageWarningMessage = "{{Warning |heading=Script installation is required for reading and editing |This page is part of the Wikibench project on the English Wikipedia. Please read the [[en:User:Tzusheng/sandbox/Wikipedia:Wikibench/Campaign:Editquality|project page]] and install the script to see this page correctly rendered. Do not edit the source without installing the script.}}\n-----\n";

                        var title = "User:Tzusheng/sandbox/Wikipedia:Wikibench/Diff:" + diffNewId.toString();
                        
                        mwApi.get({
                            action: "query",
                            prop: "revisions",
                            rvprop: "content",
                            titles: title,
                            format: "json"
                        }).then(function(ret){

                            var editDamageSubmission = {
                                "userName": userName,
                                "userId": userId,
                                "label": editDamageLabel,
                                "note": noteInput.getValue(),
                                "origin": "WikibenchDiffPlugIn",
                                "created": "time1",
                                "touched": "time2",
                                "lowConfidence": editDamageLowConfidence.isSelected(),
                                "category": [],
                            };
    
                            var userIntentSubmission = {
                                "userName": userName,
                                "userId": userId,
                                "label": userIntentLabel,
                                "note": noteInput.getValue(),
                                "origin": "WikibenchDiffPlugIn",
                                "created": "time1",
                                "touched": "time2",
                                "lowConfidence": userIntentLowConfidence.isSelected(),
                                "category": [],
                            };

                            var revisionId = Object.keys(ret.query.pages)[0];
                            if (revisionId === "-1") {
                                // page don't exist -> primary label
                                console.log("page don't exist");

                                var entityPageContent = {
                                    "entityType": "diff",
                                    "entityId": diffNewId,
                                    "facets": {
                                        "editDamage": {
                                            "primaryLabel": {
                                                "lastModifier": userName,
                                                "lastModifierId": userId,
                                                "label": editDamageLabel,
                                                "touched": "time2",
                                                "autolabeled": false
                                            },
                                            "individualLabels": [editDamageSubmission]
                                        },
                                        "userIntent": {
                                            "primaryLabel": {
                                                "lastModifier": userName,
                                                "lastModifierId": userId,
                                                "label": userIntentLabel,
                                                "touched": "time2",
                                                "autolabeled": false
                                            },
                                            "individualLabels": [userIntentSubmission]
                                        }
                                    }
                                };

                                mwApi.postWithToken("csrf",{
                                    action: "edit",
                                    title: "User:Tzusheng/sandbox/Wikipedia:Wikibench/Diff:" + diffNewId.toString(),
                                    section: 0,
                                    text: entityPageWarningMessage + JSON.stringify(entityPageContent),
                                    summary: "create entity page and submit primary and individual labels",
                                    createonly: true
                                }).done(function(result,jqXHR){
                                    console.log("Success: Entity page creation.");
                                }).fail(function(code,result){
                                    if ( code === "http" ) {
                                        mw.log( "HTTP error: " + result.textStatus ); // result.xhr contains the jqXHR object
                                    } else if ( code === "ok-but-empty" ) {
                                        mw.log( "Got an empty response from the server" );
                                    } else {
                                        mw.log( "API error: " + code );
                                    }
                                });
                            }
                            else {
                                // page exist already -> not primary label, if different, encourage deliberation
                                console.log("page exist already");

                                // check if user already label it
                                // console.log(ret.query.pages[revisionId].revisions[0]["*"]);
                            }
                        });
                    }
                });

                var fieldset = new OO.ui.FieldsetLayout({ 
                    label: "Wikibench Plug-In",
                    id: "wikibench-diff-plugin"
                    // help: "info" 
                });

                fieldset.addItems([
                    new OO.ui.FieldLayout(
                        new OO.ui.LabelWidget({label: diffNewId.toString()}), {
                        label: "Diff new ID",
                        align: "left"
                        // help: "Revision ID of the new revision on the right when viewing a diff."
                    }),

                    new OO.ui.FieldLayout(editDamageWidgets, {
                        label: "Edit damage *",
                        align: "left",
                        help: "The edit damage label indicates whether this edit causes damage to the article or not. The optional checkbox on the right lets you specify that you provide the label with lower confidence when you're not so sure."
                    }),

                    new OO.ui.FieldLayout(userIntentWidgets, {
                        label: "User intent *",
                        align: "left",
                        help: "The user intent label indicates whether the edit was saved in good or bad faith. The optional checkbox on the right lets you specify that you provide the label with lower confidence when you're not so sure."
                    }),

                    // new OO.ui.FieldLayout(lowConfidence, {
                    //     label: "Low confidence",
                    //     algin: "left"

                    // }),

                    new OO.ui.FieldLayout(noteInput, {
                        label: "Note",
                        align: "left",
                        help: "An optional note that explains the labels you provide and, in case of low confidence, why so."
                        // helpInline: true

                    }),

                    new OO.ui.FieldLayout(submitBtn, {})
                ]);

                $("#siteSub").append(fieldset.$element);

            });
        }
        else {
            console.log("not diff page");
        }
    });
})(jQuery, mediaWiki);