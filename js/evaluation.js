(function ($, mw) {
    $(document).ready(function() {
        var wgPageName = "User:Tzusheng/sandbox/Wikipedia:Wikibench/Evaluation:Editquality";
        if (mw.config.get("wgPageName") === wgPageName && mw.config.get("wgAction") === "view") {
            mw.loader.using(["oojs-ui-core", "oojs-ui-widgets", "oojs-ui-windows"]).done(function() {

                // init
                var WIKIBENCH_PREFIX = "Tzusheng/sandbox/Wikipedia:Wikibench";
                var WIKIBENCH_NAMESPACE = 2;
                var RATE_LIMIT = 5;
                var ROUND_PRECISION = 2;
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

                var progressBar = new OO.ui.ProgressBarWidget( {
                    progress: false
                });
                tableDiv.after(progressBar.$element);
                
                var loadDataBtn = new OO.ui.ButtonWidget({
                    label: "Load " + RATE_LIMIT.toString() + " more edits"
                });

                var requestLimitMessage = new OO.ui.MessageWidget({
                    type: "error",
                    showClose: true,
                    label: new OO.ui.HtmlSnippet("The table isn't loading due to rate limits imposed by ORES and LiftWing. Please try again later in a few seconds.")
                });
                requestLimitMessage.toggle(false);
                requestLimitMessage.on("close", function() {
                    requestLimitMessage.toggle(false);
                    loadDataBtn.toggle(true);
                });
                tableDiv.after(requestLimitMessage.$element);

                var tableLabelColors = {};
                for (var i = 0; i < facets.length; i++) {
                    tableLabelColors[facets[i]] = {};
                    for (var j = 0; j < facetLabels[facets[i]].length; j++) {
                        tableLabelColors[facets[i]][facetLabels[facets[i]][j]] = facetColors[facets[i]][j];
                    }
                }
                tableLabelColors["reverted"] = "#fee7e6";
                tableLabelColors["not reverted"] = "#d5fdf4";
                var probColors = "#72777d";

                var tableRows = {};
                // var revids = [];
                var promises = [];
                var liftwing = {};
                var ores = {};

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

                var button1 = new OO.ui.ButtonWidget({label: "Wikibench and ORES"});
                button1.on("click", function() {
                    sortColumn("#table-header-userIntent-ores", "descending");
                    sortColumn("#table-header-editDamage-ores", "descending");
                    sortColumn("#table-header-userIntent-wikibench", "descending");
                    sortColumn("#table-header-editDamage-wikibench", "descending");
                });
                var button2 = new OO.ui.ButtonWidget({label: "Wikibench and LiftWing"});
                button2.on("click", function() {
                    sortColumn("#table-header-reverted-liftwing", "descending");
                    sortColumn("#table-header-userIntent-wikibench", "descending");
                    sortColumn("#table-header-editDamage-wikibench", "descending");
                });
                var button3 = new OO.ui.ButtonWidget({label: "ORES and LiftWing"});
                button3.on("click", function() {
                    sortColumn("#table-header-reverted-liftwing", "descending");
                    sortColumn("#table-header-userIntent-ores", "descending");
                    sortColumn("#table-header-editDamage-ores", "descending");
                });
                var layoutSortBtns = new OO.ui.HorizontalLayout({
                    items: [
                        new OO.ui.LabelWidget({ label: "I want to compare:" }),
                        button1,
                        button2,
                        button3
                    ]
                });

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

                    tableDiv.before(layoutSortBtns.$element);
                    tableDiv.after(loadDataBtn.$element);
                    progressBar.toggle(false);

                    function shuffle(array) {
                        let currentIndex = array.length,  randomIndex;
                      
                        // While there remain elements to shuffle.
                        while (currentIndex != 0) {
                      
                          // Pick a remaining element.
                          randomIndex = Math.floor(Math.random() * currentIndex);
                          currentIndex--;
                      
                          // And swap it with the current element.
                          [array[currentIndex], array[randomIndex]] = [
                            array[randomIndex], array[currentIndex]];
                        }
                      
                        return array;
                      }
                    shuffle(results);

                    var startIndex = 0;

                    loadDataBtn.on("click", function() {

                        var renderCount = 0;
                        var revids = [];

                        for (var i = startIndex; i < results.length; i++) {
                            if (renderCount >= RATE_LIMIT) {
                                break;
                            }
                            label = JSON.parse(results[i].content.split(entityPageSplit)[1]);
                            if ((label.entityId.split("/")[0] !== "false") && (label.entityNote === "")) { // exclude new page and multiple changes
                                var newId = label.entityId.split("/")[1];
                                tableRows[newId] = {};
                                tableRows[newId]["entityId"] = label.entityId;
                                tableRows[newId]["wikibench"] = {}
                                tableRows[newId]["ores"] = {};
                                facets.forEach(function(f) {
                                    tableRows[newId]["wikibench"][f] = label.facets[f];
                                })
                                revids.push(newId);
                                var request1 = $.ajax({
                                    url: 'https://api.wikimedia.org/service/lw/inference/v1/models/revertrisk-language-agnostic:predict',
                                    crossDomain: true,
                                    method: 'post',
                                    contentType: 'application/x-www-form-urlencoded',
                                    data: '{"rev_id":' + newId + ', "lang": "en"}'
                                }).done( function ( result, textStatus, jqXHR ) {
                                    liftwing[result.revision_id.toString()] = result["output"];
                                });
                                promises.push(request1);

                                var request2 = $.ajax({
                                    url: "https://ores.wikimedia.org/v3/scores/enwiki",
                                    data: {
                                        "context": "enwiki",
                                        "models": "damaging|goodfaith",
                                        "revids": newId.toString()
                                    },
                                    timeout: 30 * 1000, // 30 seconds
                                    dataType: "json",
                                    type: "GET"
                                }).done(function ( result, textStatus, jqXHR ){
                                    ores[Object.keys(result["enwiki"]["scores"])[0]] = Object.values(result["enwiki"]["scores"])[0]
                                });
                                promises.push(request2);
                                renderCount++;
                            }
                        }

                        $.when.apply(null, promises).done(function() {
                            if (startIndex === 0) {
                                tbody.find("tr").remove(); // remove the empty line
                            }
                            for (var r = 0; r < revids.length; r++) {
                                var row = tableRows[revids[r]];
                                var liftwing_prediction = liftwing[revids[r]]["prediction"] ? "reverted" : "not reverted";
                                var ores_prediction_editDamage = ores[revids[r]]["damaging"]["score"]["prediction"] ? "damaging" : "not damaging";
                                var ores_prediction_userIntent = ores[revids[r]]["goodfaith"]["score"]["prediction"] ? "good faith" : "bad faith";
                                var individualLabels = {};
                                // calculate wikibench agreement
                                for (var i = 0; i < facets.length; i++) {
                                    var f = facets[i];
                                    individualLabels[f] = [];
                                    for (var j = 0; j < row["wikibench"][f].individualLabels.length; j++) {
                                        // handle individual labels for disagreements
                                        var individualLabel = row["wikibench"][f].individualLabels[j];
                                        if (individualLabel.label === facetLabels[f][0]) {
                                            if (individualLabel.lowConfidence) {
                                                individualLabels[f].push(-0.5);
                                            }
                                            else {
                                                individualLabels[f].push(-1);
                                            }
                                        }
                                        if (individualLabel.label === facetLabels[f][1]) {
                                            if (individualLabel.lowConfidence) {
                                                individualLabels[f].push(0.5);
                                            }
                                            else {
                                                individualLabels[f].push(1);
                                            }
                                        }
                                    }
                                }                            

                                var hrefLink = "<a href=\"/wiki/User:" + WIKIBENCH_PREFIX + "/Entity:" + entityType.charAt(0).toUpperCase() + entityType.slice(1) + "/" + row["entityId"] + "\"></a>";
                                tbody.append($("<tr>")
                                    .append($("<th>").text(row["entityId"]).wrapInner(hrefLink).attr("scope", "row"))
                                    .append($("<td>").html(row["wikibench"][facets[0]].primaryLabel.label + " <span style=\"color:" + probColors + "\">(" + (1 - calculateStandardDeviation(individualLabels[facets[0]])).toFixed(ROUND_PRECISION).toString() + ")</span>").attr("bgcolor", tableLabelColors[facets[0]][row["wikibench"][facets[0]].primaryLabel.label]))
                                    .append($("<td>").html(ores_prediction_editDamage + " <span style=\"color:" + probColors + "\">(" + ores[revids[r]]["damaging"]["score"]["probability"][ores[revids[r]]["damaging"]["score"]["prediction"].toString()].toFixed(ROUND_PRECISION).toString() + ")</span>").attr("bgcolor", tableLabelColors[facets[0]][ores_prediction_editDamage]))
                                    .append($("<td>").html(row["wikibench"][facets[1]].primaryLabel.label + " <span style=\"color:" + probColors + "\">(" + (1 - calculateStandardDeviation(individualLabels[facets[1]])).toFixed(ROUND_PRECISION).toString() + ")</span>").attr("bgcolor", tableLabelColors[facets[1]][row["wikibench"][facets[1]].primaryLabel.label]))
                                    .append($("<td>").html(ores_prediction_userIntent + " <span style=\"color:" + probColors + "\">(" + ores[revids[r]]["goodfaith"]["score"]["probability"][ores[revids[r]]["goodfaith"]["score"]["prediction"].toString()].toFixed(ROUND_PRECISION).toString() + ")</span>").attr("bgcolor", tableLabelColors[facets[1]][ores_prediction_userIntent]))
                                    .append($("<td>").html(liftwing_prediction + " <span style=\"color:" + probColors + "\">(" + liftwing[revids[r]]["probabilities"][liftwing[revids[r]]["prediction"].toString()].toFixed(ROUND_PRECISION).toString() + ")</span>").attr("bgcolor", tableLabelColors[liftwing_prediction]))
                                );
                            }
                            startIndex += renderCount;
                            requestLimitMessage.toggle(false);
                        }).fail(function(e) {
                            loadDataBtn.toggle(false);
                            requestLimitMessage.toggle(true);
                        });
                    });
                });
            });
        }
    });
})(jQuery, mediaWiki);