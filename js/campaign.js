(function ($, mw) {
    let wgPageName = "User:Tzusheng/sandbox/Wikipedia:Wikibench/Campaign:Editquality";
    if (mw.config.get("wgPageName") === wgPageName && mw.config.get("wgAction") === "view") {

        let mwApi = new mw.Api();

        let allLabels = [];

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
                titles: pageTitles.join("|"),
                format: "json"
            }
            
            mwApi.get(revisionParams).done(function(revisionData) {
                let revisions = revisionData.query.pages;
                let label;
                let table = $(".wikibench-data-table").find("tbody");
                table.find("tr").remove();
                console.log(revisions);
                for (const r in revisions) {
                    label = JSON.parse(revisions[r].revisions[0]["*"].split("-----")[1]);

                    var editDamagePrimary = label.facets.editDamage.primaryLabel.label;
                    var userIntentPrimary = label.facets.userIntent.primaryLabel.label;

                    let editDamageLabels = [];
                    let userIntentLabels = [];

                    for (const e of label.facets.editDamage.individualLabels) {
                        editDamageLabels.push(e.label);
                    }

                    for (const u of label.facets.userIntent.individualLabels) {
                        userIntentLabels.push(u.label);
                    }

                    if (editDamageLabels.length !== userIntentLabels.length) {
                        console.log("ALERT: label counts differ across facets");
                    }

                    let hrefLink = "<a href=\"/wiki/User:Tzusheng/sandbox/Wikipedia:Wikibench/Diff:" + label.entityId.toString() + "\"></a>";

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
})(jQuery, mediaWiki);