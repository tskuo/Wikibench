(function ($, mw) {
    $(document).ready(function() {

        const entityPagePrefix = "User:Tzusheng/sandbox/Wikipedia:Wikibench/Diff:";
        var wgPageName = mw.config.get("wgPageName");

        if(wgPageName.startsWith(entityPagePrefix) && mw.config.get("wgAction") === "view") {
            console.log("entity page");
            var mwApi = new mw.Api();            
            mw.loader.using(["oojs-ui-core", "oojs-ui-widgets", "oojs-ui-windows"]).done(function () {
                
                var entityId = Number(wgPageName.substring(entityPagePrefix.length));
                var userName = mw.config.get("wgUserName");
                var userId = mw.config.get("wgUserId");
                var revisionId = mw.config.get("wgRevisionId");

                mwApi.get({
                    action: "parse",
                    page: wgPageName,
                    prop: "wikitext"
                }).done(function(ret) {
                    $(".mw-parser-output").find("p").remove();
                    var label = JSON.parse(ret.parse.wikitext["*"]);

                    var noticeBox = new OO.ui.MessageWidget({
                        type: "notice",
                        label: "Please do not directly edit source of this page. To update the primary or your label, click the edit buttons. To discuss, visit the talk page."
                    });

                    // Primary label

                    var editDamagePrimary = new OO.ui.LabelWidget({
                        label: label.facets.editDamage.primaryLabel.label
                    });

                    var userIntentPrimary = new OO.ui.LabelWidget({
                        label: label.facets.userIntent.primaryLabel.label
                    });

                    var editPrimaryBtn = new OO.ui.ButtonWidget({
                        label: 'Edit'
                    });

                    var primaryFieldset = new OO.ui.FieldsetLayout({ 
                        label: "Primary label",
                        classes: ["wikibench-entity-label"],
                    });

                    primaryFieldset.addItems([
                        new OO.ui.FieldLayout(editDamagePrimary, {
                            label: "Edit damage",
                            align: "left"
                        }),
                        new OO.ui.FieldLayout(userIntentPrimary, {
                            label: "User intent",
                            align: "left"
                        }),
                        new OO.ui.FieldLayout(editPrimaryBtn, {
                            align: "left"
                        })
                    ]);

                    // User label

                    var editDamageUser = new OO.ui.LabelWidget({
                        label: label.facets.editDamage.individualLabels["0"].label
                    });

                    var userIntentUser = new OO.ui.LabelWidget({
                        label: label.facets.userIntent.individualLabels["0"].label
                    });

                    var editUserBtn = new OO.ui.ButtonWidget({
                        label: 'Edit'
                    });

                    var userFieldset = new OO.ui.FieldsetLayout({ 
                        label: "Your label",
                        classes: ["wikibench-entity-label"]
                    });

                    userFieldset.addItems([
                        new OO.ui.FieldLayout(editDamageUser, {
                            label: "Edit damage",
                            align: "left"
                        }),
                        new OO.ui.FieldLayout(userIntentUser, {
                            label: "User intent",
                            align: "left"
                        }),
                        new OO.ui.FieldLayout(editUserBtn, {
                            align: "left"
                        })
                    ]);

                    mwApi.get({
                        action: "parse",
                        text: "{{Stacked bar|height=18px|A1=30|C1=#b32424|T1=damaging |A2=20|C2=#fee7e6|T2=likely damaging |A3=20|C3=#d5fdf4|T3=likely not damaging |A4=30|C4=#14866d|T4=not damaging |Total=100}}",
                        contentmodel: "wikitext"
                    }).done(function(ret){
                        console.log(ret);
                        $(".mw-parser-output")
                            .append(noticeBox.$element)
                            .append(primaryFieldset.$element)
                            .append(userFieldset.$element)
                            .append("<h2>Edit damage</h2>")
                            .append(ret.parse.text["*"])
                            .append("<h2>User intent</h2>")
                            .append(ret.parse.text["*"]);
                        
                        $(".wikibench-entity-label").css({
                            "background-color": "#f8f9fa",
                            "padding": "10px",
                            "margin": "11px 0px"
                        });
                    });

                    // $(".mw-parser-output")
                    //     .append("<h2>Primary label</h2>")
                    //     .append("<p>Edit damage: " + label.facets.editDamage.primaryLabel.label + "</p>")
                    //     .append("<p>User intent: " + label.facets.userIntent.primaryLabel.label + "</p>")
                    //     .append("<h2>Your label</h2>")
                    //     .append("<p>dddd</p>");

                    console.log(label);
                })
            });
        }
        else {
            console.log("not entity page");
        }
    });
})(jQuery, mediaWiki);