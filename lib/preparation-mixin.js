(function() {
  'use strict';
  var CND, E, FS, PATH, SQL, badge, debug, echo, guy, help, info, jp, jr, rpr, urge, warn, whisper;

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
        var error, font_bytes, font_idx, fontnick, fspath;
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
        this._add_fontmetrics(fontnick, font_idx);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _add_fontmetrics(fontnick, font_idx) {
        var fm;
        fm = JSON.parse(this.RBW.get_font_metrics(font_idx));
        fm.fontnick = fontnick;
        this.db(this.sql.insert_fontmetric, fm);
        return null;
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

    };
  };

}).call(this);

//# sourceMappingURL=preparation-mixin.js.map