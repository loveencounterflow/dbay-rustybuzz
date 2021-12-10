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
          trk: 1
        });
        shy_ads = this._shape_hyphenated({...cfg, ads});
        return [...ads, ...shy_ads];
      }

      //---------------------------------------------------------------------------------------------------------
      _shape_hyphenated(cfg) {
        /* TAINT use proper validation */
        var I, L, V, ads, b1, b2, doc, dx0, dx2, fontnick, i, left_ads, len, new_trk, par, ref, right_ads, schema, shy_b1, shy_sgi, text, trk_max;
        ({fontnick, doc, par, ads} = cfg);
        ({schema} = this.cfg);
        ({V, I, L} = this.sql);
        left_ads = [];
        right_ads = [];
        //.......................................................................................................
        ({trk_max} = this.db.single_row(SQL`select max( trk ) as trk_max
from ${schema}.ads where ( doc = $doc ) and ( par = $par );`, {doc, par}));
        new_trk = trk_max;
        ref = this.db.all_rows(SQL`select b1 as shy_b1, sgi as shy_sgi from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( br  in ( 'shy', 'wbr' ) )
    and ( trk = 1 );`, {doc, par});
        //.......................................................................................................
        for (i = 0, len = ref.length; i < len; i++) {
          ({shy_b1, shy_sgi} = ref[i]);
          //.....................................................................................................
          // First batch: Characters in same shape group as SHY, up to the shy, with an added hyphen:
          ({text, b1, b2, dx0} = this.db.first_row(SQL`select
    coalesce(
      group_concat( case when br = 'shy' then '' else chrs end, '' ),
      '' ) || case when br = 'shy' then '-' else '' end               as text,
    min( x )                                                          as dx0,
    min( b1 )                                                         as b1,
    max( b2 )                                                         as b2
  from ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( sgi = $shy_sgi )
    and ( b1 <= $shy_b1 )
    and ( trk = 1 )
  order by b1, id;`, {doc, par, shy_b1, shy_sgi}));
          urge('^arg740-1^', {shy_b1, shy_sgi, dx0, text, new_trk});
          new_trk++;
          left_ads = this._shape_text({
            ...cfg,
            text,
            b1,
            b2,
            dx0,
            trk: new_trk,
            osgi: shy_sgi
          });
          urge('^arg740-2^', "left_ads");
          console.table(left_ads);
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
    and ( trk = 1 )
  order by b1, id;`, {doc, par, shy_b1, shy_sgi}));
          info('^arg740-3^', {text, dx2});
          if (text !== '') {
            urge('^arg740-4^', {shy_b1, shy_sgi, dx2, text, new_trk});
            right_ads = this._shape_text({
              ...cfg,
              text,
              b1,
              b2,
              dx2,
              trk: new_trk,
              osgi: shy_sgi
            });
            urge('^arg740-5^', "right_ads");
            console.table(right_ads);
          }
          urge('^arg740-6^');
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
        var R, ad, bytes, extra_ad, has_shy, has_wbr, i, idx, len, prv_ad, ref, ref1, special, specials;
        R = [];
        ({specials} = this.constructor.C);
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
          special = null;
          if (ad.chrs.startsWith(specials.shy.chrs)) {
            special = specials.shy;
          } else if (ad.chrs.startsWith(specials.wbr.chrs)) {
            special = specials.wbr;
          }
          /* SHY and WBR may appear together with other material in the same AD, this we don't want so we
               separate those into their own ADs: */
          if (special != null) {
            ad.br = special.name;
            if (ad.chrs.length > 1/* NOTE safe b/c we know SHY is BMP codepoint */) {
              extra_ad = {...ad};
              ad.b2 = ad.b1 + special.bytecount;
              extra_ad.chrs = ad.chrs.slice(1);
              extra_ad.b1 = ad.b2;
              extra_ad.br = null;
              extra_ad.gid = specials.ignored.gid;
              extra_ad.sid = _get_sid({
                fontnick,
                gid: specials.ignored.gid
              });
              ad.chrs = ad.chrs[0];
              ad.dx = 0;
              ad.x1 = ad.x;
            }
          } else if (ad.chrs === ' ') {
            ad.br = specials.spc.name;
            ad.gid = specials.spc.gid;
          } else if (ad.chrs === '-') {
            ad.br = specials.hhy.name;
          } else if (ad.chrs === '\n') {
            ad.br = specials.nl.name;
            ad.gid = specials.nl.gid;
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
        var ad, ads, b1/* NOTE optional leftmost byte index */, b2/* NOTE optional rightmost byte index */, ced_x, ced_y, delta_x, doc, dx0/* NOTE optional leftmost  x reference coordinate */, dx2/* NOTE optional rightmost x reference coordinate */, ed_x, font_idx, fontnick, i, idx, len, osgi, par, schema, sgi, skip_ends, specials, text, trk, width;
        ({fontnick, text, dx0, dx2, b1, b2, doc, par, trk, osgi} = cfg);
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
        ads = JSON.parse(this.RBW.shape_text({
          format: 'json',
          text,
          font_idx
        }));
        ads = this._prepare_ads(text, fontnick, ads);
        ({specials} = this.constructor.C);
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
          ad.trk = trk;
          ad.b1 += b1;
          ad.b2 += b1;
          ad.sgi = sgi;
          ad.osgi = osgi;
          ad.sid = _get_sid({
            fontnick,
            gid: ad.gid
          });
          ad.x += ced_x;
          ad.y += ced_y;
          //.....................................................................................................
          // Replace original metrics with those of missing outline:
          if (ad.gid === specials.missing.gid) {
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
        // debug '^arg740-7^', ( rpr ad.chrs ), to_width ( rpr ad ), 100
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
          var insert_ad, j, last_idx, len1, row;
          insert_ad = this.db.prepare(this.sql.insert_ad);
          last_idx = ads.length - 1;
          for (idx = j = 0, len1 = ads.length; j < len1; idx = ++j) {
            ad = ads[idx];
            ad.x += delta_x;
            ad.x1 += delta_x;
            if ((trk === 1) && (idx === last_idx)) {
              ad.br = 'end';
            }
            row = {
              br: null,
              ...ad
            };
            row.nobr = row.nobr ? 1 : 0;
            // debug '^arg740-8^', row
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