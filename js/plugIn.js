(function ($, mw) {
    $(document).ready(function() {
        if(mw.config.get("wgDiffNewId") !== null) {

            let mwApi = new mw.Api();

            console.log("diff page");
            
            mw.loader.using(["oojs-ui-core", "oojs-ui-widgets", "oojs-ui-windows"]).done(function () {
                
                let diffNewId =  mw.config.get("wgDiffNewId");
                let userName = mw.config.get("wgUserName");
                let userId = mw.config.get("wgUserId");

                let diffNewIdInput = new OO.ui.TextInputWidget({
                    value: diffNewId,
                    readOnly: true
                });

                let editQualityLabel = "";     

                let editQualityBtns = new OO.ui.ButtonSelectWidget({
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
                        }),
                        new OO.ui.ButtonOptionWidget({
                            data: "unsure",
                            label: "unsure"
                        })
                    ]
                });

                editQualityBtns.on("choose", function(item){
                    editQualityLabel = item.getData();
                });

                let userIntentLabel = "";  

                let userIntentBtns = new OO.ui.ButtonSelectWidget({
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
                        }),
                        new OO.ui.ButtonOptionWidget({
                            data: "unsure",
                            label: "unsure"
                        })
                    ]
                });

                userIntentBtns.on("choose", function(item){
                    userIntentLabel = item.getData();
                });

                let attentionFlag = new OO.ui.CheckboxInputWidget();

                let commentInput = new OO.ui.MultilineTextInputWidget({
                    placeholder: "A brief comment on the labels your provide",
                    rows: 3
                });

                let submitBtn = new OO.ui.ButtonWidget({
                    label: "Submit",
                    flags: [
                        "primary",
                        "progressive"
                    ]
                });

                submitBtn.on("click", function(){
                    // labels are required for submission
                    if (editQualityLabel === "" || userIntentLabel === ""){
                        OO.ui.alert("Edit quality and user intent labels are required for submission.").done(function(){
                            // console.log("User closed the dialog.");
                        });
                    }
                    else if (userName === null){
                        OO.ui.alert("Login is required for Wikibench submission.");
                    }
                    else {

                        let title = "User:Tzusheng/sandbox/Wikipedia:Wikibench/Diff:" + diffNewId.toString();
                        
                        mwApi.get({
                            action: "query",
                            prop: "revisions",
                            rvprop: "content",
                            titles: title,
                            format: "json"
                        }).then(function(ret){

                            let editQualityMetaLabel = {
                                "entityType": "diff",
                                "entityId": diffNewId,
                                "userName": userName,
                                "userId": userId,
                                "label": editQualityLabel,
                                "comment": commentInput.getValue(),
                                "origin": "WikibenchPlugIn",
                                "created": "time1",
                                "touched": "time2",
                                "primary": false,
                                "flagged": attentionFlag.isSelected(),
                                "category": [],
                                "autolabelled": false
                            };
    
                            let userIntentMetaLabel = {
                                "entityType": "diff",
                                "entityId": diffNewId,
                                "userName": userName,
                                "userId": userId,
                                "label": userIntentLabel,
                                "comment": commentInput.getValue(),
                                "origin": "WikibenchPlugIn",
                                "created": "time1",
                                "touched": "time2",
                                "primary": false,
                                "flagged": attentionFlag.isSelected(),
                                "category": [],
                                "autolabelled": false
                            };

                            let revisionId = Object.keys(ret.query.pages)[0];
                            if (revisionId === "-1") {
                                // page don't exist -> primary label
                                console.log("page don't exist");

                                editQualityMetaLabel.primary = true;
                                userIntentMetaLabel.primary = true;

                                let entityPageText = {
                                    "entityType": "diff",
                                    "entityId": diffNewId,
                                    "facets": {
                                        "editQuality": [editQualityMetaLabel],
                                        "userIntent": [userIntentMetaLabel]
                                    }
                                };

                                mwApi.postWithToken("csrf",{
                                    action: "edit",
                                    title: "User:Tzusheng/sandbox/Wikipedia:Wikibench/Diff:" + diffNewId.toString(),
                                    section: 0,
                                    text: JSON.stringify(entityPageText),
                                    summary: "new label submission",
                                    createonly: true
                                }).done(function(result,jqXHR){
                                    console.log("created successfully");
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

                let fieldset = new OO.ui.FieldsetLayout({ 
                    label: "Wikibench Plug-In",
                    classes: ["wikibench-plugin"]
                });

                fieldset.addItems([
                    new OO.ui.FieldLayout(diffNewIdInput, {
                        label: "Diff new ID",
                        align: "left",
                        help: "Revision ID of the new revision when viewing a diff. Auto populated and read only."
                    }),

                    new OO.ui.FieldLayout(editQualityBtns, {
                        label: "Edit quality",
                        align: "left",
                        help: "Whether this edit causes damage to the article."
                    }),

                    new OO.ui.FieldLayout(userIntentBtns, {
                        label: "User intent",
                        align: "left",
                        help: "Whether this edit was saved in good or bad faith by the editor."
                    }),

                    new OO.ui.FieldLayout(attentionFlag, {
                        label: "Flag for attention",
                        align: "left"
                        //help: "(optional) Check the box if you'd like to flag your label for other people's attention, for example, when you are unsure about your labels."
                    }),

                    new OO.ui.FieldLayout(commentInput, {
                        label: "Comment",
                        align: "left",
                        help: "(optional)",
                        helpInline: true
                    }),

                    new OO.ui.FieldLayout(submitBtn, {
                        align: "right"
                    })
                ]);

                $("#siteSub").append(fieldset.$element);

            });
            
            $(".wikibench-plugin").css({
                "background-color": "#f8f9fa",
                "padding": "10px"
            });

        }
        else {
            console.log("not diff page");
        }
    });
})(jQuery, mediaWiki);