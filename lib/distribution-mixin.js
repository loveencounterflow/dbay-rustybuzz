(function() {
  'use strict';
  var CND, E, SQL, badge, debug, echo, guy, help, info, jp, jr, rpr, urge, warn, whisper;

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

  jr = JSON.stringify;

  jp = JSON.parse;

  //-----------------------------------------------------------------------------------------------------------
  this.Drb_distribution = (clasz = Object) => {
    return class extends clasz {
      //---------------------------------------------------------------------------------------------------------
      constructor() {
        super();
        if (this._v == null) {
          this._v = {};
        }
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _$distribution_initialize() {
        var prefix, schema;
        ({schema, prefix} = this.cfg);
        //.......................................................................................................
        this.db.create_function({
          name: prefix + 'get_deviation',
          deterministic: false,
          call: (x1) => {
            /* Essentiall distance of any point in the text from the end of the current line *relative to
                 type size and scaled such that 1em = 1000u. Most favorable break points are the ones closest to
                 zero. */
            var R;
            R = Math.round((x1 - this._v.dx0 - this._v.width_u) / this._v.size_u * 1000);
            if (R > 0/* penalty for lines that are too long */) {
              R *= 2;
            }
            return R;
          }
        });
        //.......................................................................................................
        this.db.create_function({
          name: prefix + 'vnr_pick',
          deterministic: true,
          call: (vnr, nr) => {
            return (jp(vnr))[nr - 1];
          }
        });
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      distribute(cfg) {
        return this._distribute_with_db(cfg);
      }

      // distribute: ( cfg ) -> @_distribute_v1 cfg

        //---------------------------------------------------------------------------------------------------------
      _distribute_with_db(cfg) {
        /* TAINT make this a view 'lbo_shortlist' or similar */
        var R, _, adi_1, adi_2, ads, brp_1, brp_2, count, doc, lines, par, prefix, schema, vnr_1, vnr_2, vrt_1, vrt_2;
        ({ads} = cfg);
        ({schema, prefix} = this.cfg);
        //.......................................................................................................
        this._v.mm_p_u = cfg.mm_p_u;
        this._v.width_mm = cfg.width_mm;
        this._v.width_u = cfg.width_mm / cfg.mm_p_u; // line width in glyf design unites (1000 per em)
        this._v.size_mm = cfg.size_mm; // nominal type size (1em)
        this._v.size_u = cfg.size_mm / cfg.mm_p_u;
        this._v.adi0 = 0; // index of AD that represents current line start
        this._v.dx0 = 0; // extraneous width (b/c paragraph was set in single long line)
        //.......................................................................................................
        console.table(this.db.all_rows(SQL`select doc, par, adi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, sgi, nobr, br, lnr from ${schema}.ads order by vnr_blob;`));
        // console.table @db.all_rows SQL"select doc, par, adi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, sgi, nobr, br, deviation from #{schema}.brps where br = 'shy' order by vnr_blob;"
        // console.table @db.all_rows SQL"select * from #{schema}.brps order by vnr_blob;"
        //.......................................................................................................
        this._v.dx0 = 0;
        brp_2 = this.db.single_row(SQL`select doc, par, adi, vrt, vnr, gid, b, x, y, dx, dy, x1, chrs, sid, sgi, nobr, br, deviation from ${schema}.brps order by vnr_blob limit 1;`);
        console.table([brp_2]);
        brp_2.vnr = jp(brp_2.vnr);
        brp_1 = null;
        lines = [];
        R = {lines};
        count = -1;
        while (true) {
          count++;
          if (count > 100) {
            warn("infinite loop");
            process.exit(119);
          }
          if (brp_2.br === 'end') {
            break;
          }
          brp_1 = brp_2;
          brp_2 = this.db.single_row(SQL`select
    doc, par, adi, vrt, vnr, gid, b, x, y, dx, dy, x1, chrs, sid, sgi, nobr, br, deviation
  from ${schema}.brps
  where br != 'shy' -- A SHY is never a valid line break, the corresponding HHY is
  order by abs( deviation )
  limit 1;`);
          //.....................................................................................................
          console.table(this.db.all_rows(SQL`select
    doc, par, adi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, sgi, nobr, br, lnr, deviation
  from ${schema}.brps
  where br != 'shy' -- A SHY is never a valid line break, the corresponding HHY is
  order by abs( deviation )
  limit 5;`));
          //.....................................................................................................
          brp_2.vnr = jp(brp_2.vnr);
          vnr_1 = brp_1.vnr; // or use `select from ads`?
          /* NOTE move from breakpoint to material */
          /* TAINT doesn't honor multiple consecutive breakpoints */
          vnr_1[2]++;
          vnr_2 = brp_2.vnr;
          [doc, par, adi_1, vrt_1] = vnr_1;
          [_, _, adi_2, vrt_2] = vnr_2;
          //.....................................................................................................
          /* TAINT use `stamped` boolean column to select variant */
          info('^4476^', rpr(this._text_from_adis({
            schema,
            doc,
            par,
            adi_1,
            adi_2,
            vrt: 1
          })));
          //.....................................................................................................
          lines.push({
            doc,
            par,
            adi_1,
            adi_2,
            vrt_1,
            vrt_2,
            vnr_1,
            vnr_2,
            dx0: this._v.dx0
          });
          this._v.dx0 = brp_2.x1;
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _text_from_adis(cfg) {
        var R, ad, ad_2, adi_1, adi_2, ads, doc, par, schema, vrt;
        ({schema, doc, par, adi_1, adi_2, vrt} = cfg);
        ads = this.db.all_rows(SQL`select
    *
  from ${schema}.ads
  where true
    and doc = $doc
    and par = $par
    and adi between $adi_1 and $adi_2
    and vrt = $vrt
  order by vnr_blob;`, {doc, par, adi_1, adi_2, vrt});
        ad_2 = ads[ads.length - 1];
        R = ((function() {
          var i, len, results;
          results = [];
          for (i = 0, len = ads.length; i < len; i++) {
            ad = ads[i];
            results.push(ad.chrs);
          }
          return results;
        })()).join('');
        if (ad_2.br === 'shy') {
          R += '-';
        }
        return R;
      }

    };
  };

}).call(this);

//# sourceMappingURL=distribution-mixin.js.map