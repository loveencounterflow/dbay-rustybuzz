(function() {
  'use strict';
  var CND, E, SQL, badge, debug, echo, guy, help, info, rpr, urge, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DRB/MIXIN/DISTRIBUTION';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  guy = require('guy');

  E = require('./errors');

  SQL = String.raw;

  //-----------------------------------------------------------------------------------------------------------
  this.Drb_distribution = (clasz = Object) => {
    return class extends clasz {
      // #---------------------------------------------------------------------------------------------------------
      // constructor: ->
      //   super()
      //   guy.props.hide @, 'state', {} unless @state?
      //   @state.prv_fontidx            = -1
      //   @state.font_idx_by_fontnicks  = {}
      //   #.........................................................................................................
      //   return undefined

        //-----------------------------------------------------------------------------------------------------------
      distribute(cfg) {
        var R, ad, adi, adi1, adi2, ads, brp, brpi, brpi1, brpi2, brps, corrected_x, dx0, i, j, last_adi, last_brpi, len, len1, line, lines, lnr, mm_p_u, rnr, width_mm, width_u;
        ({ads, mm_p_u, width_mm} = cfg);
        lines = [];
        R = {lines};
        width_u = width_mm / mm_p_u; // line width in glyf design unites (1000 per em)
        brps = []; // BReak PointS
        //.......................................................................................................
        /* Find BReak PointS: */
        brps.push({
          adi: 0,
          br: 'start',
          x: 0
        });
        for (adi = i = 0, len = ads.length; i < len; adi = ++i) {
          ad = ads[adi];
          if (ad.br == null) {
            continue;
          }
          brps.push({
            adi,
            br: ad.br,
            x: ad.x
          });
        }
        last_adi = ads.length - 1;
        brps.push({
          adi: last_adi,
          br: 'end',
          x: ads[last_adi].x
        });
        //.......................................................................................................
        brpi = -1; // index to BRP
        last_brpi = brps.length - 1;
        brpi1 = 0; // index to left-hand BRP
        brpi2 = null; // index to right-hand BRP
        adi1 = null; // index to left-hand AD
        adi2 = null; // index to right-hand AD
        dx0 = 0; // extraneous width (b/c paragraph was set in single long line)
        while (true) {
          //.......................................................................................................
          brpi++;
          if (brpi > last_brpi) {
            break;
          }
          brp = brps[brpi];
          corrected_x = brp.x - dx0;
          if (!(corrected_x > width_u)) {
            /* TAINT use tolerance to allow line break when line is just a bit too long */
            continue;
          }
          brpi2 = brpi - 1/* TAINT may be < 0 when first word too long */
          adi1 = (adi2 != null ? adi2 : brps[brpi1].adi - 1) + 1;
          adi2 = brps[brpi2].adi;
          lines.push({adi1, adi2, dx0});
          brpi1 = brpi;
          dx0 = ads[adi2 + 1].x;
        }
        //.......................................................................................................
        if (adi2 < last_adi) {
          dx0 = ads[adi2 + 1].x;
          brpi1 = brpi2 + 1;
          brpi2 = last_brpi;
          adi1 = adi2 + 1;
          adi2 = last_adi;
          lines.push({adi1, adi2, dx0});
        }
        //.......................................................................................................
        lnr = 0;
        rnr = lines.length + 1;
        for (j = 0, len1 = lines.length; j < len1; j++) {
          line = lines[j];
          lnr++;
          line.lnr = lnr;
          rnr--;
          line.rnr = rnr;
          // continue unless ads[ line.adi2 ].br is 'shy'
          /* TAINT consider to always use visible hyphen but hide it in CSS */
          /* TAINT not the way to do this */
          // ads[ line.adi2 ].sid = 'o14eg8i'
          debug('^94509^', line);
        }
        //.......................................................................................................
        return R;
      }

    };
  };

}).call(this);

//# sourceMappingURL=distribution-mixin.js.map