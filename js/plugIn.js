(function ($, mw) {
    $(document).ready(function() {
        if(mw.config.get("wgDiffNewId") !== null) {

            var mwApi = new mw.Api();

            console.log("diff page");
            
            mw.loader.using(["oojs-ui-core", "oojs-ui-widgets", "oojs-ui-windows"]).done(function () {
                
                var diffNewId =  mw.config.get("wgDiffNewId");
                var userName = mw.config.get("wgUserName");
                var userId = mw.config.get("wgUserId");

                // Diff new id

                // var diffNewIdInput = new OO.ui.TextInputWidget({
                //     value: diffNewId,
                //     disareabled: true
                // });

                var diffNewIdInput = new OO.ui.LabelWidget({
                    label: diffNewId.toString()
                })

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

                // var editQualityLowConfidence = new OO.ui.CheckboxInputWidget();

                // var editQualityWidgets = new OO.ui.Widget({
                //     content: [
                //         new OO.ui.HorizontalLayout({
                //             items: [
                //                 editQualityBtns,
                //                 editQualityLowConfidence
                //             ]
                //         })
                //     ]
                // });

                
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

                // var userIntentLowConfidence = new OO.ui.CheckboxInputWidget();

                // var userIntentWidgets = new OO.ui.Widget({
                //     content: [
                //         new OO.ui.HorizontalLayout({
                //             items: [
                //                 userIntentBtns,
                //                 userIntentLowConfidence
                //             ]
                //         })
                //     ]
                // });

                var lowConfidence = new OO.ui.CheckboxInputWidget();


                var noteInput = new OO.ui.MultilineTextInputWidget({
                    placeholder: "Add a note to your label",
                    rows: 3
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
                                "lowConfidence": lowConfidence.isSelected(),
                                "category": [],
                            };
    
                            var userIntentSubmission = {
                                "userName": userName,
                                "userId": userId,
                                "label": userIntentLabel,
                                "comment": noteInput.getValue(),
                                "origin": "WikibenchDiffPlugIn",
                                "created": "time1",
                                "touched": "time2",
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
                                                "lastModifierId": diffNewId,
                                                "label": editDamageLabel,
                                                "touched": "time2",
                                                "autolabeled": false
                                            },
                                            "individualLabels": [editDamageSubmission]
                                        },
                                        "userIntent": {
                                            "primaryLabel": {
                                                "lastModifier": userName,
                                                "lastModifierId": diffNewId,
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
                                    text: JSON.stringify(entityPageContent),
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
                    id: "wikibench-diff-plugin",
                    // help: "please check"
                });

                fieldset.addItems([
                    new OO.ui.FieldLayout(diffNewIdInput, {
                        label: "Diff new ID",
                        align: "left"
                        //help: "Revision ID of the new revision when viewing a diff. Auto populated and read only."
                    }),

                    new OO.ui.FieldLayout(editDamageBtns, {
                        label: "Edit damage *",
                        align: "left",
                        //help: "Whether this edit causes damage to the article."
                    }),

                    new OO.ui.FieldLayout(userIntentBtns, {
                        label: "User intent *",
                        align: "left",
                        //help: "Whether this edit was saved in good or bad faith by the editor."
                    }),

                    new OO.ui.FieldLayout(lowConfidence, {
                        label: "Low confidence",
                        algin: "left"

                    }),

                    new OO.ui.FieldLayout(noteInput, {
                        label: "Note",
                        align: "left"
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