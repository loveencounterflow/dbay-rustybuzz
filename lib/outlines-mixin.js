(function() {
  'use strict';
  var CND, E, FS, PATH, ZLIB, _TO_BE_REMOVED_bbox_pattern, badge, debug, echo, guy, help, info, rpr, urge, warn, whisper;

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
        var R, chrs, font_idx, fontnick, i, len, sd, sds, text;
        /* Given a list of characters as `chrs` and a `fontnick`, return a `Map` from characters to GIDs
           (glyf IDs). Unmappable characters will be left out. */
        this.types.validate.dbr_get_cgid_map_cfg((cfg = {...this.constructor.C.defaults.dbr_get_cgid_map_cfg, ...cfg}));
        ({chrs, fontnick} = cfg);
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
      shape_text(cfg) {
        var R, ads, bytes, d, font_idx, fontnick, i, idx, len, nxt_b, ref, ref1, text;
        this.types.validate.dbr_shape_text_cfg((cfg = {...this.constructor.C.defaults.dbr_shape_text_cfg, ...cfg}));
        ({fontnick, text} = cfg);
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
        for (idx = i = 0, len = R.length; i < len; idx = ++i) {
          d = R[idx];
          nxt_b = (ref = (ref1 = R[idx + 1]) != null ? ref1.b : void 0) != null ? ref : 2e308;
          d.chrs = bytes.slice(d.b, nxt_b).toString();
          d.sid = `o${d.gid}${fontnick}`;
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
        var bbox, cgid_map, chrs, error, fontnick, gid, insert_outline, pd, pd_blob, x, x1, y, y1, z;
        /* Given a `cfg.fontnick` and a (list or map of) `cfg.cgid_map`, insert the outlines and bounding
           boxes of the referred glyfs. */
        /* TAINT validate */
        this.types.validate.dbr_insert_outlines_cfg((cfg = {...this.constructor.C.defaults.dbr_insert_outlines_cfg, ...cfg}));
        ({fontnick, chrs, cgid_map} = cfg);
        if (cgid_map == null) {
          cgid_map = this.get_cgid_map({fontnick, chrs});
        }
        insert_outline = this.db.prepare(this.sql.insert_outline);
        try {
          if (!this.db.within_transaction()) {
            //.......................................................................................................
            this.db.begin_transaction();
          }
          for (z of cgid_map) {
            [gid, chrs] = z;
            ({bbox, pd} = this.get_single_outline({gid, fontnick}));
            ({x, y, x1, y1} = bbox);
            pd_blob = this._zip(pd);
            yield this.db.first_row(insert_outline, {fontnick, gid, chrs, x, y, x1, y1, pd_blob});
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

    };
  };

}).call(this);

//# sourceMappingURL=outlines-mixin.js.map