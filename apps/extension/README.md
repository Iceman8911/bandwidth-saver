## DNR Rules

- Dynamic and Session rules have a cap of 5000 for [non-safe](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest?utm_source=chatgpt.com#safe_rules) rules, and a further limited cap of 1000 rules for [regex](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest?utm_source=chatgpt.com#regex-rules) rules.
	- The limits will be these divided by 10; so 100 site-specific regex rules per rule id
- Settings / configs will be split into default and site-scoped rules; site-scoped rules are created and applied when there are available rule ids for a new site; otherwise the default rules are used.
	- Both types of rules will have the same priority but simply affect different domains; as such, we'll only need 2 flags per id (e.g Default and Site-scoped instead of Global, Site-scoped Add, Site-scoped Remove).
	- So for example:
		- The `Save-Data` rule will have a single site-scoped rule that only applies to pages since it's just a simple toggle.
		- The Compression rules will have a default rule that applies to new pages that aren't covered by the 100 site specific rules.
- There'll be 2 main functions; one for getting the disabled sites[^3] that apply for a particular default rule[^1], and the other that'll apply a single site-scoped rule to a bunch of sites.[^2]
- **Note:** With the current implementation, as long as no entries in the storage are deleted, it should be fine. Otherwise, there is possibilty for orphaned nodes.


[^1]: via a predicate function with a single argument that is the stored setting/config data for the site in question and returns a resolved boolean.

[^2]: Site-scoped rules are applied before the default rule stuff is calculated*

[^3]: These will just be every site that has a site-scoped rule.
