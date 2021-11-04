

# 𓆤DBay 𓏞RustyBuzz


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [𓆤DBay 𓏞RustyBuzz](#%F0%93%86%A4dbay-%F0%93%8F%9Erustybuzz)
  - [Notes](#notes)
    - [IDs of SVG Paths / Glyf Outlines](#ids-of-svg-paths--glyf-outlines)
    - [Selectable Text](#selectable-text)
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

### Selectable Text

Since printable text is rendered as SVG elements such as `<path/>`, text will not be selectable
unless special care is taken.

* We overlay the entire document with a single custom HTML `<textcontainer>` element.
* Inside this, each line of output text is represented by an absolutely positioned `<span>` element.
* The first line of each paragraph is preceded by an unclosed HTML5 `<p>` element.
* There must be no space between the spans or between a `<p>` and a `<span>`, which may either be achieved
  by putting them end-to-end, or else use HTML comments to hide a newline character (this latter option will
  only be used when more human-readable output is being called for).
* But observe that the final character of each `<span>` should be the one that would be used in absence of
  the line break, i.e. a space if the next line starts with a new word, and no space in the case of a
  hyphenated word.
* In order to distinguish orthographic hyphens (as in `run-of-the-mill procedure`) from typographic ones (as
  in `inten-tion`), output `<span>run-of-the</span></span>-mill procedure<span>` *with* a hyphen but
  `<span>inten</span><span>tion</span>` *without* one).
* Each page gets its own `<textcontainer>` element to make correct overlay positioning less of a chore. It
  turns out that when the user selects text crossing the boundaries of the block elements (as in `one
  </span> </textcontainer><textcontainer><span>two </span><span>three</span></textcontainer>`) they will get
  `one ⏎two three` with a newline inserted where the page break was. This is ideal since paragraph breaks
  are rendered as empty lines (two line breaks in a row); markup languages like MarkDown and the
  reformatting utilites of text editors alike will do the right thing in this case.
* The spans must appear in logical, not geometric order, i.e. they must appear in the order the source text
  was intended to be read.
* The text is sized, positioned and formatted such as to closely mimick the positions and sizes of the SVG
  outlines; it is given the CSS `transparent` color to make it invisible (unless when selected).
* All elements except `<textcontainer>` are in the CSS set to be non-selectable with `user-select: none;`.
* The result of this is that the user sees SVG outlines and can visually read the text. A screenreader or
  the user's pointing device gets to see the transparent copy. The logical ordering of the `<span>`s of
  lines mean that text can be selected across columns and across page breaks and remain intact.
* In the copied text, paragraphs will appear as single lines, separated by blank lines.
* As an aside, it does not seem to be possible to obtain full compatibility with the standard `<span>`
  element just by defining a custom element and declaring it to `display: inline;`; when text is copied
  across multiple such elements, line breaks will still be inserted by the browser.


```html
<textcontainer><!--?textcontainer-start?-->
<p><!--
--><span style='left:0mm;top:40mm;'>first line of text </span><!--
--><span style='left:00mm;top:50mm;'>second line-</span><!--
--><span style='left:50mm;top:40mm;'>of-text; third line </span><!--
--><span style='left:50mm;top:50mm;'>fourth line</span><!--
--><p><!--
--><span style='left:0mm;top:40mm;'>first line of text </span><!--
--><span style='left:00mm;top:50mm;'>second line-</span><!--
--><span style='left:50mm;top:40mm;'>of-text; third line </span><!--
--><span style='left:50mm;top:50mm;'>fourth line</span>
<!--?textcontainer-end?--></textcontainer>
```

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
