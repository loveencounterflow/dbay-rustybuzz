

# 𓆤DBay 𓏞RustyBuzz


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [𓆤DBay 𓏞RustyBuzz](#%F0%93%86%A4dbay-%F0%93%8F%9Erustybuzz)
  - [Notes](#notes)
    - [IDs of SVG Paths / Glyf Outlines](#ids-of-svg-paths--glyf-outlines)
  - [To Do](#to-do)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# 𓆤DBay 𓏞RustyBuzz

*There's no documentation, yet, just [demos, tests,
benchmarks,](https://github.com/loveencounterflow/hengist/tree/master/dev/dbay-rustybuzz/src) and a few
scattered notes*

## Notes

### IDs of SVG Paths / Glyf Outlines

* Shape IDs (SIDs)
  * identify unscaled outlines, each being an SVG path element that pictures a glyf outline in a 1000⨉1000
    em square.
  * initial letter `o` (**O**utline)
  * followed by decimal Glyf ID / `gid`
  * followed by `fontnick`; these must always start with a letter
  * Ex.: `o42foo` identifies an `u`nscaled glyf outline with GID `42` from font `foo`

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
* **[–]** [RustyBuzz-WASM] move to WASI to enable reading from file system &c:
  * https://github.com/topheman/webassembly-wasi-experiments#file-system-access
  * https://github.com/rustwasm/wasm-pack/issues/654
  * `rustwasmc` doesn't allow file access for Rust versions >= 1.51, see
    https://github.com/second-state/rustwasmc#known-issues
  * https://www.secondstate.io/articles/wasi-access-system-resources/
  * https://blog.knoldus.com/hosting-wasm-modules-in-rust-easily-using-wasmi/
  * https://lib.rs/search?q=wasi
  * https://wasi.dev/
  * https://github.com/bytecodealliance/wasmtime/blob/main/docs/WASI-documents.md
  * https://wasmer.io/
  * https://de.wikipedia.org/wiki/WebAssembly#Nutzung_au%C3%9Ferhalb_des_Browsers
  * https://forum.holochain.org/t/wasmi-vs-wasmer/1929
