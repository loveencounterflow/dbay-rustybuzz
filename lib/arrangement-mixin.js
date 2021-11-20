(function() {
  'use strict';
  var CND, E, SQL, badge, debug, echo, guy, help, info, jp, jr, rpr, to_width, urge, warn, whisper, width_of;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DRB/MIXIN/ARRANGEMENT';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  guy = require('guy');

  E = require('./errors');

  SQL = String.raw;

  ({width_of, to_width} = require('to-width'));

  jr = JSON.stringify;

  jp = JSON.parse;

  //-----------------------------------------------------------------------------------------------------------
  this.Drb_arrangement = (clasz = Object) => {
    return class extends clasz {
      // #---------------------------------------------------------------------------------------------------------
      // constructor: ->
      //   super()
      //   return undefined

        //---------------------------------------------------------------------------------------------------------
      // _$arrangement_initialize: ->

        //---------------------------------------------------------------------------------------------------------
      /* 'arrange()' like 'compose()' and 'distribute()' */
      shape_text(cfg) {
        var ads, shy_ads, shy_data;
        this.types.validate.dbr_shape_text_cfg((cfg = {...this.constructor.C.defaults.dbr_shape_text_cfg, ...cfg}));
        ({ads, shy_data} = this._shape_text({
          ...cfg,
          alt: 1
        }));
        shy_ads = this._shape_hyphenated({...cfg, ads, shy_data});
        return [...ads, ...shy_ads];
      }

      //---------------------------------------------------------------------------------------------------------
      _shape_hyphenated(cfg) {
        /* TAINT use proper validation */
        /* TAINT wrong if there's more than one hyphen */
        var I, L, R, V, ad, adi, adi_0, ads, alt, alt_delta, alt_max, doc, dx0, fontnick, hhy_ads, i, idx, j, len, len1, new_alt, par, schema, shy, shy_data, shy_idx, shy_idxs, text;
        ({fontnick, doc, par, ads, shy_data} = cfg);
        ({schema} = this.cfg);
        ({V, I, L} = this.sql);
        ({shy} = this.constructor.C.special_chrs);
        R = [];
        // return R # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //.......................................................................................................
        ({alt_max} = this.db.single_row(SQL`select max( alt ) as alt_max
from ${schema}.ads where ( doc = $doc ) and ( par = $par );`, {doc, par}));
        new_alt = alt_max;
//.......................................................................................................
        for (i = 0, len = shy_data.length; i < len; i++) {
          ({doc, par, adi, alt} = shy_data[i]);
          ads = this.db.all_rows(SQL`select
    *
  from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( alt = $alt )
    and ( sgi in ( select
      distinct sgi
    from ${schema}.ads
    where true
      and ( doc = $doc )
      and ( par = $par )
      and ( adi in ( $adi - 1, $adi, $adi + 1 ) ) )
      and ( alt = $alt ) );`, {doc, par, adi, alt});
          dx0 = ads[0].x;
          // urge "^4084^ segments for SHY", { doc, par, adi, alt, dx0, }; console.table ads
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
          for (alt_delta = j = 0, len1 = shy_idxs.length; j < len1; alt_delta = ++j) {
            shy_idx = shy_idxs[alt_delta];
            new_alt++;
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
              alt: new_alt
            }));
            R = [...R, ...hhy_ads];
          }
        }
        // debug '^3345345^', hhy_ads
        // urge "^4084^ segments for HHY"; console.table @db.all_rows SQL"""
        //   select * from ads where alt > 1 order by doc, par, alt, adi;"""
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
        var ad, adi, adi_0/* NOTE optional first AD index */, adi_0_given, ads, alt, ced_x, ced_y, doc, dx0/* NOTE optional x reference coordinate */, ed_x, font_idx, fontnick, i, idx, last_ad, last_adi, len, missing, par, sgi, shy_data, text, this_adi, width;
        ({fontnick, text, adi_0, dx0, doc, par, alt} = cfg);
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
            alt,
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
          ad.alt = alt;
          ad.sid = `o${ad.gid}${fontnick}`;
          ad.x += ced_x;
          ad.y += ced_y;
          if (ad.br === 'shy') {
            shy_data.push({doc, par, adi, alt});
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
            alt,
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

    };
  };

}).call(this);

//# sourceMappingURL=arrangement-mixin.js.map