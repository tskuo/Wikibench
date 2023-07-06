(function ($, mw) {
    $(document).ready(function() {
        var wgPageName = "User:Tzusheng/sandbox/Wikipedia:Wikibench/Evaluation:Editquality";
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
                var mwApi = new mw.Api();

                var tableDiv = $("#enwiki-evaluation-editquality");
                var tbody = tableDiv.find("tbody");
                tbody.find("tr").remove(); // remove the empty line

                var tableLabelColors = {};
                for (var i = 0; i < facets.length; i++) {
                    tableLabelColors[facets[i]] = {};
                    for (var j = 0; j < facetLabels[facets[i]].length; j++) {
                        tableLabelColors[facets[i]][facetLabels[facets[i]][j]] = facetColors[facets[i]][j];
                    }
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
                                if (page.revisions !== undefined) {
                                    page['content'] = page.revisions[0].content;
                                    delete page['revisions'];
                                    results.push(page);
                                }
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

                    var tableRows = {};
                    revids = [];
                    var countMultipleChange = 0;

                    for (var i = 0; i < results.length; i++) {
                        label = JSON.parse(results[i].content.split(entityPageSplit)[1]);
                        // if (label.entityNote === "") {
                        // if ((label.entityId.split("/")[1][0] === "6") || (label.entityId.split("/")[1][0] === "7")) {
                        if ((label.entityId.split("/")[1][0] === "7") & (label.entityId.split("/")[0] !== "false")) {
                            var newId = label.entityId.split("/")[1];
                            tableRows[newId] = {};
                            tableRows[newId]["entityId"] = label.entityId;
                            tableRows[newId]["wikibench"] = {}
                            facets.forEach(function(f) {
                                tableRows[newId]["wikibench"][f] = label.facets[f].primaryLabel.label;
                            })
                            revids.push(newId);
                        }
                        else if (label.entityId.split("/")[0] === "false") {
                            console.log(label.entityId);
                        }
                        else {
                            countMultipleChange++;
                        }
                    }
                    console.log(countMultipleChange);
                    console.log(revids.join("|"));

                    $.ajax({
                        url: "https://ores.wikimedia.org/v3/scores/enwiki",
                        data: {
                            "context": "enwiki",
                            "models": "damaging|goodfaith",
                            "revids": revids.join("|")
                        },
                        timeout: 60 * 1000, // 30 seconds
                        dataType: "json",
                        type: "GET"
                    }).done( function ( result, textStatus, jqXHR ) {
                        console.log(result);

                        for (var r = 0; r < revids.length; r++) {
                            console.log(revids[r]);
                            tableRows[revids[r]]["ores"] = {};
                            var ores = result["enwiki"]["scores"][revids[r]];
                            if (ores["damaging"]["score"]["prediction"]) {
                                tableRows[revids[r]]["ores"]["editDamage"] = "damaging";
                            }
                            else {
                                tableRows[revids[r]]["ores"]["editDamage"] = "not damaging";
                            }
                            if (ores["goodfaith"]["score"]["prediction"]) {
                                tableRows[revids[r]]["ores"]["userIntent"] = "good faith";
                            }
                            else {
                                tableRows[revids[r]]["ores"]["userIntent"] = "bad faith";
                            }

                            var row = tableRows[revids[r]];
                        
                            var hrefLink = "<a href=\"/wiki/User:" + WIKIBENCH_PREFIX + "/Entity:" + entityType.charAt(0).toUpperCase() + entityType.slice(1) + "/" + row["entityId"] + "\"></a>";

                            tbody.append($("<tr>")
                                .append($("<th>").text(row["entityId"]).wrapInner(hrefLink).attr("scope", "row"))
                                .append($("<td>").text(row["wikibench"][facets[0]]).attr("bgcolor", tableLabelColors[facets[0]][row["wikibench"][facets[0]]]))
                                .append($("<td>").text(row["ores"][facets[0]]).attr("bgcolor", tableLabelColors[facets[0]][row["ores"][facets[0]]]))
                                .append($("<td>").text(row["wikibench"][facets[1]]).attr("bgcolor", tableLabelColors[facets[1]][row["wikibench"][facets[1]]]))
                                .append($("<td>").text(row["ores"][facets[1]]).attr("bgcolor", tableLabelColors[facets[1]][row["ores"][facets[1]]]))
                            );
                        }
                    } );
                });
            });
        }
    });
})(jQuery, mediaWiki);