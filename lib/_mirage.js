(function() {
  'use strict';
  var CND, GUY, PATH, SQL, badge, debug, echo, help, info, isa, rpr, type_of, types, urge, validate, validate_list_of, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DBAY-RUSTYBUZZ/MIRAGE';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  PATH = require('path');

  types = new (require('intertype')).Intertype();

  ({isa, type_of, validate, validate_list_of} = types.export());

  SQL = String.raw;

  GUY = require('guy');

  //===========================================================================================================
  types.declare('constructor_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "( @isa.object x.db ) or ( @isa.function x.db ": function(x) {
        return (this.isa.object(x.db)) || (this.isa.function(x.db));
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrg_refresh_datasource_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.dsk": function(x) {
        return this.isa.nonempty_text(x.dsk);
      },
      "@isa.boolean x.force": function(x) {
        return this.isa.boolean(x.force);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrg_append_to_loc_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.dsk": function(x) {
        return this.isa.nonempty_text(x.dsk);
      },
      "@isa.nonempty_text x.locid": function(x) {
        return this.isa.nonempty_text(x.locid);
      },
      "@isa.text x.text": function(x) {
        return this.isa.text(x.text);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrg_walk_line_rows_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.dsk": function(x) {
        return this.isa.nonempty_text(x.dsk);
      }
    }
  });

  //===========================================================================================================
  this.Mrg = (function() {
    class Mrg {
      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        var db;
        this.cfg = {...this.constructor.C.defaults.constructor_cfg, ...cfg};
        GUY.props.hide(this, 'types', types);
        this.types.validate.constructor_cfg(this.cfg);
        ({db} = GUY.obj.pluck_with_fallback(this.cfg, null, 'db'));
        GUY.props.hide(this, 'db', db);
        this.db.create_stdlib();
        this.cfg = GUY.lft.freeze(this.cfg);
        if (typeof this._create_sql_functions === "function") {
          this._create_sql_functions();
        }
        if (typeof this._compile_sql === "function") {
          this._compile_sql();
        }
        if (typeof this._procure_infrastructure === "function") {
          this._procure_infrastructure();
        }
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _procure_infrastructure() {
        /* TAINT skip if tables found */
        var prefix;
        ({prefix} = this.cfg);
        return this.db(SQL`drop table if exists ${prefix}_mirror;
drop table if exists ${prefix}_datasources;
-- ...................................................................................................
create table ${prefix}_datasources (
  dsk     text not null,
  path    text not null,
  digest  text default null,
  primary key ( dsk ) );
-- ...................................................................................................
create table ${prefix}_mirror (
  dsk     text    not null,
  lnr     integer not null,
  lnpart  integer not null default 0,
  xtra    integer not null default 0,
  isloc   boolean not null default 0,
  line    text    not null,
  foreign key ( dsk ) references ${prefix}_datasources,
  primary key ( dsk, lnr, lnpart, xtra ) );
-- ...................................................................................................
create table ${prefix}_locs (
  dsk     text    not null,
  locid   text    not null,
  lnr     integer not null,
  lnpart  integer not null,
  foreign key ( dsk ) references ${prefix}_datasources,
  primary key ( dsk, locid ) );
-- ...................................................................................................
create view ${prefix}_location_from_dsk_locid as select
      dsk,
      locid,
      lnr,
      lnpart
    from ${prefix}_locs
    where true
      and ( dsk   = std_getv( 'dsk'   ) )
      and ( locid = std_getv( 'locid' ) )
    limit 1;
-- ...................................................................................................
create view ${prefix}_prv_nxt_xtra_from_dsk_locid as select
      r1.dsk,
      std_getv( 'locid' ) as locid,
      r1.lnr,
      r1.lnpart,
      min( r1.xtra ) - 1  as prv_xtra,
      max( r1.xtra ) + 1  as nxt_xtra
    from
      ${prefix}_mirror as r1,
      ( select lnr, lnpart from ${prefix}_location_from_dsk_locid ) as r2
    where true
      and ( r1.dsk     = std_getv( 'dsk' ) )
      and ( r1.lnr     = r2.lnr            )
      and ( r1.lnpart  = r2.lnpart         )
    limit 1;`);
      }

      //---------------------------------------------------------------------------------------------------------
      _compile_sql() {
        var prefix;
        ({prefix} = this.cfg);
        //.......................................................................................................
        GUY.props.hide(this, 'sql', {
          //.....................................................................................................
          get_db_object_count: SQL`select count(*) as count from sqlite_schema where starts_with( $name, $prefix_ );`,
          //.....................................................................................................
          ds_entry_from_dsk: SQL`select * from ${prefix}_datasources where dsk = $dsk;`,
          //.....................................................................................................
          update_digest: SQL`update ${prefix}_datasources set digest = $digest where dsk = $dsk;`,
          //.....................................................................................................
          delete_lines: SQL`delete from ${prefix}_mirror where dsk = $dsk;`,
          //.....................................................................................................
          upsert_datasource: this.db.create_insert({
            into: prefix + '_datasources',
            fields: ['dsk', 'path'],
            on_conflict: {
              update: true
            }
          }),
          //.....................................................................................................
          insert_line: this.db.create_insert({
            into: prefix + '_mirror',
            fields: ['dsk', 'lnr', 'line']
          }),
          //.....................................................................................................
          insert_lnpart: this.db.create_insert({
            into: prefix + '_mirror',
            fields: ['dsk', 'lnr', 'lnpart', 'isloc', 'line']
          }),
          //.....................................................................................................
          insert_xtra: this.db.create_insert({
            into: prefix + '_mirror',
            fields: ['dsk', 'lnr', 'lnpart', 'xtra', 'line'],
            returning: '*'
          }),
          //.....................................................................................................
          insert_locid: this.db.create_insert({
            into: prefix + '_locs',
            fields: ['dsk', 'locid', 'lnr', 'lnpart']
          })
        });
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      register_dsk(cfg) {
        // { dsk, path, }  = cfg
        this.db(this.sql.upsert_datasource, cfg);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _ds_entry_from_dsk(dsk) {
        return this.db.single_row(this.sql.ds_entry_from_dsk, {dsk});
      }

      _update_digest(dsk, digest) {
        return this.db(this.sql.update_digest, {dsk, digest});
      }

      _delete_lines(dsk) {
        return this.db(this.sql.delete_lines, {dsk});
      }

      //---------------------------------------------------------------------------------------------------------
      refresh_datasource(cfg) {
        var counts, current_digest, digest, dsk, force, loc_splitter, locid_re, path, prefix;
        validate.mrg_refresh_datasource_cfg((cfg = {...this.constructor.C.defaults.mrg_refresh_datasource_cfg, ...cfg}));
        ({dsk, force} = cfg);
        ({prefix, loc_splitter, locid_re} = this.cfg);
        ({path, digest} = this._ds_entry_from_dsk(dsk));
        current_digest = GUY.fs.get_content_hash(path);
        counts = {
          files: 0,
          bytes: 0
        };
        //.......................................................................................................
        if (force || (digest !== current_digest)) {
          //.....................................................................................................
          this.db(() => {
            var i, insert_line, insert_lnpart, insert_locid, isloc, len, line, lnpart, lnr, locid, part, parts, ref;
            this._delete_lines(dsk);
            insert_line = this.db.prepare(this.sql.insert_line);
            insert_lnpart = this.db.prepare(this.sql.insert_lnpart);
            insert_locid = this.db.prepare(this.sql.insert_locid);
            lnr = 0;
            ref = GUY.fs.walk_lines(path, {
              decode: false
            });
            //...................................................................................................
            for (line of ref) {
              lnr++;
              counts.bytes += line.length;
              line = line.toString('utf-8');
              parts = line.split(loc_splitter);
              if (parts.length === 1) {
                insert_line.run({dsk, lnr, line});
              } else {
                isloc = true;
                lnpart = 0;
                for (i = 0, len = parts.length; i < len; i++) {
                  part = parts[i];
                  lnpart++;
                  if ((isloc = !isloc)) {
                    ({locid} = (part.match(locid_re)).groups);
                    insert_locid.run({dsk, lnr, lnpart, locid});
                    insert_lnpart.run({
                      dsk,
                      lnr,
                      lnpart,
                      isloc: 1,
                      line: part
                    });
                  } else {
                    insert_lnpart.run({
                      dsk,
                      lnr,
                      lnpart,
                      isloc: 0,
                      line: part
                    });
                  }
                }
              }
            }
            //...................................................................................................
            counts.files++;
            this._update_digest(dsk, current_digest);
            return null;
          });
        }
        //.......................................................................................................
        return counts;
      }

      //=========================================================================================================
      // CONTENT RETRIEVAL
      //---------------------------------------------------------------------------------------------------------
      get_line_rows(cfg) {
        return [...(this.walk_line_rows(cfg))];
      }

      //---------------------------------------------------------------------------------------------------------
      walk_line_rows(cfg) {
        var dsk, prefix;
        validate.mrg_walk_line_rows_cfg((cfg = {...this.constructor.C.defaults.mrg_walk_line_rows_cfg, ...cfg}));
        ({dsk} = cfg);
        ({prefix} = this.cfg);
        return this.db(SQL`select distinct
    dsk                                             as dsk,
    lnr                                             as lnr,
    coalesce( group_concat( line, '' ) over w, '' ) as line
  from ${prefix}_mirror
  where true
    and ( dsk = $dsk )
    -- and ( not isloc )
  window w as (
    partition by lnr
    order by lnpart, xtra
    range between unbounded preceding and unbounded following );`, {dsk});
      }

      //=========================================================================================================
      // CONTENT MANIPULATION
      //---------------------------------------------------------------------------------------------------------
      _lnr_lnpart_from_dsk_locid(dsk, locid) {
        this.db.setv('dsk', dsk);
        this.db.setv('locid', locid);
        return this.db.single_row(SQL`select * from ${this.cfg.prefix}_location_from_dsk_locid;`);
      }

      //---------------------------------------------------------------------------------------------------------
      _prv_nxt_xtra_from_dsk_locid(dsk, locid) {
        this.db.setv('dsk', dsk);
        this.db.setv('locid', locid);
        return this.db.single_row(SQL`select * from ${this.cfg.prefix}_prv_nxt_xtra_from_dsk_locid;`);
      }

      //---------------------------------------------------------------------------------------------------------
      append_to_loc(cfg) {
        var dsk, insert_xtra, locid, prefix, text;
        validate.mrg_append_to_loc_cfg((cfg = {...this.constructor.C.defaults.mrg_append_to_loc_cfg, ...cfg}));
        ({dsk, locid, text} = cfg);
        ({prefix} = this.cfg);
        insert_xtra = this.db.prepare(this.sql.insert_xtra);
        /* Given a datasource `dsk` and a location ID `locid`, find the line and line part numbers, `lnr` and
           `lnpart`. This is possible because when inserting, we split up the line into several parts such that
           each location marker got its own line part separate from any other material: */
        return this.db(() => {
          var lnpart, lnr, nxt_xtra, prv_xtra;
          // urge '^4545689^'; console.table @_lnr_lnpart_from_dsk_locid   dsk, locid
          // urge '^4545689^'; console.table @_prv_nxt_xtra_from_dsk_locid dsk, locid
          ({lnr, lnpart, prv_xtra, nxt_xtra} = this._prv_nxt_xtra_from_dsk_locid(dsk, locid));
          debug('^55875^', {lnr, lnpart, prv_xtra, nxt_xtra});
          // console.table [{ dsk, locid, lnr, lnpart, prv_xtra, nxt_xtra, }]
          /* Insert the material at the appropriate point: */
          return this.db.first_row(insert_xtra, {
            dsk,
            locid,
            lnr,
            lnpart,
            xtra: nxt_xtra,
            line: text
          });
        });
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Mrg.C = GUY.lft.freeze({
      defaults: {
        //.....................................................................................................
        constructor_cfg: {
          db: null,
          prefix: 'mrg',
          loc_splitter: /(<mrg:loc#[_a-zA-Z][-_a-zA-Z0-9]*\/>)/g,
          locid_re: /#(?<locid>[^\/]+)/
        },
        //.....................................................................................................
        mrg_refresh_datasource_cfg: {
          dsk: null,
          force: false
        },
        //.....................................................................................................
        mrg_append_to_loc_cfg: {
          dsk: null
        },
        //.....................................................................................................
        mrg_walk_line_rows_cfg: {
          dsk: null,
          locid: null,
          text: null
        }
      }
    });

    return Mrg;

  }).call(this);

}).call(this);

//# sourceMappingURL=_mirage.js.map