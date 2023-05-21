(function ($, mw) {
    $(document).ready(function() {

        // init
        var wikibenchURL = "User:Tzusheng/sandbox/Wikipedia:Wikibench/";
        var entityType = "diff";
        var entityPageSplit = "-----";
        var entityPagePrefix = wikibenchURL + entityType.charAt(0).toUpperCase() + entityType.slice(1) + ":";
        var language = "en";
        var facets = ["editDamage", "userIntent"];
        var facetNames = {
            editDamage: "edit damage",
            userIntent: "user intent"
        };

        var wgPageName = mw.config.get("wgPageName");

        if(wgPageName.startsWith(entityPagePrefix) && mw.config.get("wgAction") === "view") {
            var mwApi = new mw.Api();
            
            var diffTableHeader = "<table class=\"diff diff-contentalign-left diff-editfont-monospace\" data-mw=\"interface\"><colgroup><col class=\"diff-marker\"><col class=\"diff-content\"><col class=\"diff-marker\"><col class=\"diff-content\"></colgroup><tbody>";
            var diffTableFooter = "</tbody></table>";
            var diffTableContent, diffTableTitle;

            var entityId = Number(wgPageName.substring(entityPagePrefix.length));
            var userName = mw.config.get("wgUserName");
            var userId = mw.config.get("wgUserId");
            var revisionId = mw.config.get("wgRevisionId");

            mw.loader.using(["oojs-ui-core", "oojs-ui-widgets", "oojs-ui-windows", "mediawiki.diff.styles"]).done(function () {
                mwApi.get({
                    action: "compare",
                    fromrev: entityId,
                    torelative: "prev",
                }).done(function(ret) {
                    diffTableContent = ret.compare["*"];
                    diffTableTitle = 
                    `<tr class="diff-title" lang="${language}">
                        <td colspan="2" class="diff-otitle diff-side-deleted">
                            <div id="mw-diff-otitle1">
                                <strong><a href="/w/index.php?oldid=${ret.compare.fromrevid}" title="${ret.compare.fromtitle}">Previous revision</a>
                            </div>
                            <div id="mw-diff-otitle5"></div>
                        </td>
                        <td colspan="2" class="diff-ntitle diff-side-added">
                            <div id="mw-diff-ntitle1">
                                <strong><a href="/w/index.php?oldid=${ret.compare.torevid}" title="${ret.compare.fromtitle}">Edited revision</a>
                            </div>
                            <div id="mw-diff-ntitle5"></div>
                         </td>
                    </tr>`
                });
            }).done(function(){

                mwApi.get({
                    action: "parse",
                    page: wgPageName,
                    prop: "wikitext"
                }).done(function(ret) {
                    $(".mw-parser-output").find("table").remove(); // remove warning message
                    $(".mw-parser-output").find("hr").remove(); // remove horizontal line
                    $(".mw-parser-output").find("p").remove(); // remove json content
                    var label = JSON.parse(ret.parse.wikitext["*"].split(entityPageSplit)[1]);

                    var noticeBox = new OO.ui.MessageWidget({
                        type: "notice",
                        label: "Please do not directly edit source of this page. To update the primary or your label, click the edit buttons. To discuss, visit the talk page."
                    });

                    // Primary label

                    var primaryFieldset = new OO.ui.FieldsetLayout({ 
                        label: "Primary label",
                        classes: ["wikibench-entity-primary-label"],
                    });

                    facets.forEach(function(f) {
                        var facetPrimaryLabel = new OO.ui.LabelWidget({
                            label: label.facets[f].primaryLabel.label
                        });
                        primaryFieldset.addItems(
                            new OO.ui.FieldLayout(facetPrimaryLabel, {
                                label: facetNames[f].charAt(0).toUpperCase() + facetNames[f].slice(1),
                                align: "left"
                            })
                        )
                    });

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
                        // flags: ["primary", "progressive"]
                    });

                    primaryFieldset.addItems(
                        new OO.ui.FieldLayout(editPrimaryBtn, {
                            align: "left"
                        })
                    );

                    // User label

                    var userFieldset = new OO.ui.FieldsetLayout({ 
                        label: "Your label (" + userName + ")",
                        classes: ["wikibench-entity-user-label"]
                    });

                    facets.forEach(function(f) {
                        var userLabel = "N/A";
                        label.facets[f].individualLabels.forEach(function(l) {
                            if (userName === l.userName) {
                                userLabel = l.label;
                                userNote = l.note;
                                if (l.lowConfidence) {
                                    userLabel += " (low confidence)";
                                }
                            }
                        });
                        userFieldset.addItems(
                            new OO.ui.FieldLayout(
                                new OO.ui.LabelWidget({
                                    label: userLabel
                                }), {
                                    label: facetNames[f].charAt(0).toUpperCase() + facetNames[f].slice(1),
                                    align: "left" 
                            })
                        );
                    });

                    var editUserBtn = new OO.ui.ButtonWidget({
                        label: "Edit"
                    });

                    userFieldset.addItems([
                        new OO.ui.FieldLayout(editUserBtn, {
                            align: "left"
                        })
                    ]);

                    // individual labels
                    
                    var fieldset1 = new OO.ui.FieldsetLayout( {
                        icon: "expand",
                        label: 'Damaging (2)',
                        classes: ['wikibench-entity-individual-labels']
                    } );
                    
                    fieldset1.addItems([
                        new OO.ui.FieldLayout(
                            new OO.ui.LabelWidget({label: 'Comment'}),
                            {label: "user1"}
                        ),
                        new OO.ui.FieldLayout(
                            new OO.ui.LabelWidget({label: 'Comment'}),
                            {label: "user2"}
                        )
                    ]);

                    var fieldset2 = new OO.ui.FieldsetLayout( {
                        icon: "expand",
                        label: 'Not Damaging (2)',
                        classes: ['wikibench-entity-individual-labels']
                    } );
                    
                    fieldset2.addItems([
                        new OO.ui.FieldLayout(
                            new OO.ui.LabelWidget({label: 'Comment'}),
                            {label: "user1"}
                        ),
                        new OO.ui.FieldLayout(
                            new OO.ui.LabelWidget({label: 'Comment'}),
                            {label: "user2"}
                        )
                    ]);

                    fieldset1.$group.toggle(false);
                    fieldset2.$group.toggle(false);

                    mwApi.get({
                        action: "parse",
                        text: "{{Stacked bar|height=18px|A1=30|C1=#b32424|T1=damaging |A2=20|C2=#fee7e6|T2=likely damaging |A3=20|C3=#d5fdf4|T3=likely not damaging |A4=30|C4=#14866d|T4=not damaging |Total=100}}",
                        contentmodel: "wikitext"
                    }).done(function(ret){
                        $(".mw-parser-output")
                            .append(noticeBox.$element)
                            .append(diffTableHeader + diffTableTitle + diffTableContent + diffTableFooter)
                            // .append(tableheader + teststring + tableend)
                            .append(primaryFieldset.$element)
                            .append(userFieldset.$element)
                            .append("<h2>Edit damage</h2>")
                            .append("<h3>Label distribution</h3>")
                            .append(ret.parse.text["*"])
                            .append("<h3>Individual labels</h3>")
                            .append(fieldset1.$element)
                            .append(fieldset2.$element)
                            .append("<h2>User intent</h2>")
                            .append("<h3>Label distribution</h3>")
                            .append(ret.parse.text["*"])
                            .append("<h3>Individual labels</h3>");
                        
                        $(".wikibench-entity-primary-label").css({
                            "background-color": "#eaf3ff",
                            "padding": "10px",
                            "margin": "11px 0px"
                        });
                        
                        $(".wikibench-entity-user-label").css({
                            "background-color": "#f8f9fa",
                            "padding": "10px",
                            "margin": "11px 0px"
                        });
                        
                        $(".wikibench-entity-individual-labels > .oo-ui-fieldsetLayout-header").click(function(){
                            var header = $(this);
                            var content = header.next();
                            //open up the content needed - toggle the slide- if visible, slide up, if not slidedown.
                            content.slideToggle(function () {
                                //execute this after slideToggle is done
                                //change text of header based on visibility of content div
                                // header.children(".oo-ui-labelElement-label").text(function () {
                                //     return content.is(":visible") ? "Collapse" : "Expand";
                                // });
                                header.children(".oo-ui-iconElement-icon").toggleClass("oo-ui-icon-collapse").toggleClass("oo-ui-icon-expand");
                            });
                        })

                        $(".wikibench-entity-individual-labels").css({
                            "background-color": "#f8f9fa",
                            "padding": "10px",
                            "margin": "11px 0px"
                            //"width": "40%",
                            //"display": "inline-block"
                        });

                        $(".wikibench-entity-individual-labels > .oo-ui-fieldsetLayout-header").css({
                            "cursor": "pointer"
                        });

                        $(".wikibench-entity-individual-labels").find(".oo-ui-iconElement-icon").css({
                            "margin": "10px 0 0 0"
                        });

                        // $("head").append('<link rel="stylesheet" href="/w/load.php?lang=en&modules=ext.RevisionSlider.lazyCss%2Cnoscript%7Cext.cite.styles%7Cext.uls.interlanguage%7Cext.visualEditor.desktopArticleTarget.noscript%7Cext.visualEditor.diffPage.init.styles%7Cext.wikimediaBadges%7Cjquery.makeCollapsible.styles%7Cmediawiki.diff.styles%7Cmediawiki.helplink%7Cmediawiki.interface.helpers.styles%7Cmediawiki.ui.button%2Cicon%7Cmediawiki.widgets.styles%7Coojs-ui-core.icons%2Cstyles%7Coojs-ui.styles.icons-accessibility%2Cicons-editing-advanced%2Cindicators%7Cskins.vector.icons%2Cstyles%7Cwikibase.client.init&only=styles&skin=vector-2022">');

                    });

                })
            });
        }
    });
})(jQuery, mediaWiki);