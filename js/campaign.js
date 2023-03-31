(function ($, mw) {
    let wgPageName = "User:Tzusheng/sandbox/Wikipedia:Wikibench/Campaign:Editquality";
    if (mw.config.get("wgPageName") === wgPageName && mw.config.get("wgAction") === "view") {

        let api = new mw.Api();

        let dataList = [];

        let prefixsearchParams = {
            action: "query",
            list: "prefixsearch",
            pssearch: "User:Tzusheng/sandbox/Wikipedia:Wikibench/Diff:",
            format: "json"
        }

        api.get(prefixsearchParams).done(function(prefixsearchData) {
            let pages = prefixsearchData.query.prefixsearch;
            let page;
            let pageTitles = [];
            for (page in pages) {
                pageTitles.push(pages[page].title);
            }

            let revisionParams = {
                action: "query",
                prop: "revisions",
                rvprop: "content",
                rvslots: "main",
                format: "json",
                titles: pageTitles.join("|")
            }
            
            api.get(revisionParams).done(function(revisionData) {
                let revisions = revisionData.query.pages;
                let revision;
                for (revision in revisions) {
                    dataList.push(JSON.parse(revisions[revision].revisions[0].slots.main["*"]));
                }
            })
        })
    }
})(jQuery, mediaWiki);