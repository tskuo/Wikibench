(function ($, mw) {
    $(document).ready(function() {
        if(mw.config.get("wgDiffNewId") !== null) {
            console.log("diff page");
            mw.loader.using(["oojs-ui-core", "oojs-ui-widgets", "oojs-ui-windows"]).done(function () {
                let diffNewId = new OO.ui.TextInputWidget({
                    value: mw.config.get("wgDiffNewId"),
                    readOnly: true
                });

                let editQualityBtns = new OO.ui.ButtonSelectWidget({
                    items: [
                        new OO.ui.ButtonOptionWidget({
                            data: "1",
                            label: "damaging",
                            icon: "alert"
                        }),
                        new OO.ui.ButtonOptionWidget({
                            data: "2",
                            label: "not damaging",
                            icon: "success"
                        }),
                        new OO.ui.ButtonOptionWidget({
                            data: "3",
                            label: "unsure"
                        })
                    ]
                });

                let userIntentBtns = new OO.ui.ButtonSelectWidget({
                    items: [
                        new OO.ui.ButtonOptionWidget({
                            data: "4",
                            label: "bad faith",
                            icon: "alert"
                        }),
                        new OO.ui.ButtonOptionWidget({
                            data: "5",
                            label: "good faith",
                            icon: "heart"
                        }),
                        new OO.ui.ButtonOptionWidget({
                            data: "6",
                            label: "unsure"
                        })
                    ]
                });

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

                let fieldset = new OO.ui.FieldsetLayout({ 
                    label: "Wikibench Plug-In",
                    classes: ["wikibench-plugin"]
                });

                fieldset.addItems([
                    new OO.ui.FieldLayout(diffNewId, {
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