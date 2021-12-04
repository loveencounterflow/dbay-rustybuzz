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
      arrange(cfg) {
        var ads, shy_ads;
        this.types.validate.dbr_arrange_cfg((cfg = {...this.constructor.C.defaults.dbr_arrange_cfg, ...cfg}));
        ads = this._shape_text({
          ...cfg,
          alt: 1
        });
        shy_ads = this._shape_hyphenated({...cfg, ads});
        return [...ads, ...shy_ads];
      }

      //---------------------------------------------------------------------------------------------------------
      _shape_hyphenated(cfg) {
        /* TAINT use proper validation */
        var I, L, V, ads, alt_max, b1, b2, doc, dx0, dx2, fontnick, i, left_ads, len, new_alt, par, ref, right_ads, schema, shy, shy_b1, shy_sgi, text;
        ({fontnick, doc, par, ads} = cfg);
        ({schema} = this.cfg);
        ({V, I, L} = this.sql);
        ({shy} = this.constructor.C.special_chrs);
        left_ads = [];
        right_ads = [];
        //.......................................................................................................
        ({alt_max} = this.db.single_row(SQL`select max( alt ) as alt_max
from ${schema}.ads where ( doc = $doc ) and ( par = $par );`, {doc, par}));
        new_alt = alt_max;
        ref = this.db.all_rows(SQL`select b1 as shy_b1, sgi as shy_sgi from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( br  = 'shy' )
    and ( alt = 1 );`, {doc, par});
        //.......................................................................................................
        for (i = 0, len = ref.length; i < len; i++) {
          ({shy_b1, shy_sgi} = ref[i]);
          //.....................................................................................................
          // First batch: Characters in same shape group as SHY, up to the shy, with an added hyphen:
          ({text, b1, b2, dx0} = this.db.first_row(SQL`select
    coalesce(
      group_concat( case when br = 'shy' then '' else chrs end, '' ),
      '' ) || '-'             as text,
    min( x )                  as dx0,
    min( b1 )                 as b1,
    max( b2 )                 as b2
  from ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( sgi = $shy_sgi )
    and ( b1 <= $shy_b1 )
    and ( alt = 1 )
  order by b1, id;`, {doc, par, shy_b1, shy_sgi}));
          urge('^460971^', {shy_b1, shy_sgi, dx0, text, new_alt});
          new_alt++;
          left_ads = this._shape_text({
            ...cfg,
            text,
            b1,
            b2,
            dx0,
            alt: new_alt,
            osgi: shy_sgi
          });
          // last_left_ad  = left_ads[ left_ads.length - 1 ]
          //.....................................................................................................
          ({text, b1, b2, dx2} = this.db.first_row(SQL`select
    coalesce(
      group_concat( case when br = 'shy' then '' else chrs end, '' ),
      '' )                    as text,
    max( x1 )                 as dx2,
    min( b1 )                 as b1,
    max( b2 )                 as b2
  from ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( sgi = $shy_sgi )
    and ( b1  > $shy_b1 )
    and ( alt = 1 )
  order by b1, id;`, {doc, par, shy_b1, shy_sgi}));
          info('^460971^', {text, dx2});
          if (text !== '') {
            urge('^460971^', {shy_b1, shy_sgi, dx2, text, new_alt});
            right_ads = this._shape_text({
              ...cfg,
              text,
              b1,
              b2,
              dx2,
              alt: new_alt,
              osgi: shy_sgi
            });
          }
          urge('^460971^');
        }
        //.......................................................................................................
        return [...left_ads, ...right_ads];
      }

      //---------------------------------------------------------------------------------------------------------
      _prepare_ads(text, fontnick, ads) {
        /* As it stands `rustybuzz-wasm` will follow `rustybuzz` in that soft hyphens (SHYs) and word break
           opportunities (WBRs) either get their own arrangement data item (AD) or else are tacked to the *front*
           of one or more letters when they appear in the middle of a ligature (as in `af&shy;firm` with ligature
           `ff` or `ffi`). In order to simplify processing and remove the case distinction, we normalize all cases
           where WBRs and SHYs appear with other material to always make them standalone ADs. */
        var R, ad, byte_counts, bytes, extra_ad, has_shy, has_wbr, i, idx, ignored, len, prv_ad, ref, ref1, special_chrs;
        R = [];
        ({special_chrs, byte_counts, ignored} = this.constructor.C);
        bytes = Buffer.from(text, {
          encoding: 'utf-8'
        });
        prv_ad = null;
        for (idx = i = 0, len = ads.length; i < len; idx = ++i) {
          ad = ads[idx];
          ad.b1 = ad.b;
          ad.b2 = (ref = (ref1 = ads[idx + 1]) != null ? ref1.b : void 0) != null ? ref : bytes.length;
          delete ad.b;
          ad.chrs = bytes.slice(ad.b1, ad.b2).toString();
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
              ad.b2 = ad.b1 + byte_counts[has_shy ? 'shy' : 'wbr'];
              extra_ad.chrs = ad.chrs.slice(1);
              extra_ad.b1 = ad.b2;
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
        var ad, ads, alt, b1/* NOTE optional leftmost byte index */, b2/* NOTE optional rightmost byte index */, ced_x, ced_y, delta_x, doc, dx0/* NOTE optional leftmost  x reference coordinate */, dx2/* NOTE optional rightmost x reference coordinate */, ed_x, font_idx, fontnick, i, idx, len, missing, osgi, par, schema, sgi, skip_ends, text, width;
        ({fontnick, text, dx0, dx2, b1, b2, doc, par, alt, osgi} = cfg);
        ({missing} = this.constructor.C);
        skip_ends = (dx0 != null) || (dx2 != null);
/* TAINT will probably be removed */        if (b1 == null) {
          b1 = 0;
        }
        if (b2 == null) {
          b2 = null;
        }
        if (dx0 == null) {
          dx0 = 0/* TAINT use validation, defaults */
        }
        if (dx2 == null) {
          dx2 = null;
        }
        font_idx = this._font_idx_from_fontnick(fontnick);
        ads = this.RBW.shape_text({
          format: 'json',
          text,
          font_idx
        });
        ads = JSON.parse(ads);
        ads = this._prepare_ads(text, fontnick, ads);
        ({schema} = this.cfg);
        //.......................................................................................................
        ced_x = 0; // cumulative error displacement from missing outlines
        ced_y = 0; // cumulative error displacement from missing outlines
        if (osgi == null) {
          osgi = null;
        }
        sgi = 0;
/* TAINT will not properly handle multiple SHYs in the same segment (this might happen in ligatures
   like `ffi`) */
        for (idx = i = 0, len = ads.length; i < len; idx = ++i) {
          ad = ads[idx];
          if (!ad.nobr) {
            sgi++;
          }
          ad.doc = doc;
          ad.par = par;
          ad.alt = alt;
          ad.b1 += b1;
          ad.b2 += b1;
          ad.sgi = sgi;
          ad.osgi = osgi;
          ad.sid = `o${ad.gid}${fontnick}`;
          ad.x += ced_x;
          ad.y += ced_y;
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
        if (b2 != null) {
          ads[ads.length - 1].b2 = b2;
        }
        if (dx2 != null) {
          delta_x = dx2 - ads[ads.length - 1].x1;
        } else {
          delta_x = 0;
        }
        //.......................................................................................................
        this.db(() => {
          var insert_ad, j, len1, row;
          insert_ad = this.db.prepare(this.sql.insert_ad);
          for (idx = j = 0, len1 = ads.length; j < len1; idx = ++j) {
            ad = ads[idx];
            ad.x += delta_x;
            ad.x1 += delta_x;
            row = {
              br: null,
              ...ad
            };
            row.nobr = row.nobr ? 1 : 0;
            // debug '^545456^', row
            ads[idx] = this.db.first_row(insert_ad, row);
          }
          return null;
        });
        //.......................................................................................................
        return ads;
      }

    };
  };

}).call(this);

//# sourceMappingURL=arrangement-mixin.js.map