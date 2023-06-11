(function ($, mw) {
    $(document).ready(function() {
        var wgPageName = "User:Tzusheng/sandbox/Wikipedia:Wikibench/Campaign:Editquality";
        if (mw.config.get("wgPageName") === wgPageName && mw.config.get("wgAction") === "view") {
            mw.loader.using(["oojs-ui-core", "oojs-ui-widgets", "oojs-ui-windows"]).done(function() {

                // init
                var WIKIBENCH_PREFIX = "Tzusheng/sandbox/Wikipedia:Wikibench";
                var WIKIBENCH_NAMESPACE = 2;
                var entityType = "diff";
                var language = "en";
                var entityPageSplit = "-----";
                var facets = ["editDamage", "userIntent"];
                var facetNames = {
                    editDamage: "edit damage",
                    userIntent: "user intent"
                };
                var facetLabels = {
                    editDamage: ["damaging", "not damaging"],
                    userIntent: ["bad faith", "good faith"]
                };
                var facetColors = {
                    editDamage: ["#fee7e6", "#d5fdf4"],
                    userIntent: ["#fee7e6", "#d5fdf4"]
                };
                var userName = mw.config.get("wgUserName");
                var mwApi = new mw.Api();

                function calculateStandardDeviation(numbers) {
                    // Step 1: Calculate the mean
                    var sum = 0;
                    for (var i = 0; i < numbers.length; i++) {
                    sum += numbers[i];
                    }
                    var mean = sum / numbers.length;
                
                    // Step 2: Calculate the sum of squared differences
                    var squaredDifferencesSum = 0;
                    for (var j = 0; j < numbers.length; j++) {
                    var difference = numbers[j] - mean;
                    squaredDifferencesSum += difference * difference;
                    }
                
                    // Step 3: Calculate the variance
                    var variance = squaredDifferencesSum / numbers.length;
                
                    // Step 4: Calculate the standard deviation (square root of variance)
                    var standardDeviation = Math.sqrt(variance);
                
                    return standardDeviation;
                }

                function getPrefixedPages(entityType, queryContinue, deferred, results) {
                    deferred = deferred || $.Deferred();
                    queryContinue = queryContinue || {};
                    results = results || [];
                    var prefix = WIKIBENCH_PREFIX + "/Entity:" + entityType.charAt(0).toUpperCase() + entityType.slice(1) + "/";
                    var params = {
                        action: "query",
                        prop: "revisions",
                        rvprop: "content",
                        generator: "allpages",
                        gapprefix: prefix,
                        gaplimit: 500,
                        gapnamespace: WIKIBENCH_NAMESPACE,
                        format: "json",
                        formatversion: 2
                    };

                    Object.assign(params, queryContinue)

                    mwApi.get(params)
                        .done(function(data) {
                            var pages = data.query.pages;
                            pages.forEach(function(page){
                                page['content'] = page.revisions[0].content;
                                delete page['revisions'];
                                results.push(page);
                            });
                            if(data.continue){
                                getPrefixedPages(entityType, data.continue, deferred, results);
                            }else{
                                deferred.resolve(results);
                            }
                        })
                        .fail(function(e) {
                            deferred.fail(e);
                        });

                    return deferred.promise();
                }

                getPrefixedPages(entityType).done(function(results) {
                    var label;
                    var tableDiv = $(".wikibench-data-table")
                    var tbody = tableDiv.find("tbody");
                    tbody.find("tr").remove(); // remove the empty line
                    function sortColumn(columnId, order) {
                        var header = tableDiv.find(columnId);
                        if (order === "ascending") {
                            if (header.attr("title") === "Sort ascending") { // note: title is not the current sorting state
                                header.click();
                            } else if (header.attr("title") === "Sort initial") {
                                header.click().click();
                            } else {
                                // do nothing because the column is already ascending
                            }
                        } else if (order === "descending") {
                            if (header.attr("title") === "Sort ascending") {
                                header.click().click();
                            } else if (header.attr("title") === "Sort descending") {
                                header.click();
                            } else {
                                // do nothing because the column is already descending
                            }
                        } else {
                            // do nothing
                        }
                    }
                    var button1 = new OO.ui.ButtonWidget({label: "provide more labels"});
                    button1.on("click", function() {
                        sortColumn("#table-header-label-count", "ascending");
                    });
                    var button2 = new OO.ui.ButtonWidget({label: "compare my labels"});
                    button2.on("click", function() {
                        sortColumn("#table-header-userIntent-primary-label", "descending");
                        sortColumn("#table-header-editDamage-primary-label", "descending");
                        sortColumn("#table-header-userIntent-your-label", "descending");
                        sortColumn("#table-header-editDamage-your-label", "descending");
                    });
                    var button3 = new OO.ui.ButtonWidget({label: "build consensus (edit damage)"});
                    button3.on("click", function() {
                        sortColumn("#table-header-label-count", "descending");
                        sortColumn("#table-header-editDamage-disagreement", "descending")
                    });
                    var button4 = new OO.ui.ButtonWidget({label: "build consensus (user intent)"});
                    button4.on("click", function() {
                        sortColumn("#table-header-label-count", "descending");
                        sortColumn("#table-header-userIntent-disagreement", "descending");
                    });
                    var layout = new OO.ui.HorizontalLayout({
                        items: [
                            new OO.ui.LabelWidget({ label: "I want to:" }),
                            button1,
                            button2,
                            button3,
                            button4
                        ]
                    });
                    tableDiv.before(layout.$element);

                    var tableLabelColors = {};
                    for (var i = 0; i < facets.length; i++) {
                        tableLabelColors[facets[i]] = {};
                        for (var j = 0; j < facetLabels[facets[i]].length; j++) {
                            tableLabelColors[facets[i]][facetLabels[facets[i]][j]] = facetColors[facets[i]][j];
                        }
                    }

                    var primaryLabelCounts = {};
                    facets.forEach(function(f) {
                        primaryLabelCounts[f] = {};
                        facetLabels[f].forEach(function(l) {
                            primaryLabelCounts[f][l] = 0;
                        })
                    })

                    for (var r = 0; r < results.length; r++) {
                        label = JSON.parse(results[r].content.split(entityPageSplit)[1]);
                        var primaryLabel = {};
                        var userLabels = {};
                        var individualLabels = {};
                        var lowConfidenceIndicator = {};
                        for (var i = 0; i < facets.length; i++) {
                            var f = facets[i];
                            lowConfidenceIndicator[f] = false;
                            primaryLabel[f] = label.facets[f].primaryLabel.label;
                            userLabels[f] = "";
                            individualLabels[f] = [];
                            primaryLabelCounts[f][primaryLabel[f]] += 1;
                            for (var j = 0; j < label.facets[f].individualLabels.length; j++) {
                                // handle user labels
                                if (label.facets[f].individualLabels[j].userName === userName) {
                                    userLabels[f] = label.facets[f].individualLabels[j].label;
                                    if (label.facets[f].individualLabels[j].lowConfidence) {
                                        lowConfidenceIndicator[f] = true;
                                    }
                                }
                                // handle individual labels for disagreements
                                if (label.facets[f].individualLabels[j].label === facetLabels[f][0]) {
                                    if (label.facets[f].individualLabels[j].lowConfidence) {
                                        individualLabels[f].push(0.25);
                                    }
                                    else {
                                        individualLabels[f].push(0);
                                    }
                                }
                                if (label.facets[f].individualLabels[j].label === facetLabels[f][1]) {
                                    if (label.facets[f].individualLabels[j].lowConfidence) {
                                        individualLabels[f].push(0.75);
                                    }
                                    else {
                                        individualLabels[f].push(1);
                                    }
                                }
                            }
                        }

                        var hrefLink = "<a href=\"/wiki/User:" + WIKIBENCH_PREFIX + "/Entity:" + entityType.charAt(0).toUpperCase() + entityType.slice(1) + "/" + label.entityId.toString() + "\"></a>";

                        tbody.append($("<tr>")
                            .append($("<th>").text(label.entityId).wrapInner(hrefLink).attr("scope", "row"))
                            .append($("<td>").text(primaryLabel[facets[0]]).attr("bgcolor", tableLabelColors[facets[0]][primaryLabel[facets[0]]]))
                            .append($("<td>").text(userLabels[facets[0]] + ((lowConfidenceIndicator[facets[0]])?("*"):(""))).attr("bgcolor", tableLabelColors[facets[0]][userLabels[facets[0]]]))
                            .append($("<td>").text(calculateStandardDeviation(individualLabels[facets[0]]).toFixed(3)))
                            .append($("<td>").text(primaryLabel[facets[1]]).attr("bgcolor", tableLabelColors[facets[1]][primaryLabel[facets[1]]]))
                            .append($("<td>").text(userLabels[facets[1]] + ((lowConfidenceIndicator[facets[1]])?("*"):(""))).attr("bgcolor", tableLabelColors[facets[1]][userLabels[facets[1]]]))
                            .append($("<td>").text(calculateStandardDeviation(individualLabels[facets[1]]).toFixed(3)))
                            .append($("<td>").text(label.facets[facets[0]].individualLabels.length.toString()))
                        );
                    }

                    for (var i = 0; i < facets.length; i++) {
                        var f = facets[i];
                        var tmp0 = primaryLabelCounts[f][facetLabels[f][0]];
                        var tmp1 = primaryLabelCounts[f][facetLabels[f][1]];
                        mwApi.get({
                            action: "parse",
                            text: "{{Bar box" +
                                "|title=" + "Primary label distribution for " + facetNames[f] + 
                                "|titlebar=#DDD" +
                                // "|left1=label" +
                                // "|right1=quantity" +
                                "|width=400px" +
                                "|bars=" +
                                "{{bar percent|" + facetLabels[f][0] + "|#b32424|" + (tmp0/(tmp0+tmp1)*100).toString() + "|" + tmp0.toString() + " (" + Math.floor(tmp0/(tmp0+tmp1)*100).toString() + "%) }}" +
                                "{{bar percent|" + facetLabels[f][1] + "|#14866d|" + (tmp1/(tmp0+tmp1)*100).toString() + "|" + tmp1.toString() + " (" + Math.floor(tmp1/(tmp0+tmp1)*100).toString() + "%) }}" +
                                // "|caption=Some stuff displayed by quantity." +
                                "}}",
                            contentmodel: "wikitext"
                        }).done(function(ret) {
                            $("#wikibench-data-curation-charts").append(ret.parse.text["*"]);
                        });
                    }
                });
            });
        }
    });
})(jQuery, mediaWiki);