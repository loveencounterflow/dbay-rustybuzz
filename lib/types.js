(function() {
  'use strict';
  var CND, Intertype, alert, badge, dbay_types, debug, help, info, intertype, jr, rpr, urge, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DBAY-RUSTYBUZZ';

  debug = CND.get_logger('debug', badge);

  alert = CND.get_logger('alert', badge);

  whisper = CND.get_logger('whisper', badge);

  warn = CND.get_logger('warn', badge);

  help = CND.get_logger('help', badge);

  urge = CND.get_logger('urge', badge);

  info = CND.get_logger('info', badge);

  jr = JSON.stringify;

  Intertype = (require('intertype')).Intertype;

  intertype = new Intertype(module.exports);

  dbay_types = require('dbay/lib/types');

  //-----------------------------------------------------------------------------------------------------------
  this.declare('constructor_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.prefix": function(x) {
        return this.isa.nonempty_text(x.prefix);
      },
      "@isa_optional.nonempty_text x.path": function(x) {
        return this.isa_optional.nonempty_text(x.path);
      },
      "dbay_types.dbay_schema x.schema": function(x) {
        return dbay_types.isa.dbay_schema(x.schema);
      },
      "@isa.boolean x.rebuild": function(x) {
        return this.isa.boolean(x.rebuild);
      },
      "( @isa.object x.db ) or ( @isa.function x.db ": function(x) {
        return (this.isa.object(x.db)) || (this.isa.function(x.db));
      },
      "@isa_optional.object x.RBW": function(x) {
        return this.isa_optional.object(x.RBW);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dbr_register_fontnick_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.fontnick": function(x) {
        return this.isa.nonempty_text(x.fontnick);
      },
      "@isa.nonempty_text x.fspath": function(x) {
        return this.isa.nonempty_text(x.fspath);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dbr_prepare_font_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.fontnick": function(x) {
        return this.isa.nonempty_text(x.fontnick);
      },
      "@isa_optional.nonempty_text x.fspath": function(x) {
        return this.isa_optional.nonempty_text(x.fspath);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dbr_get_single_outline_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "exactly one of x.sid or ( x.fontnick, x.gid ) is set": function(x) {
        if (x.sid != null) {
          if ((x.fontnick != null) || (x.gid != null)) {
            return false;
          }
          return this.isa.nonempty_text(x.sid);
        }
        if (!((x.fontnick != null) && (x.gid != null))) {
          return false;
        }
        if (!this.isa.nonempty_text(x.fontnick)) {
          return false;
        }
        return this.isa.cardinal(x.gid);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dbr_shape_text_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.fontnick": function(x) {
        return this.isa.nonempty_text(x.fontnick);
      },
      "@isa.text x.text": function(x) {
        return this.isa.text(x.text);
      }
    }
  });

  // "( @isa.float x.size_mm ) and ( 0 <= x.size_mm <= 1000 )": ( x ) -> ( @isa.float x.size_mm ) and ( 0 <= x.size_mm <= 1000 )

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dbr_get_font_metrics_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.fontnick": function(x) {
        return this.isa.nonempty_text(x.fontnick);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dbr_chrs', function(x) {
    return (this.isa.text(x)) || (this.isa.list(x));
  });

  //-----------------------------------------------------------------------------------------------------------
  this./* list of texts, really */declare('dbr_get_cgid_map_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.fontnick": function(x) {
        return this.isa.nonempty_text(x.fontnick);
      },
      "exactly one of ( x.chrs, x.cgid_map, x.xads ) is set": function(x) {
        if (x.chrs != null) {
          if (!this.isa.dbr_chrs(x.chrs)) {
            return false;
          }
          return (x.cgid_map == null) && (x.xads == null);
        }
        if (x.cgid_map != null) {
          return this.isa.map(x.cgid_map);
        }
        return this.isa.list(x.xads);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dbr_insert_outlines_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.fontnick": function(x) {
        return this.isa.nonempty_text(x.fontnick);
      },
      "exactly one of ( x.chrs, x.cgid_map, x.xads ) is set": function(x) {
        if (x.chrs != null) {
          if (!this.isa.dbr_chrs(x.chrs)) {
            return false;
          }
          return (x.cgid_map == null) && (x.xads == null);
          return x.cgid_map == null;
        }
        if (x.cgid_map != null) {
          return this.isa.map(x.cgid_map);
        }
        return this.isa.list(x.xads);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dbr_compose_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.fontnick": function(x) {
        return this.isa.nonempty_text(x.fontnick);
      },
      "@isa.text x.text": function(x) {
        return this.isa.text(x.text);
      },
      "@isa_optional.object x.known_ods": function(x) {
        return this.isa_optional.object(x.known_ods);
      }
    }
  });

}).call(this);

//# sourceMappingURL=types.js.map