(function ($, mw) {
    let wgPageName = "User:Tzusheng/sandbox/Wikipedia:Wikibench/Campaign:Editquality";
    if (mw.config.get("wgPageName") === wgPageName && mw.config.get("wgAction") === "view") {

        let mwApi = new mw.Api();

        let dataList = [];

        let prefixsearchParams = {
            action: "query",
            list: "prefixsearch",
            pssearch: "User:Tzusheng/sandbox/Wikipedia:Wikibench/Diff:",
            format: "json"
        }

        mwApi.get(prefixsearchParams).done(function(prefixsearchData) {
            let pages = prefixsearchData.query.prefixsearch; // array for pages
            let pageTitles = [];
            for (const page of pages) pageTitles.push(page.title);

            let revisionParams = {
                action: "query",
                prop: "revisions",
                rvprop: "content",
                format: "json",
                titles: pageTitles.join("|")
            }
            
            mwApi.get(revisionParams).done(function(revisionData) {
                let revisions = revisionData.query.pages;
                let label;
                let table = $(".wikibench-data-table").find("tbody");
                table.find("tr").remove();
                for (const r in revisions) {
                    label = JSON.parse(revisions[r].revisions[0]["*"]);

                    let editQualityLabels = [], editQualityPrimary = "";
                    let userIntentLabels = [], userIntentPrimary = "";
                    let flagged = false;

                    for (const e of label.facets.editQuality) {
                        editQualityLabels.push(e.label);
                        if (e.primary === true) {
                            editQualityPrimary = e.label;
                        }
                        if (e.flagged) {
                            flagged = true;
                        }
                    }

                    for (const u of label.facets.userIntent) {
                        userIntentLabels.push(u.label);
                        if (u.primary === true) {
                            userIntentPrimary = u.label;
                        }
                        if (u.flagged) {
                            flagged = true;
                        }
                    }

                    if (editQualityLabels.length !== userIntentLabels.length) {
                        console.log("ALERT: label counts differ across facets");
                    }

                    let hrefLink = "<a href=\"/wiki/User:Tzusheng/sandbox/Wikipedia:Wikibench/Diff:" + label.entityId.toString() + "\"></a>";
                    let flagcell = ""
                    if (flagged) flagcell = "flagged";

                    table.append($('<tr>')
                        .append($("<th>").text(label.entityId).wrapInner(hrefLink).attr("scope","row"))
                        .append($('<td>').text(editQualityPrimary))
                        .append($('<td>').text(""))
                        .append($('<td>').text(userIntentPrimary))
                        .append($('<td>').text(""))
                        .append($('<td>').text(editQualityLabels.length.toString()))
                        .append($('<td>').text(flagcell))
                    );

                    dataList.push(label);
                }
            })
        });
    }
})(jQuery, mediaWiki);