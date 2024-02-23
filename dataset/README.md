This is the 1.0 distribution of Wikibench's dataset.

If you use this dataset, please cite this paper:

Tzu-Sheng Kuo, Aaron Halfaker, Zirui Cheng, Jiwoo Kim, Meng-Hsin Wu, Tongshuang Wu, Kenneth Holstein, and Haiyi Zhu. 2024. Wikibench: Community-Driven Data Curation for AI Evaluation on Wikipedia. In Proceedings of the CHI Conference on Human Factors in Computing Systems (CHI ’24), May 11–16, 2024, Honolulu, HI, USA. ACM, New York, NY, USA, 24 pages.

Contact: tzushenk@cs.cmu.edu

Project page: https://meta.wikimedia.org/wiki/User:Tzusheng/Sandbox/Wikibench


## Wikibench

Wikibench is a system that enables community members to collaboratively curate AI evaluation datasets, while navigating disagreements and ambiguities through discussion.


## Wikibench's dataset

This dataset was curated through Wikibench as part of a data curation campaign during the field study detailed in the paper.


## Data statement

There is a local consensus that on-wiki use of the data acquired through this campaign should be limited to the immediate scope of Wikibench. A strong consensus should be established prior to any on-wiki use outside this research project.

The data acquired as part of this campaign is not intended for other uses and may be inappropriate or unsuitable for many purposes. In particular, it is not a representative sample of edits made to the English Wikipedia, nor is it intended as such.

See the campaign page for more details: 
https://en.wikipedia.org/wiki/User:Tzusheng/sandbox/Wikipedia:Wikibench/Campaign:Editquality


## Fields

* highest-level key: The Wikipedia page ID of the entity page that stores a data point.
* entityType: The type of the data point stored on this entity page. All data points in this dataset are edits on Wikipedia, also known as diffs.
* entityId: The ID of the edit associated with this data point.
* entityNote: Not used in this dataset.
* facets: Each edit is associated with some labels. In this dataset, the two facets of labels are edit damage and user intent. For label definitions, refer to the campaign page.
* primaryLabel: The label collectively determined by community members that is intended to reflect a consensus view.
  - lastModifier: The person who last modified the primary label.
  - label: The edit damage or user intent primary label of this edit.
  - touched: The timestamp that indicates when the primary label was last modified.
  - autolabeled: Not used in this dataset.
* individualLabels: The unique individual label that is meant to reflect each community member's own perspective. The label is editable only by each community member.
  - userName: The person who submits the individual label.
  - label: The edit damage or user intent individual label of this edit.
  - note: The optional note submitted alongside the individual label.
  - origin: Where the label is submitted, either via the plugin or the entity page.
  - created: The timestamp that indicates when the individual label was first created.
  - touched: The timestamp that indicates when the individual label was last modified.
  - lowConfidence: The self-reported confidence level of each person regarding their individual label.
  - category: Not used in this dataset.

## License

All files included in the dataset are released under CC0: https://creativecommons.org/publicdomain/zero/1.0/

