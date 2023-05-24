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
        var facetLabels = {
            editDamage: ["damaging", "not damaging"],
            userIntent: ["bad faith", "good faith"]
        };

        // get config
        var wgPageName = mw.config.get("wgPageName");

        if(wgPageName.startsWith(entityPagePrefix) && mw.config.get("wgAction") === "view") {

            // widgets
            var diffTableHeader = "<table class=\"diff diff-contentalign-left diff-editfont-monospace\" data-mw=\"interface\"><colgroup><col class=\"diff-marker\"><col class=\"diff-content\"><col class=\"diff-marker\"><col class=\"diff-content\"></colgroup><tbody>";
            var diffTableFooter = "</tbody></table>";
            var diffTableContent, diffTableTitle;
            var noticeBox;
            var primaryFieldset;
            var userFieldset;
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
                </tr>`;
            });

            var getPageContent = mwApi.get({
                action: "parse",
                page: wgPageName,
                prop: "wikitext"
            });

            var setPageWidgets = getPageContent.then(function(ret) {
                mw.loader.using(["oojs-ui-core", "oojs-ui-widgets", "oojs-ui-windows", "mediawiki.diff.styles"]).done(function(){
                    var label = JSON.parse(ret.parse.wikitext["*"].split(entityPageSplit)[1]);

                    noticeBox = new OO.ui.MessageWidget({
                        type: "notice",
                        label: "Please do not directly edit source of this page. To update the primary or your label, click the edit buttons. To discuss, visit the talk page."
                    });

                    // Primary label
                    primaryFieldset = new OO.ui.FieldsetLayout({ 
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
                    });

                    primaryFieldset.addItems(
                        new OO.ui.FieldLayout(editPrimaryBtn, {
                            align: "left"
                        })
                    );

                    // User label
                    userFieldset = new OO.ui.FieldsetLayout({ 
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

                    var divRender = $(".mw-parser-output");

                    divRender.find("table").remove(); // remove warning message
                    divRender.find("hr").remove(); // remove horizontal line
                    divRender.find("p").remove(); // remove json content

                    divRender
                        .append(noticeBox.$element)
                        .append(diffTableHeader + diffTableTitle + diffTableContent + diffTableFooter)
                        .append(primaryFieldset.$element)
                        .append(userFieldset.$element);

                    // individual labels
                    facets.forEach(function(f) {
                        individualFieldset[f] = {};
                        var labelCount = {};
                        var labelLowConfidenceCount = {};
                        facetLabels[f].forEach(function(l) {
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
                        });

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
                        for (var i = 0; i < 4; i++) {
                            if (stackBarCounts[i] > 0) {
                                var tmp = (i+1).toString();
                                stackBarText[f] += "A" + tmp + "=" + stackBarCounts[i].toString() + "|C" + tmp + "=" + stackBarColors[i] + "|T" + tmp + "=" + stackBarNames[i] + "|";
                            }
                        }
                        stackBarText[f] += "Total=" + (stackBarCounts.reduce((a, b) => a + b, 0)).toString() + "}}";

                        mwApi.get({
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
                            facetLabels[f].forEach(function(l) {
                                divRender.append(individualFieldset[f][l].$element);
                                console.log("add element");
                                individualFieldset[f][l].$element.find(".oo-ui-fieldsetLayout-header").click(function(){
                                    var header = $(this);
                                    var content = header.next();
                                    content.slideToggle(function () {
                                        header.children(".oo-ui-iconElement-icon").toggleClass("oo-ui-icon-collapse").toggleClass("oo-ui-icon-expand");
                                    });
                                })
                            });
                        });
                    });
                });
            });
        }
    });
})(jQuery, mediaWiki);