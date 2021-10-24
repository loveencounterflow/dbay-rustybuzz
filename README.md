

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
* **[–]** Two independent imports of [RustyBuzz-WASM] will share state if they happen to import the same
  file
* **[+]** keep bounding box as `{ x, y, x1, y1, }` in outline table to make it easier to compute composite
  bounding box
* **[–]** [RustyBuzz-WASM] implement

  ```coffee
  despace_svg_pathdata = ( svg_pathda ) ->
    R = svg_pathda
    R = R.replace /([0-9])\x20([^0-9])/g, '$1$2'
    R = R.replace /([^0-9])\x20([0-9])/g, '$1$2'
    return R
  ```
* **[–]** [RustyBuzz-WASM] implement SVG path compression
* **[+]** allow to pass in custom instance of `rustybuzz-wasm` as `cfg.RBW` for testing purposes

