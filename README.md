

# 𓆤DBay 𓏞RustyBuzz


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [𓆤DBay 𓏞RustyBuzz](#%F0%93%86%A4dbay-%F0%93%8F%9Erustybuzz)
  - [To Do](#to-do)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# 𓆤DBay 𓏞RustyBuzz



## To Do

* **[–]** [RustyBuzz-WASM] modify `glyph_to_svg_pathdata()` / `rectangle_from_bbox()` to return coordinates
  instead of ready-built SVG `<rect/>` as wee need those numbers to construct the line bounding box
* **[–]** [RustyBuzz-WASM] implement caching of font face in `glyph_to_svg_pathdata()` to avoid re-building
  it for each single outline; benchmark

