(function ($, mw) {
    $(document).ready(function() {
        var wgPageName = "User:Tzusheng/sandbox/Wikipedia:Wikibench/Campaign:Editquality";
        if (mw.config.get("wgPageName") === wgPageName && mw.config.get("wgAction") === "view") {

            var mwApi = new mw.Api();

            var allLabels = [];

            var prefixsearchParams = {
                action: "query",
                list: "prefixsearch",
                pssearch: "User:Tzusheng/sandbox/Wikipedia:Wikibench/Diff:",
                format: "json"
            }

            mwApi.get(prefixsearchParams).done(function(prefixsearchData) {
                var pages = prefixsearchData.query.prefixsearch; // array for pages
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
                    var revisions = revisionData.query.pages;
                    var label;
                    var table = $(".wikibench-data-table").find("tbody");
                    table.find("tr").remove();
                    for (var r in revisions) {
                        label = JSON.parse(revisions[r].revisions[0]["*"].split("-----")[1]);

                        var editDamagePrimary = label.facets.editDamage.primaryLabel.label;
                        var userIntentPrimary = label.facets.userIntent.primaryLabel.label;

                        var editDamageLabels = [];
                        var userIntentLabels = [];

                        for (var e = 0; e < label.facets.editDamage.individualLabels.length; e++) {
                            editDamageLabels.push(label.facets.editDamage.individualLabels[e].label);
                        }

                        for (var u = 0; u < label.facets.userIntent.individualLabels.length; u++) {
                            userIntentLabels.push(label.facets.userIntent.individualLabels[u].label);
                        }

                        if (editDamageLabels.length !== userIntentLabels.length) {
                            console.log("ALERT: label counts differ across facets");
                        }

                        var hrefLink = "<a href=\"/wiki/User:Tzusheng/sandbox/Wikipedia:Wikibench/Diff:" + label.entityId.toString() + "\"></a>";

                        table.append($('<tr>')
                            .append($("<th>").text(label.entityId).wrapInner(hrefLink).attr("scope","row"))
                            .append($('<td>').text(editDamagePrimary))
                            .append($('<td>').text(""))
                            .append($('<td>').text(userIntentPrimary))
                            .append($('<td>').text(""))
                            .append($('<td>').text(editDamageLabels.length.toString()))
                        );

                        allLabels.push(label);
                    }
                })
            });
        }
    });
})(jQuery, mediaWiki);