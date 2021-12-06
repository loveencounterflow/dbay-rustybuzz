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
  this.declare('dbr_gid', function(x) {
    return (this.isa.integer(x)) && (x >= -2);
  });

  //-----------------------------------------------------------------------------------------------------------
  this./* TAINT link with `Dbr.C` */declare('dbr_get_single_outline_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "exactly one of x.sid or ( x.fontnick, x.gid ) is set": function(x) {
        /* TAINT when any of the `isa` tests fails, error message is not to the point */
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
        return this.isa.dbr_gid(x.gid);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dbr_arrange_cfg', {
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
      "@isa.integer x.doc": function(x) {
        return this.isa.integer(x.doc);
      },
      "@isa.integer x.par": function(x) {
        return this.isa.integer(x.par);
      },
      "@isa.integer x.alt": function(x) {
        return this.isa.integer(x.alt);
      }
    }
  });

  // "( @isa.float x.size_mm ) and ( 0 <= x.size_mm <= 1000 )": ( x ) -> ( @isa.float x.size_mm ) and ( 0 <= x.size_mm <= 1000 )

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dbr_get_fontmetrics_cfg', {
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
      "exactly one of ( x.chrs, x.cgid_map, x.ads ) is set": function(x) {
        if (x.chrs != null) {
          if (!this.isa.dbr_chrs(x.chrs)) {
            return false;
          }
          return (x.cgid_map == null) && (x.ads == null);
        }
        if (x.cgid_map != null) {
          return this.isa.map(x.cgid_map);
        }
        return this.isa.list(x.ads);
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
      "exactly one of ( x.chrs, x.cgid_map, x.ads ) is set": function(x) {
        if (x.chrs != null) {
          if (!this.isa.dbr_chrs(x.chrs)) {
            return false;
          }
          return (x.cgid_map == null) && (x.ads == null);
          return x.cgid_map == null;
        }
        if (x.cgid_map != null) {
          return this.isa.map(x.cgid_map);
        }
        return this.isa.list(x.ads);
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
      "@isa.integer x.doc": function(x) {
        return this.isa.integer(x.doc);
      },
      "@isa.integer x.par": function(x) {
        return this.isa.integer(x.par);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dbr_prepare_text_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.text x.text": function(x) {
        return this.isa.text(x.text);
      },
      "@isa.boolean x.entities": function(x) {
        return this.isa.boolean(x.entities);
      },
      "@isa.boolean x.hyphenate": function(x) {
        return this.isa.boolean(x.hyphenate);
      },
      "@isa.boolean x.newlines": function(x) {
        return this.isa.boolean(x.newlines);
      },
      "@isa.boolean x.uax14": function(x) {
        return this.isa.boolean(x.uax14);
      },
      "@isa.boolean x.trim": function(x) {
        return this.isa.boolean(x.trim);
      },
      "@isa.boolean x.chomp": function(x) {
        return this.isa.boolean(x.chomp);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dbr_render_ad_chain_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "x.format in [ 'compact', ]": function(x) {
        var ref;
        return (ref = x.format) === 'compact';
      },
      "@isa.integer x.doc": function(x) {
        return this.isa.integer(x.doc);
      },
      "@isa.integer x.par": function(x) {
        return this.isa.integer(x.par);
      },
      "@isa.integer x.b": function(x) {
        return this.isa.integer(x.b);
      },
      "@isa.cardinal x.context": function(x) {
        return this.isa.cardinal(x.context);
      }
    }
  });

}).call(this);

//# sourceMappingURL=types.js.map