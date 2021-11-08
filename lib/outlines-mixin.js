(function() {
  'use strict';
  var CND, E, FS, PATH, SQL, ZLIB, _TO_BE_REMOVED_bbox_pattern, badge, debug, echo, guy, help, info, rpr, to_width, urge, warn, whisper, width_of;

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

  //-----------------------------------------------------------------------------------------------------------
  this.Drb_outlines = (clasz = Object) => {
    return class extends clasz {
      //---------------------------------------------------------------------------------------------------------
      constructor() {
        super();
        if (this.state == null) {
          guy.props.hide(this, 'state', {});
        }
        this.state.prv_fontidx = -1;
        this.state.font_idx_by_fontnicks = {};
        //.........................................................................................................
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _resolve_font_path(font_path) {
        var jzrfonts_path;
        if (font_path.startsWith('/')) {
          return font_path;
        }
        jzrfonts_path = '../../../assets/jizura-fonts';
        return PATH.resolve(PATH.join(__dirname, jzrfonts_path, font_path));
      }

      //---------------------------------------------------------------------------------------------------------
      _get_font_bytes(font_path) {
        return (FS.readFileSync(font_path)).toString('hex');
      }

      //---------------------------------------------------------------------------------------------------------
      register_fontnick(cfg) {
        this.types.validate.dbr_register_fontnick_cfg((cfg = {...this.constructor.C.defaults.dbr_register_fontnick_cfg, ...cfg}));
        this.db(this.sql.upsert_fontnick, cfg);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _fspath_from_fontnick(fontnick) {
        /* TAINT use fallback to configure behavior in case of failure */
        return this.db.single_value(this.sql.fspath_from_fontnick, {fontnick});
      }

      //---------------------------------------------------------------------------------------------------------
      _font_idx_from_fontnick(fontnick) {
        var R;
        /* TAINT use fallback to configure behavior in case of failure */
        if ((R = this.state.font_idx_by_fontnicks[fontnick]) == null) {
          throw new E.Dbr_unknown_or_unprepared_fontnick('^dbr/outlines@1^', fontnick);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      prepare_font(cfg) {
        var font_bytes, font_idx, fontnick, fspath;
        clasz = this.constructor;
        if (!(this.state.prv_fontidx < clasz.C.last_fontidx)) {
          throw new E.Dbr_font_capacity_exceeded('^dbr/outlines@1^', clasz.C.last_fontidx + 1);
        }
        //.........................................................................................................
        this.types.validate.dbr_prepare_font_cfg((cfg = {...this.constructor.C.defaults.dbr_prepare_font_cfg, ...cfg}));
        ({fontnick, fspath} = cfg);
        if (fspath != null) {
          //.........................................................................................................
          throw new E.Dbr_not_implemented('^dbr/outlines@1^', "setting fspath");
        }
        if (this.state.font_idx_by_fontnicks[fontnick] != null) {
          return null;
        }
        //.........................................................................................................
        fspath = this._fspath_from_fontnick(fontnick);
        font_idx = (this.state.prv_fontidx += 1);
        font_bytes = this._get_font_bytes(fspath);
        this.RBW.register_font(font_idx, font_bytes);
        this.state.font_idx_by_fontnicks[fontnick] = font_idx;
        return null;
      }

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
        // debug '^344321^', rpr chrs
        sds = this.shape_text({fontnick, text});
        R = new Map();
        for (i = 0, len = sds.length; i < len; i++) {
          sd = sds[i];
          if (sd.gid === 0) {
            continue;
          }
          // info '^986^', [ sd.chrs, sd.gid, ]
          /* TAINT it *might* happen that several distinct `chrs` sequences map to the *same* GID */
          R.set(sd.gid, sd.chrs);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _get_cgid_map_from_ads(ads) {
        var ad;
        return new Map((function() {
          var i, len, results;
          results = [];
          for (i = 0, len = ads.length; i < len; i++) {
            ad = ads[i];
            results.push([ad.gid, ad.chrs]);
          }
          return results;
        })());
      }

      //-----------------------------------------------------------------------------------------------------------
      /* 'arrange()' like 'compose()' and 'distribute()' */
      shape_text(cfg) {
        var R, ad, ads, bytes, ced_x, ced_y, ed_x, font_idx, fontnick, i, idx, len, missing, nxt_b, ref, ref1, special_chrs, text, width;
        this.types.validate.dbr_shape_text_cfg((cfg = {...this.constructor.C.defaults.dbr_shape_text_cfg, ...cfg}));
        ({fontnick, text} = cfg);
        ({special_chrs, missing} = this.constructor.C);
        font_idx = this._font_idx_from_fontnick(fontnick);
        ads = this.RBW.shape_text({
          format: 'json',
          text,
          font_idx // formats: json, rusty, short
        });
        R = JSON.parse(ads);
        bytes = Buffer.from(text, {
          encoding: 'utf-8'
        });
        ced_x = 0; // cumulative error displacement
        ced_y = 0; // cumulative error displacement
        for (idx = i = 0, len = R.length; i < len; idx = ++i) {
          ad = R[idx];
          nxt_b = (ref = (ref1 = R[idx + 1]) != null ? ref1.b : void 0) != null ? ref : 2e308;
          ad.chrs = bytes.slice(ad.b, nxt_b).toString();
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
          if (ad.chrs.startsWith(special_chrs.shy)) {
            /* TAINT insert data about replacement gids, metrics if hyphen instead of soft hyphen should be
                   used at this position */
            ad.sid = `oshy-${fontnick}`;
            ad.br = 'shy';
          } else if (ad.chrs.startsWith(special_chrs.wbr)) {
            ad.sid = `owbr-${fontnick}`;
            ad.br = 'wbr';
          } else if (ad.chrs === ' ') {
            ad.br = 'spc';
          }
          //.....................................................................................................
          ad.x = Math.round(ad.x);
          ad.y = Math.round(ad.y);
          ad.dx = Math.round(ad.dx);
          ad.dy = Math.round(ad.dy);
        }
        return R;
      }

      //-----------------------------------------------------------------------------------------------------------
      get_font_metrics(cfg) {
        var font_idx, fontnick;
        this.types.validate.dbr_get_font_metrics_cfg((cfg = {...this.constructor.C.defaults.dbr_get_font_metrics_cfg, ...cfg}));
        ({fontnick} = cfg);
        font_idx = this._font_idx_from_fontnick(fontnick);
        return JSON.parse(this.RBW.get_font_metrics(font_idx));
      }

      //-----------------------------------------------------------------------------------------------------------
      _zip(txt) {
        return ZLIB.deflateRawSync(Buffer.from(txt), this.constructor.C.zlib_zip_cfg);
      }

      _unzip(bfr) {
        return (ZLIB.inflateRawSync(bfr)).toString();
      }

      //-----------------------------------------------------------------------------------------------------------
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
            if (gid === missing.gid) {
              continue;
            }
            ({bbox, pd} = this.get_single_outline({gid, fontnick}));
            ({x, y, x1, y1} = bbox);
            pd_blob = this._zip(pd);
            row = this.db.first_row(insert_outline, {fontnick, gid, chrs, x, y, x1, y1, pd_blob});
            delete row.pd_blob;
            yield row;
          }
          return null;
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

      //-----------------------------------------------------------------------------------------------------------
      insert_outlines(cfg) {
        var _, ref;
        ref = this.insert_and_walk_outlines(cfg);
        for (_ of ref) {
          null;
        }
        return null;
      }

      //-----------------------------------------------------------------------------------------------------------
      compose(cfg) {
        var ad, ads, d, fm, fontnick, i, known_ods, len, missing, missing_ads, missing_chrs, new_ods, od, ref, ref1, required_sids, text;
        /* Compose (usually up to one paragraph's worth of) text on a single line without line breaks. */
        this.types.validate.dbr_typeset_cfg((cfg = {...this.constructor.C.defaults.dbr_typeset_cfg, ...cfg}));
        ({fontnick, text, known_ods} = cfg);
        if (known_ods == null) {
          known_ods = {};
        }
        new_ods = {};
        missing_ads = {};
        ({missing} = this.constructor.C);
        //.......................................................................................................
        /* Shape text, which gives us positions, GIDs/SIDs, and the characters corresponding to each outline.
           The `required_ads` maps from SIDs to arrangement data items (ADs): */
        /* TAINt return standard glyph for all missing outlines */
        ads = this.shape_text({fontnick, text});
        for (i = 0, len = ads.length; i < len; i++) {
          d = ads[i];
          missing_ads[d.sid] = d;
        }
        fm = this.get_font_metrics({fontnick});
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

      // #-----------------------------------------------------------------------------------------------------------
      // distribute: ( cfg ) ->
      //   { ads
      //     mm_p_u
      //     width_mm  } = cfg
      //   R             = []
      //   width_u       = width_mm / mm_p_u
      //   # line          = []
      //   x             = 0
      //   last_idx      = ads.length - 1
      //   cur_idx       = -1
      //   first_idx     = 0
      //   br_idx        = null
      //   x_ref         = 0
      //   urge '^3453451^', ( ad.chrs for ad in ads )
      //   loop
      //     cur_idx++
      //     break if cur_idx > last_idx
      //     ad = ads[ cur_idx ]
      //     debug '^44332^', cur_idx, ( rpr ad.chrs ), ( x = ad.x + ad.dx - x_ref ), width_u
      //     continue unless ad.br?
      //     unless ( x = ad.x + ad.dx - x_ref ) > width_u
      //       br_idx  = cur_idx
      //       continue
      //     R.push ads[ first_idx .. br_idx ]
      //     first_idx = br_idx
      //     br_idx    = null
      //     x_ref     = x
      //     # cur_idx++
      //   ### TAINT handle case when no breakpoint has been met so far ###
      //   R.push ads[ first_idx .. ]
      //   return R

        //-----------------------------------------------------------------------------------------------------------
      distribute(cfg) {
        var R, ad, adi, adi1, adi2, ads, brp, brpi, brpi1, brpi2, brps, corrected_x, dx0, i, j, last_adi, last_brpi, len, len1, line, lines, lnr, mm_p_u, rnr, width_mm, width_u;
        ({ads, mm_p_u, width_mm} = cfg);
        lines = [];
        R = {lines};
        width_u = width_mm / mm_p_u; // line width in glyf design unites (1000 per em)
        brps = []; // BReak PointS
        //.......................................................................................................
        /* Find BReak PointS: */
        brps.push({
          adi: 0,
          br: 'start',
          x: 0
        });
        for (adi = i = 0, len = ads.length; i < len; adi = ++i) {
          ad = ads[adi];
          if (ad.br == null) {
            continue;
          }
          brps.push({
            adi,
            br: ad.br,
            x: ad.x
          });
        }
        last_adi = ads.length - 1;
        brps.push({
          adi: last_adi,
          br: 'end',
          x: ads[last_adi].x
        });
        //.......................................................................................................
        brpi = -1; // index to BRP
        last_brpi = brps.length - 1;
        brpi1 = 0; // index to left-hand BRP
        brpi2 = null; // index to right-hand BRP
        adi1 = null; // index to left-hand AD
        adi2 = null; // index to right-hand AD
        dx0 = 0; // extraneous width (b/c paragraph was set in single long line)
        while (true) {
          //.......................................................................................................
          brpi++;
          if (brpi > last_brpi) {
            break;
          }
          brp = brps[brpi];
          corrected_x = brp.x - dx0;
          if (!(corrected_x > width_u)) {
            /* TAINT use tolerance to allow line break when line is just a bit too long */
            continue;
          }
          brpi2 = brpi - 1/* TAINT may be < 0 when first word too long */
          adi1 = (adi2 != null ? adi2 : brps[brpi1].adi - 1) + 1;
          adi2 = brps[brpi2].adi;
          lines.push({adi1, adi2, dx0});
          brpi1 = brpi;
          dx0 = ads[adi2 + 1].x;
        }
        //.......................................................................................................
        if (adi2 < last_adi) {
          dx0 = ads[adi2 + 1].x;
          brpi1 = brpi2 + 1;
          brpi2 = last_brpi;
          adi1 = adi2 + 1;
          adi2 = last_adi;
          lines.push({adi1, adi2, dx0});
        }
        //.......................................................................................................
        lnr = 0;
        rnr = lines.length + 1;
        for (j = 0, len1 = lines.length; j < len1; j++) {
          line = lines[j];
          lnr++;
          line.lnr = lnr;
          rnr--;
          line.rnr = rnr;
          // continue unless ads[ line.adi2 ].br is 'shy'
          /* TAINT consider to always use visible hyphen but hide it in CSS */
          /* TAINT not the way to do this */
          // ads[ line.adi2 ].sid = 'o14eg8i'
          debug('^94509^', line);
        }
        //.......................................................................................................
        return R;
      }

    };
  };

}).call(this);

//# sourceMappingURL=outlines-mixin.js.map