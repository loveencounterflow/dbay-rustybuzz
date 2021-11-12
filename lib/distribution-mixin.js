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
        var R, adi_1, adi_2, ads, brp_1, brp_2, count, insert_into_ads, lines, pgi_1, pgi_2, prefix, schema, text, vnr_1, vnr_1_blob, vnr_2, vnr_2_blob;
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
        this.db(() => {
          return this.db(SQL`drop table if exists ${schema}.ads;
drop view if exists ${schema}.brps;
create table ${schema}.ads (
    -- pgi     integer generated always as ( ${prefix}vnr_pick( vnr, 1 ) ) virtual not null,
    -- adi     integer generated always as ( ${prefix}vnr_pick( vnr, 2 ) ) virtual not null,
    vnr     json not null primary key,
    gid     integer,
    b       integer,
    x       integer not null,
    y       integer not null,
    dx      integer not null,
    dy      integer not null,
    x1      integer not null,
    chrs    text,
    sid     text,
    br      text );
create view ${schema}.brps as select
    *,
    ${prefix}get_deviation( x1 ) as deviation
  from ${schema}.ads
  where br is not null;`);
        });
        this.hollerith.alter_table({
          schema,
          table_name: 'ads'
        });
        insert_into_ads = this.db.prepare_insert({
          schema,
          into: 'ads'
        });
        this.db(() => {
          var ad, i, len, results;
          results = [];
          for (i = 0, len = ads.length; i < len; i++) {
            ad = ads[i];
            results.push(insert_into_ads.run({
              br: null,
              ...ad,
              vnr: jr([1, ad.adi])
            }));
          }
          return results;
        });
        console.table(this.db.all_rows(SQL`select vnr, gid, b, x, y, dx, dy, x1, chrs, sid, br from ${schema}.ads order by vnr_blob;`));
        console.table(this.db.all_rows(SQL`select vnr, gid, b, x, y, dx, dy, x1, chrs, sid, br, deviation from ${schema}.brps order by vnr_blob;`));
        console.table(this.db.all_rows(SQL`select vnr, gid, b, x, y, dx, dy, x1, chrs, sid, br, deviation from ${schema}.brps order by abs( deviation ) limit 5;`));
        // console.table @db.all_rows SQL"select * from #{schema}.brps order by vnr_blob;"
        //.......................................................................................................
        this._v.dx0 = 0;
        brp_2 = this.db.single_row(SQL`select vnr, gid, b, x, y, dx, dy, x1, chrs, sid, br, deviation from ${schema}.brps order by vnr_blob limit 1;`);
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
          brp_2 = this.db.single_row(SQL`select vnr, gid, b, x, y, dx, dy, x1, chrs, sid, br, deviation from ${schema}.brps order by abs( deviation ) limit 1;`);
          brp_2.vnr = jp(brp_2.vnr);
          vnr_1 = this.hollerith.advance(brp_1.vnr); // or use `select from ads`?
          vnr_2 = brp_2.vnr;
          [pgi_1, adi_1] = vnr_1;
          [pgi_2, adi_2] = vnr_2;
          vnr_1_blob = this.hollerith.encode(vnr_1);
          vnr_2_blob = this.hollerith.encode(vnr_2);
          text = this.db.single_value(SQL`select group_concat( chrs, '' ) as chrs from ads where vnr_blob between $vnr_1_blob and $vnr_2_blob;`, {vnr_1_blob, vnr_2_blob});
          if (brp_2.br === 'shy') {
            text += '-';
          }
          info('^33209^', text);
          lines.push({
            pgi_1,
            pgi_2,
            adi_1,
            adi_2,
            vnr_1,
            vnr_2,
            dx0: this._v.dx0
          });
          this._v.dx0 = brp_2.x1;
        }
        return R;
      }

      //-----------------------------------------------------------------------------------------------------------
      _distribute_v1(cfg) {
        var R, ad, adi, adi1, adi2, ads, brp, brpi, brpi1, brpi2, brps, corrected_x, dx0, i, j, last_ad, last_adi, last_brpi, len, len1, line, lines, lnr, mm_p_u, rnr, width_mm, width_u;
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
        last_ad = ads[last_adi];
        brps.push({
          adi: last_adi,
          br: 'end',
          x: last_ad.x + last_ad.dx,
          dx: 0
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