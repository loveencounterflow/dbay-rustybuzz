(function() {
  'use strict';
  var CND, E, HYPH, ZLIB, badge, debug, echo, guy, help, info, jp, jr, rpr, to_width, urge, warn, whisper, width_of;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DRB/MIXIN/SUNDRY';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  guy = require('guy');

  E = require('./errors');

  ZLIB = require('zlib');

  ({width_of, to_width} = require('to-width'));

  jr = JSON.stringify;

  jp = JSON.parse;

  HYPH = require('intertext/lib/hyphenation');

  //-----------------------------------------------------------------------------------------------------------
  this.Drb_sundry = (clasz = Object) => {
    return class extends clasz {
      // #---------------------------------------------------------------------------------------------------------
      // constructor: ->
      //   super()
      //   return undefined

        //---------------------------------------------------------------------------------------------------------
      // _$sundry_initialize: ->

        //---------------------------------------------------------------------------------------------------------
      prepare_text(cfg) {
        var R, chomp, entities, hyphenate, ncrs, newlines, trim, uax14;
        this.types.validate.dbr_prepare_text_cfg((cfg = {...this.constructor.C.defaults.dbr_prepare_text_cfg, ...cfg}));
        ({
          text: R,
          entities,
          ncrs,
          hyphenate,
          newlines,
          uax14,
          trim,
          chomp
        } = cfg);
        if (entities) {
          R = this._decode_entities(R, ncrs);
        }
        if (hyphenate) {
          R = this._hyphenate(R);
        }
        if (newlines) {
          R = R.replace(/\n+/g, '\x20');
        }
        if (uax14) {
          R = this._uax14(R);
        }
        if (chomp) {
          R = R.replace(/^\n+$/, '');
        }
        if (trim) {
          R = R.replace(/^\x20*(.*?)\x20*$/, '$1');
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      decode_entities(cfg) {
        /* */
        this.types.validate.dbr_decode_entities_cfg((cfg = {...this.constructor.C.defaults.dbr_decode_entities_cfg, ...cfg}));
        return this._decode_entities(cfg.text, cfg.ncrs);
      }

      //---------------------------------------------------------------------------------------------------------
      _decode_entities(text, ncrs) {
        var R;
        R = text;
        if (ncrs) {
          R = this.RBW.decode_ncrs(R);
        } else {
          R = R.replace(/&shy;/g, this.constructor.C.special_chrs.shy);
        }
        return R.replace(/&wbr;/g, this.constructor.C.special_chrs.wbr);
      }

      //---------------------------------------------------------------------------------------------------------
      _uax14(text) {
        /* remove WBR after SHY, SPC? */
        /* TAINT precompile patterns, always use constants instead of literals */
        var R, bri, bris, idx, parts, text_bfr;
        text_bfr = Buffer.from(text);
        bris = JSON.parse(this.RBW.find_line_break_positions(text));
        parts = (function() {
          var i, len, ref, results;
          results = [];
          for (idx = i = 0, len = bris.length; i < len; idx = ++i) {
            bri = bris[idx];
            results.push(text_bfr.slice(bri, (ref = bris[idx + 1]) != null ? ref : 2e308).toString('utf-8'));
          }
          return results;
        })();
        R = parts.join(this.constructor.C.special_chrs.wbr);
        R = R.replace(/\xad\u200b/g, this.constructor.C.special_chrs.shy);
        R = R.replace(/\x20\u200b/g, '\x20');
        R = R.replace(/\u200b{2,}/g, this.constructor.C.special_chrs.wbr);
        R = R.replace(/\u200b$/g, '');
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _hyphenate(text) {
        return HYPH.hyphenate(text);
      }

    };
  };

}).call(this);

//# sourceMappingURL=sundry-mixin.js.map