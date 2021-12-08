(function() {
  'use strict';
  var CND, E, SQL, badge, debug, echo, guy, help, info, isa, rpr, specials, type_of, types, urge, validate, validate_list_of, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DBAY-RUSTYBUZZ/_SPECIALS';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  types = require('./types');

  ({isa, type_of, validate, validate_list_of} = types.export());

  E = require('./errors');

  SQL = String.raw;

  guy = require('guy');

  //===========================================================================================================
  // SPECIALS
  //-----------------------------------------------------------------------------------------------------------
  module.exports = specials = {
    by_gid: {},
    by_name: {
      ignored: {
        chrs: '',
        gid: -1
      },
      spc: {
        chrs: '\u{0020}', // soft space
        symbolic: '␣', // U+2423 Open Box
        gid: -2
      },
      wbr: {
        chrs: '\u{200b}', // word break opportunity (as in `foo/bar` with a WBR after the slash)
        gid: -3
      },
      shy: {
        chrs: '\u{00ad}', // soft hyphen
        gid: -4
      },
      hhy: {
        chrs: '\u{002d}', // hard hyphen
        gid: -5
      },
      nl: {
        chrs: '\n', // manual line break
        symbolic: '⏎', // U+23ce Return Symbol
        gid: -6
      },
      missing: {
        chrs: '',
        gid: 0
      }
    }
  };

  (() => {    //-----------------------------------------------------------------------------------------------------------
    var d, entry, name, ref, seen;
    //.........................................................................................................
    seen = {
      chrs: {},
      symbolic: {}
    };
    ref = specials.by_name;
    //.........................................................................................................
    for (name in ref) {
      d = ref[name];
      d.name = name;
      d.bytecount = Buffer.byteLength(d.chrs);
      //.......................................................................................................
      if ((entry = specials.by_gid[d.gid]) != null) {
        throw new E.Dbr_internal_error('^dbr/main@1^', `GID ${d.gid} already in use for ${rpr(entry)}, can't re-use for ${rpr(d)}`);
      }
      if (d.chrs == null) {
        d.chrs = '';
      }
      if (d.symbolic == null) {
        d.symbolic = null;
      }
      //.......................................................................................................
      if (d.chrs.length > 1) {
        if ((entry = seen.chrs[d.chrs]) != null) {
          throw new E.Dbr_internal_error('^dbr/main@1^', `chrs ${rpr(d.chrs)} already in use for ${rpr(entry)}, can't re-use for ${rpr(d)}`);
        }
        seen.chrs[d.chrs] = d;
      }
      //.......................................................................................................
      if (d.symbolic != null) {
        if ((entry = seen.symbolic[d.symbolic]) != null) {
          throw new E.Dbr_internal_error('^dbr/main@1^', `symbolic ${rpr(d.symbolic)} already in use for ${rpr(entry)}, can't re-use for ${rpr(d)}`);
        }
        seen.symbolic[d.symbolic] = d;
      }
      //.......................................................................................................
      specials.by_gid[d.gid] = d;
    }
    //.........................................................................................................
    return null;
  })();

}).call(this);

//# sourceMappingURL=_specials.js.map