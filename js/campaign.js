(function ($, mw) {
    $(document).ready(function() {
        var wgPageName = "User:Tzusheng/sandbox/Wikipedia:Wikibench/Campaign:Editquality";
        if (mw.config.get("wgPageName") === wgPageName && mw.config.get("wgAction") === "view") {

            // init
            var wikibenchURL = "User:Tzusheng/sandbox/Wikipedia:Wikibench/";
            var entityType = "diff";
            var language = "en";
            var entityPageSplit = "-----";
            var facets = ["editDamage", "userIntent"];
            var userName = mw.config.get("wgUserName");

            var mwApi = new mw.Api();
            var allLabels = [];
            var prefixsearchParams = {
                action: "query",
                list: "prefixsearch",
                pssearch: wikibenchURL + entityType.charAt(0).toUpperCase() + entityType.slice(1) + ":",
                format: "json"
            }

            mwApi.get(prefixsearchParams).done(function(prefixsearchData) {
                var pages = prefixsearchData.query.prefixsearch; // pages is an array
                var pageTitles = [];
                for (var p = 0; p < pages.length; p++) {
                    pageTitles.push(pages[p].title);
                }

                var revisionParams = {
                    action: "query",
                    prop: "revisions",
                    rvprop: "content",
                    titles: pageTitles.join("|"),
                    format: "json"
                }
                
                mwApi.get(revisionParams).done(function(revisionData) {
                    var revisions = revisionData.query.pages; // revisions is an object, not array
                    var label;
                    // var tableHTML = "<table class=\"wikitable sortable jquery-tablesorter\" id=\"wikibench-table-id\">" + 
                    //     "<thead>" + 
                    //         "<tr>" +
                    //             "<th rowspan=\"2\" class=\"headerSort\" tabindex=\"0\" role=\"columnheader button\" title=\"Sort ascending\">Diff ID</th>" +
                    //             "<th colspan=\"3\">Edit damage</th>" +
                    //             "<th colspan=\"3\">User intent</th>" +
                    //             "<th rowspan=\"2\" class=\"headerSort\" tabindex=\"0\" role=\"columnheader button\" title=\"Sort ascending\">Label count</th>" +
                    //             "</tr>" +
                    //         "<tr>" +
                    //             "<th class=\"headerSort\" tabindex=\"0\" role=\"columnheader button\" title=\"Sort ascending\">Primary label</th>" +
                    //             "<th class=\"headerSort\" tabindex=\"0\" role=\"columnheader button\" title=\"Sort ascending\">Your label</th>" +
                    //             "<th class=\"headerSort\" tabindex=\"0\" role=\"columnheader button\" title=\"Sort ascending\">Disagreement</th>" +
                    //             "<th class=\"headerSort\" tabindex=\"0\" role=\"columnheader button\" title=\"Sort ascending\">Primary label</th>" +
                    //             "<th class=\"headerSort\" tabindex=\"0\" role=\"columnheader button\" title=\"Sort ascending\">Your label</th>" +
                    //             "<th class=\"headerSort\" tabindex=\"0\" role=\"columnheader button\" title=\"Sort ascending\">Disagreement</th>" +
                    //         "</tr>" +
                    //     "</thead>" +
                    //     "<tbody>" +
                    //         "<tr>" +
                    //             "<th scope=\"row\"> </th>" +
                    //             "<td> </td>" +
                    //             "<td> </td>" +
                    //             "<td> </td>" +
                    //             "<td> </td>" +
                    //             "<td> </td>" +
                    //             "<td> </td>" +
                    //             "<td> </td>" +
                    //         "</tr>" +
                    //     "</tbody>" + 
                    //     "<tfoot></tfoot>" +
                    // "</table>";
                    // $("#enwiki-editquality").after(tableHTML);
                    // var table = $("#wikibench-table-id").find("tbody");
                    var table = $(".ttt").find("tbody");
                    table.find("tr").remove();
                    for (var r in revisions) {
                        label = JSON.parse(revisions[r].revisions[0]["*"].split(entityPageSplit)[1]);

                        var primaryLabel = {};
                        var userLabels = {};

                        for (var i = 0; i < facets.length; i++) {
                            var f = facets[i];
                            primaryLabel[f] = label.facets[f].primaryLabel.label;
                            userLabels[f] = "";
                            for (var j = 0; j < label.facets[f].individualLabels.length; j++) {
                                if (label.facets[f].individualLabels[j].userName === userName) {
                                    userLabels[f] = label.facets[f].individualLabels[j].label;
                                }
                            }
                        }

                        var hrefLink = "<a href=\"/wiki/" + wikibenchURL + entityType.charAt(0).toUpperCase() + entityType.slice(1) + ":" + label.entityId.toString() + "\"></a>";

                        table.append($('<tr>')
                            .append($("<th>").text(label.entityId).wrapInner(hrefLink).attr("scope","row"))
                            .append($('<td>').text(primaryLabel[facets[0]]))
                            .append($('<td>').text(userLabels[facets[0]]))
                            .append($('<td>').text(""))
                            .append($('<td>').text(primaryLabel[facets[1]]))
                            .append($('<td>').text(userLabels[facets[1]]))
                            .append($('<td>').text(""))
                            .append($('<td>').text(label.facets[facets[0]].individualLabels.length.toString()))
                        );

                        allLabels.push(label);
                    }
                })
            });
        }
    });
})(jQuery, mediaWiki);