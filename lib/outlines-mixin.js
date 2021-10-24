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
          throw new E.Dbr_unknown_fontnick('^dbr/outlines@1^', fontnick);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      load_font(cfg) {
        var font_bytes, font_idx, fontnick, fspath;
        clasz = this.constructor;
        if (!(this.state.prv_fontidx < clasz.C.last_fontidx)) {
          throw new E.Dbr_font_capacity_exceeded('^dbr/outlines@1^', clasz.C.last_fontidx + 1);
        }
        //.........................................................................................................
        this.types.validate.dbr_load_font_cfg((cfg = {...this.constructor.C.defaults.dbr_load_font_cfg, ...cfg}));
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
      get_single_outline(cfg) {
        var br, font_idx, fontnick, gid, height, match, parameters, pd, width, x, x1, y, y1;
        /* TAINT this method is highly inefficient for large numbers of outline retrievals; the intention is to
           replace it with a function that allows for lists of `gid`s to be handled with a single call. */
        //.........................................................................................................
        this.types.validate.dbr_get_single_outline_cfg((cfg = {...this.constructor.C.defaults.dbr_get_single_outline_cfg, ...cfg}));
        ({fontnick, gid} = cfg);
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
      gids_from_cids(cfg) {
        /* Given a list of Unicode CIDs as `cids` and a `fontnick`, return a `Map` from CIDs to GIDs
           (glyf IDs). Unmappable CIDs will be left out. */
        var R, cid, cids, font_idx, fontnick, gid, gids, i, idx, len, text;
        ({cids, fontnick} = cfg);
        font_idx = this._font_idx_from_fontnick(fontnick);
        text = (((function() {
          var i, len, results;
          results = [];
          for (i = 0, len = cids.length; i < len; i++) {
            cid = cids[i];
            results.push(String.fromCodePoint(cid));
          }
          return results;
        })()).join('\n')) + '\n';
        gids = this.RBW.shape_text({
          format: 'short',
          text,
          font_idx // formats: json, rusty, short
        });
        gids = gids.replace(/\|([0-9]+:)[^|]+\|[^|]+/g, '$1');
        gids = gids.slice(0, gids.length - 2);
        gids = gids.split(':');
        gids = (function() {
          var i, len, results;
          results = [];
          for (i = 0, len = gids.length; i < len; i++) {
            gid = gids[i];
            results.push(parseInt(gid));
          }
          return results;
        })();
        R = new Map();
        for (idx = i = 0, len = cids.length; i < len; idx = ++i) {
          cid = cids[idx];
          if ((gid = gids[idx]) === 0) {
            continue;
          }
          R.set(cid, gid);
        }
        return R;
      }

      //-----------------------------------------------------------------------------------------------------------
      _zip(txt) {
        return ZLIB.deflateRawSync(Buffer.from(txt), this.constructor.C.zlib_zip_cfg);
      }

      _unzip(bfr) {
        return ZLIB.inflateRawSync(bfr);
      }

      _prepare_insert_outline() {
        return this.db.prepare(this.sql.insert_outline);
      }

    };
  };

}).call(this);

//# sourceMappingURL=outlines-mixin.js.map