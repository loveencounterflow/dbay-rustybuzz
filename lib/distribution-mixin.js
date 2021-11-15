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
      get_current_brp(cfg) {
        var brp_1, dx0, schema;
        ({schema, dx0, brp_1} = cfg);
        this._v.dx0 = brp_1.x1/* NOTE this value must be set before using the below select */
        return this.db.single_row(SQL`select * from ${schema}.current_brp;`);
      }

      //---------------------------------------------------------------------------------------------------------
      /* TAINT use API (?) */      _distribute_with_db(cfg) {
        var R, ads, brp_1, brp_2, count, doc, lines, lnr, par, prefix, schema;
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
        urge('^4875^', 'ads');
        console.table(this.db.all_rows(SQL`select id, doc, par, adi, sgi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, nobr, br, lnr from ${schema}.ads order by vnr_blob;`));
        urge('^4875^', 'current_brps');
        console.table(this.db.all_rows(SQL`select id, doc, par, adi, sgi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, nobr, br, lnr, deviation from ${schema}.current_brps;`));
        // console.table @db.all_rows SQL"select * from #{schema}.brps order by vnr_blob;"
        //.......................................................................................................
        brp_2 = this.db.single_row(SQL`select * from ${schema}.current_brps where br = 'start' limit 1;`);
        delete brp_2.vnr;
        delete brp_2.vnr_blob;
        console.table([brp_2]);
        brp_1 = null;
        lines = [];
        lnr = 0;
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
          lnr++;
          brp_1 = brp_2;
          brp_2 = this.get_current_brp({
            schema,
            dx0: this._v.dx0,
            brp_1
          });
          ({doc, par} = brp_2);
          //.....................................................................................................
          urge('^5850^', "current BRPs");
          console.table(this.db.all_rows(SQL`select
    id, doc, par, adi, sgi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, nobr, br, lnr, deviation
  from ${schema}.current_brps limit 3;`));
          debug('^347446^', {
            dx0: this._v.dx0,
            lnr,
            doc,
            par,
            brp_1_adi: brp_1.adi,
            brp_2_sgi: brp_2.sgi,
            brp_2_vrt: brp_2.vrt
          });
          this.db(SQL`update ${schema}.ads set
    x   = x - $dx0,
    lnr = $lnr
  where id in ( select id
    from ${schema}.ads
    where true
      and ( doc = $doc )
      and ( par = $par )
      and ( sgi = $brp_2_sgi )
      and ( vrt = $brp_2_vrt )
  union all select id
    from ${schema}.ads
    where true
      and ( doc = $doc )
      and ( par = $par )
      and ( adi > $brp_1_adi )
      and ( sgi < $brp_2_sgi )
      and ( vrt = 1 ) );`, {
            dx0: this._v.dx0,
            lnr,
            doc,
            par,
            brp_1_adi: brp_1.adi,
            brp_2_sgi: brp_2.sgi,
            brp_2_vrt: brp_2.vrt
          });
          //.....................................................................................................
          urge('^5850^', "current ADs");
          console.table(this.db.all_rows(SQL`select
    id, doc, par, adi, sgi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, nobr, br, lnr
  from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( sgi = $brp_2_sgi )
    and ( vrt = $brp_2_vrt )
union all
select
    id, doc, par, adi, sgi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, nobr, br, lnr
  from ${schema}.ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and ( adi > $brp_1_adi )
    and ( sgi < $brp_2_sgi )
    and ( vrt = 1 )
  order by doc, par, adi, sgi, vrt;`, {
            doc,
            par,
            brp_1_adi: brp_1.adi,
            brp_2_sgi: brp_2.sgi,
            brp_2_vrt: brp_2.vrt
          }));
        }
        //.....................................................................................................
        // info '^4476^', rpr @_text_from_adis { schema, doc, par, adi_1, adi_2, vrt: 1, }
        //.....................................................................................................
        // lines.push { doc, par, adi_1, adi_2, vrt_1, vrt_2, vnr_1, vnr_2, dx0: @_v.dx0, }
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