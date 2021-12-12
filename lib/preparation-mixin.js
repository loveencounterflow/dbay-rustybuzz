(function() {
  'use strict';
  var CND, E, FS, PATH, SQL, badge, cleanup_svg, debug, echo, guy, help, info, jp, jr, rpr, urge, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DRB/MIXIN/PREPARATION';

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

  SQL = String.raw;

  jr = JSON.stringify;

  jp = JSON.parse;

  //-----------------------------------------------------------------------------------------------------------
  this.Drb_preparation = (clasz = Object) => {
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
      // _$preparation_initialize: ->

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
          throw new E.Dbr_unknown_or_unprepared_fontnick('^dbr/preparation@1^', fontnick);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      prepare_font(cfg) {
        var error, fm, font_bytes, font_idx, fontnick, fspath;
        clasz = this.constructor;
        if (!(this.state.prv_fontidx < clasz.C.last_fontidx)) {
          throw new E.Dbr_font_capacity_exceeded('^dbr/preparation@2^', clasz.C.last_fontidx + 1);
        }
        //.........................................................................................................
        this.types.validate.dbr_prepare_font_cfg((cfg = {...this.constructor.C.defaults.dbr_prepare_font_cfg, ...cfg}));
        ({fontnick, fspath} = cfg);
        if (fspath != null) {
          //.........................................................................................................
          throw new E.Dbr_not_implemented('^dbr/preparation@3^', "setting fspath");
        }
        if (this.state.font_idx_by_fontnicks[fontnick] != null) {
          return null;
        }
        try {
          //.........................................................................................................
          fspath = this._fspath_from_fontnick(fontnick);
        } catch (error1) {
          error = error1;
          if ((this.types.type_of(error)) === 'dbay_expected_single_row') {
            throw new E.Dbr_unknown_or_unprepared_fontnick('^dbr/preparation@4^', fontnick);
          }
          throw error;
        }
        font_idx = (this.state.prv_fontidx += 1);
        font_bytes = this._get_font_bytes(fspath);
        this.RBW.register_font(font_idx, font_bytes);
        this.state.font_idx_by_fontnicks[fontnick] = font_idx;
        fm = this._add_fontmetrics(fontnick, font_idx);
        this._add_special_glyfs(fontnick, font_idx, fm);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _add_fontmetrics(fontnick, font_idx) {
        var fm;
        fm = JSON.parse(this.RBW.get_font_metrics(font_idx));
        fm.fontnick = fontnick;
        this.db(this.sql.insert_fontmetric, fm);
        return fm;
      }

      //---------------------------------------------------------------------------------------------------------
      get_fontmetrics(cfg) {
        var error, fontnick;
        this.types.validate.dbr_get_fontmetrics_cfg((cfg = {...this.constructor.C.defaults.dbr_get_fontmetrics_cfg, ...cfg}));
        ({fontnick} = cfg);
        try {
          return this.db.single_row(SQL`select * from ${this.cfg.schema}.fontmetrics where fontnick = $fontnick;`, {fontnick});
        } catch (error1) {
          error = error1;
          if ((this.types.type_of(error)) === 'dbay_expected_single_row') {
            throw new E.Dbr_unknown_or_unprepared_fontnick('^dbr/preparation@5^', fontnick);
          }
          throw error;
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _add_special_glyfs(fontnick, font_idx, fm) {
        /* TAINT should adapt & use `@insert_outlines()` */
        /* TAINT must rename fields x, y, y1, y1 in tables ads, outlines */
        var bottom, chrs, cr, cswdth, cx, cy, gd, gd_blob, gid, i, insert_outline, left, len, marker, olt, owdth, ref, right, row/* Glyf Data Blob */, special_key, specials, swdth, text_x, text_y, top, x1, x2, y1, y2;
        ({specials} = this.constructor.C);
        swdth = 0.5; // stroke width in mm
        // swdth        *= 1000 * size_mm * mm_p_u
        // swdth        *= 1000 * ( 10 ) * ( 10 / 1000 )
        swdth *= 100;
        owdth = 3 * swdth;
        top = fm.ascender + 0 * owdth;
        bottom = fm.descender - 0 * owdth;
        left = Math.round(owdth * 0.5);
        right = Math.round(1000 - owdth * 0.5);
        // sid           = @_get_sid fontnick, gid
        /* TAINT consider to use library (`cupofhtml`?) for this */
        x1 = 0;
        y1 = bottom;
        x2 = 0;
        y2 = top;
        text_x = x2 - 100;
        text_y = y2 + 75;
        olt = 'g';
        cx = x2;
        cy = y2;
        cr = 200;
        cswdth = swdth * 0.5;
        ref = ['ignored', 'wbr', 'shy'];
        // for special_key in [ 'ignored', 'wbr', 'shy', 'hhy', ]
        for (i = 0, len = ref.length; i < len; i++) {
          special_key = ref[i];
          gid = specials[special_key].gid;
          chrs = specials[special_key].chrs;
          marker = specials[special_key].marker;
          gd = cleanup_svg(`<g
  class         ='fontmetric ${special_key}'
  transform     ='skewX(${fm.angle})'
  >
<line
  x1            ='${x1}'
  y1            ='${y1}'
  x2            ='${x2}'
  y2            ='${y2}'
  />
<circle
  cx            = '${cx}'
  cy            = '${cy}'
  r             = '${cr}'
  />
<text
  x             ='${text_x}'
  y             ='${text_y}'
  >${marker}</text>
  </g>`);
          insert_outline = this.db.prepare(this.sql.insert_outline);
          gd_blob = this._zip(gd);
          row = this.db.first_row(insert_outline, {
            fontnick,
            gid,
            chrs,
            x: x1,
            y: y1,
            x1: x2,
            y1: y2,
            olt,
            gd_blob
          });
        }
        return null;
      }

    };
  };

  //-----------------------------------------------------------------------------------------------------------
  cleanup_svg = function(svg) {
    var R;
    R = svg;
    R = R.replace(/\n/g, '\x20');
    R = R.replace(/\x20{2,}/g, '\x20');
    R = R.replace(/\x20=\x20/g, '=');
    R = R.replace(/>\x20</g, '><');
    R = R.trim();
    R = R.replace(/\s+\/>$/, '/>');
    return R;
  };

}).call(this);

//# sourceMappingURL=preparation-mixin.js.map