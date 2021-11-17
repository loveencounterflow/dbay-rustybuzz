(function() {
  'use strict';
  var CND, E, FS, PATH, SQL, ZLIB, _TO_BE_REMOVED_bbox_pattern, badge, debug, echo, guy, help, info, jp, jr, rpr, to_width, urge, warn, whisper, width_of;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DRB/MIXIN/OUTLINES';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  guy = require('guy');

  PATH = require('path');

  FS = require('fs');

  E = require('./errors');

  ZLIB = require('zlib');

  _TO_BE_REMOVED_bbox_pattern = /^<rect x="(?<x>[-+0-9]+)" y="(?<y>[-+0-9]+)" width="(?<width>[-+0-9]+)" height="(?<height>[-+0-9]+)"\/>$/;

  SQL = String.raw;

  ({width_of, to_width} = require('to-width'));

  jr = JSON.stringify;

  jp = JSON.parse;

  //-----------------------------------------------------------------------------------------------------------
  this.Drb_outlines = (clasz = Object) => {
    return class extends clasz {
      // #---------------------------------------------------------------------------------------------------------
      // constructor: ->
      //   super()
      //   return undefined

        //---------------------------------------------------------------------------------------------------------
      // _$outlines_initialize: ->

        //---------------------------------------------------------------------------------------------------------
      _parse_sid(sid) {
        return (sid.match(/^o(?<gid>[0-9]+)(?<fontnick>.+)$/)).groups;
      }

      //---------------------------------------------------------------------------------------------------------
      get_single_outline(cfg) {
        var br, font_idx, fontnick, gid, height, match, parameters, pd, sid, width, x, x1, y, y1;
        /* TAINT this method is highly inefficient for large numbers of outline retrievals; the intention is to
           replace it with a function that allows for lists of `gid`s to be handled with a single call. */
        //.........................................................................................................
        this.types.validate.dbr_get_single_outline_cfg((cfg = {...this.constructor.C.defaults.dbr_get_single_outline_cfg, ...cfg}));
        ({fontnick, gid, sid} = cfg);
        if (sid != null) {
          ({fontnick, gid} = this._parse_sid(sid));
        }
        // debug '^3334^', { fontnick, gid, sid, }
        font_idx = this._font_idx_from_fontnick(fontnick);
        //.........................................................................................................
        ({br, pd} = JSON.parse(this.RBW.glyph_to_svg_pathdata(font_idx, gid)));
        //.........................................................................................................
        /* TAINT we parse the bounding rectangle (which will look like `<rect x="49" y="-613" width="245"
           height="627"/>`) so users of this method get (more or less) the format we mean to implement in the
           future. */
        if ((match = br.match(_TO_BE_REMOVED_bbox_pattern)) == null) {
          parameters = rpr({fontnick, gid, br});
          throw new E.Dbr_internal_error('^dbr/outlines@1^', `found unknown format when trying to parse bounding box SVG ${parameters}`);
        }
        x = parseInt(match.groups.x, 10);
        y = parseInt(match.groups.y, 10);
        width = parseInt(match.groups.width, 10);
        height = parseInt(match.groups.height, 10);
        x1 = x + width;
        y1 = y + height;
        return {
          bbox: {x, y, x1, y1, width, height},
          pd
        };
      }

      //---------------------------------------------------------------------------------------------------------
      _normalize_drb_chrs(chrs) {
        var chr;
        if (this.types.isa.list(chrs)) {
          chrs = (chrs.flat(2e308)).join('');
        }
        return (function() {
          var i, len, ref, results;
          ref = Array.from(chrs);
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            chr = ref[i];
            results.push(chr.codePointAt(0));
          }
          return results;
        })();
      }

      //---------------------------------------------------------------------------------------------------------
      get_cgid_map(cfg) {
        var R, ads, chrs, font_idx, fontnick, i, len, sd, sds, text;
        /* Given a list of characters as `chrs` and a `fontnick`, return a `Map` from characters to GIDs
           (glyf IDs). Unmappable characters will be left out. */
        this.types.validate.dbr_get_cgid_map_cfg((cfg = {...this.constructor.C.defaults.dbr_get_cgid_map_cfg, ...cfg}));
        ({ads, chrs, fontnick} = cfg);
        if (ads != null) {
          return this._get_cgid_map_from_ads(ads);
        }
        font_idx = this._font_idx_from_fontnick(fontnick);
        if (this.types.isa.list(chrs)) {
          text = chrs.join('\n');
        } else {
          text = chrs;
        }
        sds = this.shape_text({
          fontnick,
          text,
          fm: {},
          doc: 0,
          par: 0
        });
        R = new Map();
        for (i = 0, len = sds.length; i < len; i++) {
          sd = sds[i];
          if (sd.gid === 0) {
            continue;
          }
          /* TAINT it *might* happen that several distinct `chrs` sequences map to the *same* GID */
          R.set(sd.gid, sd.chrs);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _get_cgid_map_from_ads(ads) {
        var R, ad, i, len;
        R = new Map();
        for (i = 0, len = ads.length; i < len; i++) {
          ad = ads[i];
          if (ad.gid == null) {
            continue;
          }
          R.set(ad.gid, ad.chrs);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      /* 'arrange()' like 'compose()' and 'distribute()' */
      shape_text(cfg) {
        var ads, shy_ads, shy_data;
        this.types.validate.dbr_shape_text_cfg((cfg = {...this.constructor.C.defaults.dbr_shape_text_cfg, ...cfg}));
        ({ads, shy_data} = this._shape_text({
          ...cfg,
          vrt: 1
        }));
        shy_ads = this._shape_hyphenated({...cfg, ads, shy_data});
        return [...ads, ...shy_ads];
      }

      //---------------------------------------------------------------------------------------------------------
      _shape_hyphenated(cfg) {
        /* TAINT use proper validation */
        /* TAINT wrong if there's more than one hyphen */
        var I, L, R, V, ad, adi, adi_0, ads, doc, dx0, fontnick, hhy_ads, i, idx, j, len, len1, new_vrt, par, schema, shy, shy_data, shy_idx, shy_idxs, text, vrt, vrt_delta, vrt_max;
        ({fontnick, doc, par, ads, shy_data} = cfg);
        ({schema} = this.cfg);
        ({V, I, L} = this.sql);
        ({shy} = this.constructor.C.special_chrs);
        R = [];
        // return R # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //.......................................................................................................
        ({vrt_max} = this.db.single_row(SQL`select max( vrt ) as vrt_max
from ${schema}.ads where ( doc = $doc ) and ( par = $par );`, {doc, par}));
        new_vrt = vrt_max;
//.......................................................................................................
        for (i = 0, len = shy_data.length; i < len; i++) {
          ({doc, par, adi, vrt} = shy_data[i]);
          ads = this.db.all_rows(SQL`select
    *
  from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( vrt = $vrt )
    and ( sgi in ( select
      distinct sgi
    from ${schema}.ads
    where true
      and ( doc = $doc )
      and ( par = $par )
      and ( adi in ( $adi - 1, $adi, $adi + 1 ) ) )
      and ( vrt = $vrt ) );`, {doc, par, adi, vrt});
          dx0 = ads[0].x;
          // urge "^4084^ segments for SHY", { doc, par, adi, vrt, dx0, }; console.table ads
          shy_idxs = (function() {
            var j, len1, results;
            results = [];
            for (idx = j = 0, len1 = ads.length; j < len1; idx = ++j) {
              ad = ads[idx];
              if (ad.br === 'shy') {
                results.push(idx);
              }
            }
            return results;
          })();
          for (vrt_delta = j = 0, len1 = shy_idxs.length; j < len1; vrt_delta = ++j) {
            shy_idx = shy_idxs[vrt_delta];
            new_vrt++;
            text = ((function() {
              var k, len2, results;
              results = [];
              for (k = 0, len2 = ads.length; k < len2; k++) {
                ad = ads[k];
                results.push(ad.chrs === shy ? '-' : ad.chrs);
              }
              return results;
            })()).join('');
            // ### TAINT wrong if there's more than one hyphen ###
            // ad.br     = 'hhy' if ad.br is 'shy'
            adi_0 = ads[0].adi;
            ({
              // debug '^4084^', rpr text
              ads: hhy_ads
            } = this._shape_text({
              ...cfg,
              text,
              adi_0,
              dx0,
              vrt: new_vrt
            }));
            R = [...R, ...hhy_ads];
          }
        }
        // debug '^3345345^', hhy_ads
        // urge "^4084^ segments for HHY"; console.table @db.all_rows SQL"""
        //   select * from ads where vrt > 1 order by doc, par, vrt, adi;"""
        // #.......................................................................................................
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _prepare_ads(text, fontnick, ads) {
        /* As it stands `rustybuzz-wasm` will follow `rustybuzz` in that soft hyphens (SHYs) and word break
           opportunities (WBRs) either get their own arrangement data item (AD) or else are tacked to the *front*
           of one or more letters when they appear in the middle of a ligature (as in `af&shy;firm` with ligature
           `ff` or `ffi`). In order to simplify processing and remove the case distinction, we normalize all cases
           where WBRs and SHYs appear with other material to always make them standalone ADs. */
        var R, ad, adi, bytes, extra_ad, has_shy, has_wbr, i, ignored, len, nxt_b, prv_ad, ref, ref1, special_chrs;
        R = [];
        ({special_chrs, ignored} = this.constructor.C);
        bytes = Buffer.from(text, {
          encoding: 'utf-8'
        });
        prv_ad = null;
        for (adi = i = 0, len = ads.length; i < len; adi = ++i) {
          ad = ads[adi];
          nxt_b = (ref = (ref1 = ads[adi + 1]) != null ? ref1.b : void 0) != null ? ref : 2e308;
          ad.chrs = bytes.slice(ad.b, nxt_b).toString();
          extra_ad = null;
          has_shy = false;
          has_wbr = false;
          if (ad.chrs.startsWith(special_chrs.shy)) {
            has_shy = true;
          } else if (ad.chrs.startsWith(special_chrs.wbr)) {
            has_wbr = true;
          }
          if (has_shy || has_wbr) {
            ad.br = has_shy ? 'shy' : 'wbr';
            if (ad.chrs.length > 1/* NOTE safe b/c we know SHY is BMP codepoint */) {
              extra_ad = {...ad};
              extra_ad.chrs = ad.chrs.slice(1);
              extra_ad.br = null;
              extra_ad.gid = ignored.gid;
              extra_ad.sid = `o${ignored.gid}${fontnick}`;
              ad.chrs = ad.chrs[0];
              ad.dx = 0;
              ad.x1 = ad.x;
            }
          } else if (ad.chrs === ' ') {
            ad.br = 'spc';
          } else if (ad.chrs === '-') {
            ad.br = 'hhy';
          }
          R.push(ad);
          if (extra_ad != null) {
            R.push(extra_ad);
            extra_ad = null;
          }
        }
        prv_ad = ad;
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _shape_text(cfg) {
        var ad, adi, adi_0/* NOTE optional first AD index */, adi_0_given, ads, ced_x, ced_y, doc, dx0/* NOTE optional x reference coordinate */, ed_x, font_idx, fontnick, i, idx, last_ad, last_adi, len, missing, par, sgi, shy_data, text, this_adi, vrt, width;
        ({fontnick, text, adi_0, dx0, doc, par, vrt} = cfg);
        ({missing} = this.constructor.C);
        adi_0_given = adi_0 != null;
        if (adi_0 == null) {
          adi_0 = 0/* TAINT use validation, defaults */
        }
        if (dx0 == null) {
          dx0 = 0/* TAINT use validation, defaults */
        }
        font_idx = this._font_idx_from_fontnick(fontnick);
        ads = this.RBW.shape_text({
          format: 'json',
          text,
          font_idx
        });
        ads = JSON.parse(ads);
        ads = this._prepare_ads(text, fontnick, ads);
        shy_data = [];
        //.......................................................................................................
        if (!adi_0_given) {
          ads.unshift({
            doc,
            par,
            adi: 0,
            vrt,
            sgi: 0,
            gid: null,
            b: null,
            x: 0,
            y: 0,
            dx: 0,
            dy: 0,
            x1: 0,
            chrs: null,
            sid: null,
            nobr: 0,
            br: 'start'
          });
        }
        ced_x = 0; // cumulative error displacement from missing outlines
        ced_y = 0; // cumulative error displacement from missing outlines
        sgi = 0;
/* TAINT will not properly handle multiple SHYs in the same segment (this might happen in ligatures
   like `ffi`) */
        for (idx = i = 0, len = ads.length; i < len; idx = ++i) {
          ad = ads[idx];
          if ((!adi_0_given) && (idx === 0)) {
            continue;
          }
          adi = adi_0 + idx;
          if (!ad.nobr) {
            //.....................................................................................................
            sgi++;
          }
          ad.sgi = sgi;
          ad.doc = doc;
          ad.par = par;
          ad.adi = adi;
          ad.vrt = vrt;
          ad.sid = `o${ad.gid}${fontnick}`;
          ad.x += ced_x;
          ad.y += ced_y;
          if (ad.br === 'shy') {
            shy_data.push({doc, par, adi, vrt});
          }
          //.....................................................................................................
          // Replace original metrics with those of missing outline:
          if (ad.gid === missing.gid) {
            if ((width_of((Array.from(ad.chrs))[0])) < 2) {
              width = 500;
            } else {
              width = 1000;
            }
            ed_x = width - ad.dx;
            ced_x += ed_x;
            ad.dx = width;
          }
          //.....................................................................................................
          ad.x = Math.round(ad.x + dx0);
          ad.y = Math.round(ad.y);
          ad.dx = Math.round(ad.dx);
          ad.dy = Math.round(ad.dy);
          ad.x1 = ad.x + ad.dx;
        }
        // debug '^3447^', ( rpr ad.chrs ), to_width ( rpr ad ), 100
        //.......................................................................................................
        if (!adi_0_given) {
          last_adi = ads.length - 1;
          last_ad = ads[last_adi];
          this_adi = last_adi + 1;
          ads.push({
            doc,
            par,
            adi: this_adi,
            vrt,
            sgi: last_ad.sgi + 1,
            gid: null,
            b: null,
            x: last_ad.x1,
            y: last_ad.y,
            dx: 0,
            dy: 0,
            x1: last_ad.x1,
            chrs: null,
            sid: null,
            nobr: 0,
            br: 'end'
          });
        }
        //.......................................................................................................
        this.db(() => {
          var insert_ad, j, len1, row;
          insert_ad = this.db.prepare(this.sql.insert_ad);
          for (idx = j = 0, len1 = ads.length; j < len1; idx = ++j) {
            ad = ads[idx];
            row = {
              br: null,
              ...ad
            };
            row.nobr = row.nobr ? 1 : 0;
            ads[idx] = this.db.first_row(insert_ad, row);
          }
          return null;
        });
        //.......................................................................................................
        return {ads, shy_data};
      }

      //---------------------------------------------------------------------------------------------------------
      get_font_metrics(cfg) {
        var R, font_idx, fontnick;
        this.types.validate.dbr_get_font_metrics_cfg((cfg = {...this.constructor.C.defaults.dbr_get_font_metrics_cfg, ...cfg}));
        ({fontnick} = cfg);
        font_idx = this._font_idx_from_fontnick(fontnick);
        R = JSON.parse(this.RBW.get_font_metrics(font_idx));
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _zip(txt) {
        return ZLIB.deflateRawSync(Buffer.from(txt), this.constructor.C.zlib_zip_cfg);
      }

      _unzip(bfr) {
        return (ZLIB.inflateRawSync(bfr)).toString();
      }

      //---------------------------------------------------------------------------------------------------------
      * insert_and_walk_outlines(cfg) {
        var ads, bbox, cgid_map, chrs, error, fontnick, gid, insert_outline, missing, pd, pd_blob, row, x, x1, y, y1, z;
        /* Given a `cfg.fontnick` and a (list or map of) `cfg.cgid_map`, insert the outlines and bounding
           boxes of the referred glyfs. */
        /* TAINT validate */
        this.types.validate.dbr_insert_outlines_cfg((cfg = {...this.constructor.C.defaults.dbr_insert_outlines_cfg, ...cfg}));
        ({fontnick, chrs, cgid_map, ads} = cfg);
        if (cgid_map == null) {
          cgid_map = this.get_cgid_map({fontnick, chrs, ads});
        }
        insert_outline = this.db.prepare(this.sql.insert_outline);
        ({missing} = this.constructor.C);
        try {
          if (!this.db.within_transaction()) {
            //.......................................................................................................
            this.db.begin_transaction();
          }
          for (z of cgid_map) {
            [gid, chrs] = z;
            if (gid <= missing.gid) {
              continue;
            }
            ({bbox, pd} = this.get_single_outline({gid, fontnick}));
            ({x, y, x1, y1} = bbox);
            pd_blob = this._zip(pd);
            row = this.db.first_row(insert_outline, {fontnick, gid, chrs, x, y, x1, y1, pd_blob});
            delete row.pd_blob;
            yield row;
          }
        } catch (error1) {
          error = error1;
          if (this.db.within_transaction()) {
            this.db.rollback_transaction();
          }
          throw error;
        }
        if (this.db.within_transaction()) {
          this.db.commit_transaction();
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      insert_outlines(cfg) {
        var _, ref;
        ref = this.insert_and_walk_outlines(cfg);
        for (_ of ref) {
          null;
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      compose(cfg) {
        var ad, ads, d, doc, fm, fontnick, i, known_ods, len, missing, missing_ads, missing_chrs, new_ods, od, par, ref, ref1, required_sids, text;
        /* Compose (usually up to one paragraph's worth of) text on a single line without line breaks. */
        this.types.validate.dbr_compose_cfg((cfg = {...this.constructor.C.defaults.dbr_compose_cfg, ...cfg}));
        ({fontnick, text, known_ods} = cfg);
        if (known_ods == null) {
          known_ods = {};
        }
        new_ods = {};
        missing_ads = {};
        ({missing} = this.constructor.C);
        fm = this.get_font_metrics({fontnick});
        //.......................................................................................................
        /* Shape text, which gives us positions, GIDs/SIDs, and the characters corresponding to each outline.
           The `required_ads` maps from SIDs to arrangement data items (ADs): */
        /* TAINt return standard glyph for all missing outlines */
        doc = 1/* Document ID */
        par = 1/* Paragraph ID */
        ads = this.shape_text({
          fontnick,
          text,
          fm,
          doc,
          par,
          vrt: 1
        });
        debug('^3494746^');
        console.table(ads);
        for (i = 0, len = ads.length; i < len; i++) {
          d = ads[i];
          //.......................................................................................................
          missing_ads[d.sid] = d;
        }
        //.......................................................................................................
        required_sids = Object.keys(missing_ads);
        ref = this.db(SQL`select
    fontnick, gid, sid, chrs, x, y, x1, y1, pd
from outlines
where ( gid != 0 ) and ( sid in ${this.db.sql.V(required_sids)} );`);
        for (od of ref) {
          known_ods[od.sid] = od;
          delete missing_ads[od.sid];
        }
        ref1 = this.insert_and_walk_outlines({fontnick, ads});
        //.......................................................................................................
        /* Retrieve (from font) and insert (into DB) missing outline data (ODs) items: */
        for (od of ref1) {
          delete missing_ads[od.sid];
          known_ods[od.sid] = od;
          new_ods[od.sid] = od;
        }
        //.......................................................................................................
        missing_chrs = (function() {
          var j, len1, results;
          results = [];
          for (j = 0, len1 = ads.length; j < len1; j++) {
            ad = ads[j];
            if (ad.gid === missing.gid) {
              results.push(ad);
            }
          }
          return results;
        })();
        //.......................................................................................................
        return {known_ods, new_ods, missing_chrs, ads, fm};
      }

    };
  };

}).call(this);

//# sourceMappingURL=outlines-mixin.js.map