

# 𓆤DBay 𓁛Mirage


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [𓆤DBay 𓁛Mirage](#%F0%93%86%A4dbay-%F0%93%81%9Bmirage)
  - [Notes](#notes)
  - [To Do](#to-do)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# 𓆤DBay 𓁛Mirage


## Notes

* **Locations in documents** can be indicated by inserting a self-closing
  [HTMLish](https://github.com/loveencounterflow/paragate/blob/master/README-html.md) tag that has
  * a namespace prefix `mrg` (for MiRaGe),
  * the tag name `loc` (for LOCation),
  * followed by a `#` (octothorpe, the HTMLish and CSS symbol for an ID),
  * followed by the ID of the Location.
  * Example: `<mrg:loc#first/>`.
  * The ID must conform to `/[_a-z][-_a-z0-9]*/i` (i.e. start with an underscore or an ASCII letter,
    followed by any number of minus-hyphens, underscores, ASCII letters and/or ASCII digits); this complies
    more or less to the recommendations given in [the MDN documentation on HTML
    IDs](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/id); a future version may relax
    these rules.
  * The marker must not contain any whitespace or attributes whatsover as it is parsed with a simple
    regular expression.
  * A future version may support marking regions between an opening and a closing tag.

* Location markers can have 'props' (properties); the only prop so far implemented is `delete-marker`
  * use a leading dot, can place after name or after ID as in `<mrg:loc.delete-marker#first/>`,
    `<mrg:loc#first.delete-marker/>`.
  * By default, only location markers with a `delete-marker` prop will be deleted from the generated
    HTML+SVG; however, one can explicitly set `keep_locs` (currently available in `get_text()`,
    `get_line_rows()`, `walk_line_rows()`) to
    * `null` for the per-location-marker default behavior,
    * `true` to unconditionally keep all markers, or
    * `false` to unconditionally drop all location markers.



* `keep_locs` { `true`, `false`, `null`, }; `del` { `true`, `false`, `null`, }:


## To Do

* **[–]** Documentation.
* **[–]** Allow to pass options in location markers as pseudo CSS classes, such as
  `<mrg:loc.delete#first/>`.
* **[–]** Allow to use location markers multiple times or to use (auto-) numbered location markers.




