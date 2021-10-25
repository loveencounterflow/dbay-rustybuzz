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
      "@isa.boolean x.create": function(x) {
        return this.isa.boolean(x.create);
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
      "@isa.nonempty_text x.fontnick": function(x) {
        return this.isa.nonempty_text(x.fontnick);
      },
      "@isa.cardinal x.gid": function(x) {
        return this.isa.cardinal(x.gid);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dbr_get_cgid_map_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.fontnick": function(x) {
        return this.isa.nonempty_text(x.fontnick);
      },
      "exactly one of x.text, x.cids, x.cgid_map is set": function(x) {
        if (x.text != null) {
          if (!this.isa.text(x.text)) {
            return false;
          }
          return (x.cids == null) && (x.cgid_map == null);
        }
        if (x.cids != null) {
          if (!this.isa.list(x.cids)) {
            return false;
          }
          return (x.text == null) && (x.cgid_map == null);
        }
        return false;
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
      "exactly one of x.text, x.cids, x.cgid_map is set": function(x) {
        if (x.text != null) {
          if (!this.isa.text(x.text)) {
            return false;
          }
          return (x.cids == null) && (x.cgid_map == null);
        }
        if (x.cids != null) {
          if (!this.isa.list(x.cids)) {
            return false;
          }
          return (x.text == null) && (x.cgid_map == null);
        }
        if (x.cgid_map != null) {
          if (!this.isa.map(x.cgid_map)) {
            return false;
          }
          return (x.text == null) && (x.cids == null);
        }
        return false;
      }
    }
  });

}).call(this);

//# sourceMappingURL=types.js.map