(function() {
  'use strict';
  var CND, E, HYPH, SQL, ZLIB, badge, debug, echo, guy, help, info, jp, jr, rpr, to_width, urge, warn, whisper, width_of;

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

  SQL = String.raw;

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

      //=========================================================================================================
      // VISUALIZATION
      //---------------------------------------------------------------------------------------------------------
      render_ad_chain(cfg) {
        var ad, b, chrs, collector, context, doc, gid, h, id, line, par, ref, row, schema, width;
        this.types.validate.dbr_render_ad_chain_cfg((cfg = {...this.constructor.C.defaults.dbr_render_ad_chain_cfg, ...cfg}));
        //.......................................................................................................
        ({doc, par, b, context} = cfg);
        ({schema} = this.cfg);
        collector = [[], [], [], [], []];
        //.......................................................................................................
        row = this.db.first_row(SQL`select
    id
  from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( alt = 1 )
    and ( b1 between $b - 10 and $b + 10 )
  order by abs( b1 - $b ), id
  limit 1;`, {doc, par, b});
        if (row == null) {
          throw new E.Dbr_value_error('^Drb/sundry@1^', 'b', b, `no suitable row in table ${schema}.ads`);
        }
        ({id} = row);
        ref = this.db(SQL`select
    *
  from ads
  where true
    and ( alt = 1 )
    and ( id between $id - $context and $id + $context )
  order by b1;`, {id, context});
        //.......................................................................................................
        for (ad of ref) {
          ({gid, chrs} = ad);
          b = ad.b1.toString() + ' ';
          chrs = ad.chrs;
          chrs = chrs.replace('\xad', '¬');
          chrs = chrs.replace('\x20', '␣');
          gid = ad.gid.toString();
          width = Math.max(1, width_of(b), width_of(chrs), width_of(gid));
          b = to_width(b, width, {
            align: 'left'
          });
          chrs = to_width(chrs, width, {
            align: 'right'
          });
          gid = to_width(gid, width, {
            align: 'right'
          });
          h = '─'.repeat(width);
          collector[0].push(b + ' ');
          collector[1].push('┬' + h);
          collector[2].push('│' + chrs);
          collector[3].push('│' + gid);
          collector[4].push('┴' + h);
        }
        collector[0].push(' ');
        collector[1].push('┬');
        collector[2].push('│');
        collector[3].push('│');
        collector[4].push('┴');
        return ((function() {
          var i, len, results;
          results = [];
          for (i = 0, len = collector.length; i < len; i++) {
            line = collector[i];
            //.......................................................................................................
            results.push(to_width(line.join(''), 120, {
              align: 'left'
            }));
          }
          return results;
        })()).join('\n');
      }

    };
  };

}).call(this);

//# sourceMappingURL=sundry-mixin.js.map