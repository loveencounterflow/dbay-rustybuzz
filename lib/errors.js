(function() {
  'use strict';
  var CND, E, badge, debug, rpr;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DBR/ERRORS';

  debug = CND.get_logger('debug', badge);

  // warn                      = CND.get_logger 'warn',      badge
  // info                      = CND.get_logger 'info',      badge
  // urge                      = CND.get_logger 'urge',      badge
  // help                      = CND.get_logger 'help',      badge
  // whisper                   = CND.get_logger 'whisper',   badge
  // echo                      = CND.echo.bind CND
  E = require('dbay/lib/errors');

  //===========================================================================================================
  // class @Dbr_not_implemented extends E.Dbay_error
  this.Dbr_not_implemented = class Dbr_not_implemented extends E.DBay_not_implemented {};

  this.Dbr_internal_error = class Dbr_internal_error extends E.DBay_internal_error {};

  //-----------------------------------------------------------------------------------------------------------
  this.Dbr_font_capacity_exceeded = class Dbr_font_capacity_exceeded extends E.DBay_error {
    constructor(ref, max_font_count) {
      super(ref, `can only load up to ${max_font_count} fonts`);
    }

  };

  this.Dbr_unknown_or_unprepared_fontnick = class Dbr_unknown_or_unprepared_fontnick extends E.DBay_error {
    constructor(ref, fontnick) {
      super(ref, `unknown or unprepared fontnick ${rpr(fontnick)}`);
    }

  };

  this.Dbr_value_error = class Dbr_value_error extends E.DBay_error {
    constructor(ref, name, value, description) {
      super(ref, `${rpr(name)}: ${rpr(value)} caused an error: ${description}`);
    }

  };

}).call(this);

//# sourceMappingURL=errors.js.map