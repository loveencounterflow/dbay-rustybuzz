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
        var R, adi0, brp_1, brp_2, count, doc, dx0, last_osg_adi, line_ads, lnr, mm_p_u, original_shapegroup, par, prefix, schema, size_mm, size_u, width_mm, width_u;
        ({schema, prefix} = this.cfg);
        //.......................................................................................................
        ({doc, par, mm_p_u, width_mm, size_mm} = cfg); // nominal type size (1em)
        width_u = width_mm / mm_p_u; // line width in glyf design units (1000 per em)
        size_u = size_mm / mm_p_u;
        adi0 = 0; // index of AD that represents current line start
        dx0 = 0; // extraneous width (b/c paragraph was set in single long line)
        //.......................................................................................................
        urge('^4875^', 'ads');
        console.table(this.db.all_rows(SQL`select * from ${schema}.ads order by doc, par, alt, b1, adi, sgi;`));
        // urge '^4875^', 'ads'; console.table @db.all_rows SQL"select b1, b2, sgi, osgi, chrs, x from #{schema}.ads where sgi = 12 or osgi = 12 order by doc, par, alt, b1, adi, sgi;"
        // process.exit 119
        // urge '^4875^', 'current_brps'; console.table @db.all_rows SQL"select * from #{schema}.current_brps;"
        //.......................................................................................................
        // select last AD: SQL"select * from ads where alt = 1 and adi = ( select max( adi ) from ads where alt = 1 );"
        // brp_2         = @db.single_row SQL"select * from #{schema}.ads where br = 'start' limit 1;"
        brp_2 = this.db.single_row(SQL`select
    *
  from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    -- and ( br = 'start' )
  order by adi asc
  limit 1;`, {doc, par});
        brp_1 = null;
        lnr = 0;
        // lines         = []
        // R             = { lines, }
        R = null/* NOTE result via DB for the time being */
        count = 0;
        while (true) {
          count++;
          if (count > 3) {
            warn("infinite loop");
            break;
          }
          // break if brp_2.br is 'end'
          lnr++;
          info('^5850-1^', '███████████████████████████████████████████████████ line:', lnr);
          brp_1 = brp_2;
          urge('^5850-2^', "current BRPs");
          console.table(this.get_current_brp({
            dx0,
            size_u,
            width_u,
            limit: 5
          }));
          brp_2 = this.get_current_brp({dx0, size_u, width_u});
          if (brp_2 == null) {
            warn('^5850-3^', "did not find `end` element");
            break;
          }
          ({doc, par} = brp_2);
          urge('^5850-4^ brp_1 and brp_2');
          console.table([brp_1, brp_2]);
          //.....................................................................................................
          if (brp_2.alt === 1/* non-shy BRP */) {
            line_ads = this.db.all_rows(SQL`select * from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( adi >= $brp_1_adi )
    and ( adi <= $brp_2_adi )
    and ( alt = 1 )
    -- and ( br != 'shy' )
  order by doc, par, adi;`, {
              doc,
              par,
              brp_1_adi: brp_1.adi,
              brp_2_adi: brp_2.adi
            });
            urge('^5850-5^', "line_ads", {lnr});
            console.table(line_ads);
            this.db(() => {
              var ad, i, len, x, y;
              debug('^5850-6^', this.db.all_rows(this.sql.insert_line, {
                doc,
                par,
                lnr,
                x0: brp_1.x,
                x1: brp_2.x1
              }));
              for (i = 0, len = line_ads.length; i < len; i++) {
                ad = line_ads[i];
                x = ad.x - dx0;
                y = ad.y;
                this.db(this.sql.insert_line_ad, {
                  doc,
                  par,
                  lnr,
                  ads_id: ad.id,
                  x,
                  y
                });
              }
              return null;
            });
            brp_2 = this.db.first_row(SQL`select * from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( adi = $brp_2_adi + 1 )
    and ( alt = 1 )
  limit 1;`, {
              doc,
              par,
              brp_2_adi: brp_2.adi
            });
            if (brp_2 == null) {
              warn('^5850-7^', "did not find `end` element");
              break;
            }
            urge('^5850-8^', "brp_2");
            console.table([brp_2]);
            dx0 = brp_2.x;
          } else {
            /* TAINT how to handle case when shapegroup has elements on right hand side of HHY? */
            //.....................................................................................................
            original_shapegroup = this.db.all_rows(SQL`select * from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( sgi = $osgi )
    and ( alt = 1 )
  order by doc, par, adi;`, {
              doc,
              par,
              osgi: brp_2.osgi
            });
            urge('^5850-9^', "original_shapegroup");
            console.table(original_shapegroup);
            line_ads = this.db.all_rows(SQL`select * from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( adi >= $brp_1_adi )
    and ( adi < $first_replaced_adi )
    and ( alt = 1 )
    -- and ( br != 'shy' )
union all
select * from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( alt = $brp_2_alt )
    and ( adi <= $brp_2_adi )
    -- and ( br != 'shy' )
  order by doc, par, x, adi;`, {
              doc,
              par,
              brp_2_alt: brp_2.alt,
              brp_1_adi: brp_1.adi,
              first_replaced_adi: original_shapegroup[0].adi,
              brp_2_adi: brp_2.adi
            });
            urge('^5850-10^', "line_ads", {lnr});
            console.table(line_ads);
            /* at his point we know that the material to be typeset on the current line
                   starts with BRP 1 and extends to the SG of BRP 2 using the ALT of that break point;
                   it excludes the SG of BRP 2 with ALT = 1 (that is the one with a SHY). */
            this.db(() => {
              var ad, i, len, x, y;
              debug('^5850-11^', this.db.all_rows(this.sql.insert_line, {
                doc,
                par,
                lnr,
                x0: brp_1.x,
                x1: brp_2.x1
              }));
              for (i = 0, len = line_ads.length; i < len; i++) {
                ad = line_ads[i];
                x = ad.x - dx0;
                y = ad.y;
                this.db(this.sql.insert_line_ad, {
                  doc,
                  par,
                  lnr,
                  ads_id: ad.id,
                  x,
                  y
                });
              }
              return null;
            });
            // debug '^5850-12^ line_ads'; console.table @db.all_rows SQL"select * from #{schema}.line_ads order by 1, 2, 3;"
            /* TAINT does not correctly handle case when shapegroup has elements on right hand side of HHY */
            debug('^5850-13^', original_shapegroup[original_shapegroup.length - 1]);
            debug('^5850-14^', last_osg_adi = original_shapegroup[original_shapegroup.length - 1].adi);
            urge('^5850-15^', "brp_2");
            console.table([brp_2]);
            urge('^5850-16^', "next brp_2");
            console.table(this.db.all_rows(SQL`select * from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( adi = $brp_2_adi + 1 )
    and ( alt = $brp_2_alt )
  union all
select * from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( adi = $last_osg_adi + 1 )
    and ( alt = 1 );`, {
              doc,
              par,
              last_osg_adi,
              brp_2_adi: brp_2.adi,
              brp_2_alt: brp_2.alt
            }));
            brp_2 = this.db.first_row(SQL`select * from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( adi = $brp_2_adi + 1 )
    and ( alt = $brp_2_alt )
  union all
select * from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( adi = $last_osg_adi + 1 )
    and ( alt = 1 );`, {
              doc,
              par,
              last_osg_adi,
              brp_2_adi: brp_2.adi,
              brp_2_alt: brp_2.alt
            });
            if (brp_2 == null) {
              warn('^5850-17^', "did not find `end` element");
              break;
            }
            // urge '^5850-18^', "brp_2"; console.table [ brp_2, ]
            dx0 = brp_2.x;
          }
        }
        //.......................................................................................................
        // urge '^5850-19^', "line_ads", { lnr, }; console.table @db.all_rows SQL"select * from #{schema}.line_ads order by 1, 2, 3, 4;"
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