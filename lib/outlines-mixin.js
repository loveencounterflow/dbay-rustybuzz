(function() {
  'use strict';
  var CND, E, FS, PATH, _TO_BE_REMOVED_bbox_pattern, badge, debug, echo, guy, help, info, rpr, urge, warn, whisper;

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

  _TO_BE_REMOVED_bbox_pattern = /^<rect x="(?<x>[-+0-9]+)" y="(?<y>[-+0-9]+)" width="(?<width>[-+0-9]+)" height="(?<height>[-+0-9]+)"\/>$/;

  //-----------------------------------------------------------------------------------------------------------
  this.Drb_outlines = (clasz = Object) => {
    return class extends clasz {
      //---------------------------------------------------------------------------------------------------------
      constructor() {
        super();
        if (this.state == null) {
          guy.props.def(this, 'state', {
            enumerable: false,
            value: {}
          });
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
        return this.db.single_value(this.sql.fspath_from_fontnick, {fontnick});
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
        var br, font_idx, fontnick, gid, height, match, parameters, pd, width, x, y;
        clasz = this.constructor;
        if (!(this.state.prv_fontidx < clasz.C.last_fontidx)) {
          throw new E.Dbr_font_capacity_exceeded('^dbr/outlines@1^', clasz.C.last_fontidx + 1);
        }
        //.........................................................................................................
        this.types.validate.dbr_get_single_outline_cfg((cfg = {...this.constructor.C.defaults.dbr_get_single_outline_cfg, ...cfg}));
        ({fontnick, gid} = cfg);
        if ((font_idx = this.state.font_idx_by_fontnicks[fontnick]) == null) {
          throw new E.Dbr_unknown_fontnick('^dbr/outlines@1^', fontnick);
        }
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
        return {
          bbox: {x, y, width, height},
          pd
        };
      }

    };
  };

}).call(this);

//# sourceMappingURL=outlines-mixin.js.map