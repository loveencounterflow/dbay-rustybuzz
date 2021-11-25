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
      // #---------------------------------------------------------------------------------------------------------
      // constructor: ->
      //   super()
      //   return undefined

        //---------------------------------------------------------------------------------------------------------
      _$distribution_initialize() {
        var prefix, schema;
        ({schema, prefix} = this.cfg);
        //.......................................................................................................
        this.db.create_function({
          name: prefix + 'get_deviation',
          call: (dx0, size_u, width_u, x1) => {
            /* Essentiall distance of any point in the text from the end of the current line *relative to
                 type size and scaled such that 1em = 1000u. Most favorable break points are the ones closest to
                 zero. */
            var R;
            R = Math.round((x1 - dx0 - width_u) / size_u * 1000);
            if (R > 0/* penalty for lines that are too long */) {
              R *= 2;
            }
            return R;
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
      get_current_brp(cfg) {
        var R, defaults, dx0, limit, prefix, schema, size_u, width_u, x1;
        defaults = {
          limit: 1
        };
        cfg = {...defaults, ...cfg};
        ({dx0, size_u, width_u, x1, limit} = cfg);
        ({prefix, schema} = this.cfg);
        R = this.db.all_rows(SQL`select
    *,
    ${prefix}get_deviation( $dx0, $size_u, $width_u, x1 ) as deviation
  from ${schema}.ads
  where ( br is not null ) and ( br != 'shy' )
  order by abs( deviation ) asc
  limit $limit;`, {schema, dx0, size_u, width_u, limit});
        if (limit === 1) {
          return R[0];
        } else {
          return R;
        }
      }

      //---------------------------------------------------------------------------------------------------------
      _distribute_with_db(cfg) {
        /* TAINT use join? */
        var R, adi0, ads, ads_replaced_by_brp_2, brp_1, brp_2, count, doc, dx0, lnr, mm_p_u, par, prefix, schema, size_mm, size_u, width_mm, width_u;
        // { Tbl, }    = require '../../icql-dba-tabulate'
        // dtab        = new Tbl { db: @db, }
        //.......................................................................................................
        ({ads} = cfg);
        ({schema, prefix} = this.cfg);
        //.......................................................................................................
        mm_p_u = cfg.mm_p_u;
        width_mm = cfg.width_mm;
        width_u = cfg.width_mm / cfg.mm_p_u; // line width in glyf design unites (1000 per em)
        size_mm = cfg.size_mm; // nominal type size (1em)
        size_u = cfg.size_mm / cfg.mm_p_u;
        adi0 = 0; // index of AD that represents current line start
        dx0 = 0; // extraneous width (b/c paragraph was set in single long line)
        //.......................................................................................................
        urge('^4875^', 'ads');
        console.table(this.db.all_rows(SQL`select * from ${schema}.ads order by doc, par, alt, adi, sgi;`));
        // urge '^4875^', 'current_brps'; console.table @db.all_rows SQL"select * from #{schema}.current_brps;"
        //.......................................................................................................
        brp_2 = this.db.single_row(SQL`select * from ${schema}.ads where br = 'start' limit 1;`);
        brp_1 = null;
        lnr = 0;
        // lines         = []
        // R             = { lines, }
        R = null/* NOTE result via DB for the time being */
        count = 0;
        while (true) {
          count++;
          if (count > 2) {
            warn("infinite loop");
            process.exit(119);
          }
          if (brp_2.br === 'end') {
            break;
          }
          lnr++;
          brp_1 = brp_2;
          urge('^5850^', "current BRPs");
          console.table(this.get_current_brp({
            dx0,
            size_u,
            width_u,
            limit: 5
          }));
          brp_2 = this.get_current_brp({dx0, size_u, width_u});
          ({doc, par} = brp_2);
          info('^5850^', brp_1);
          info('^5850^', brp_2);
          if (brp_2.alt === 1/* non-shy BRP */) {
            throw new Error("not yet implemented");
          } else {
            brp_2.adi;
            brp_2.sgi;
            ads_replaced_by_brp_2 = this.db.all_rows(SQL`select * from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( sgi = $sgi )
    and ( alt = 1 )
  order by doc, par, adi;`, {
              doc,
              par,
              sgi: brp_2.sgi
            });
            urge('^5851^', "ads_replaced_by_brp_2");
            console.table(ads_replaced_by_brp_2);
          }
        }
        /* at his point we know that the material to be typeset on the current line
               starts with BRP 1 and extends to the SG of BRP 2 using the ALT of that break point;
               it excludes the SG of BRP 2 with ALT = 1 (that is the one with a SHY). */
        // @db SQL"""
        //   update #{schema}.ads set lnr = $lnr
        //     where id in ( select id
        //       from #{schema}.ads
        //       where false -- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //         and ( doc = $doc )
        //         and ( par = $par )
        //         -- and ( alt = $brp_2_alt )
        //         -- and ( sgi = $brp_2_sgi )
        //     union all select id
        //       from #{schema}.ads
        //       where true
        //         and ( doc = $doc )
        //         and ( par = $par )
        //         and ( x > $brp_1_x )
        //         and ( x <= $brp_2_x )
        //         -- and ( adi > $brp_1_adi )
        //         -- and ( alt = 1 )
        //         -- and ( adi <= $brp_2_sgi )
        //       );""", {
        //   dx0:        dx0,
        //   lnr,
        //   doc,
        //   par,
        //   brp_1_adi:  brp_1.adi,
        //   brp_1_x:    brp_1.x,
        //   brp_2_alt:  brp_2.alt,
        //   brp_2_adi:  brp_2.adi,
        //   brp_2_sgi:  brp_2.sgi,
        //   brp_2_x:    brp_2.x, }
        // urge '^4875^', 'ads'; console.table @db.all_rows SQL"select * from #{schema}.ads order by doc, par, adi, sgi, alt;"
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _text_from_adis(cfg) {
        var R, ad, ad_2, adi_1, adi_2, ads, alt, doc, par, schema;
        ({schema, doc, par, adi_1, adi_2, alt} = cfg);
        ads = this.db.all_rows(SQL`select
    *
  from ${schema}.ads
  where true
    and doc = $doc
    and par = $par
    and adi between $adi_1 and $adi_2
    and alt = $alt
  order by doc, par, adi, sgi, alt;`, {doc, par, adi_1, adi_2, alt});
        ad_2 = ads[ads.length - 1];
        R = ((function() {
          var i, len, ref, results;
          results = [];
          for (i = 0, len = ads.length; i < len; i++) {
            ad = ads[i];
            results.push((ref = ad.chrs) != null ? ref : '');
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