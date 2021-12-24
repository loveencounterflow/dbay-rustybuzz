(function() {
  'use strict';
  var CND, GUY, ITXH, PATH, SQL, badge, debug, echo, help, info, isa, rpr, type_of, types, urge, validate, validate_list_of, warn, whisper,
    indexOf = [].indexOf;

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

  ({
    HTMLISH: ITXH
  } = require('intertext'));

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
      },
      "@isa_optional.boolean x.keep_locs": function(x) {
        return this.isa_optional.boolean(x.keep_locs);
      }
    }
  });

  // #-----------------------------------------------------------------------------------------------------------
  // types.declare 'mrg_get_text_cfg', tests:
  //   "@isa.object x":                ( x ) -> @isa.object x
  //   "@isa.nonempty_text x.dsk":     ( x ) -> @isa.nonempty_text x.dsk
  //   "@isa.boolean x.keep_locs":     ( x ) -> @isa.boolean x.keep_locs

  //===========================================================================================================
  this.Mrg = (function() {
    class Mrg {
      // #.....................................................................................................
      // mrg_get_text_cfg:
      //   dsk:              null
      //   keep_locs:        true

        //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        var db;
        this.cfg = {...this.constructor.C.defaults.constructor_cfg, ...cfg};
        GUY.props.hide(this, 'types', types);
        this.types.validate.constructor_cfg(this.cfg);
        ({db} = GUY.obj.pluck_with_fallback(this.cfg, null, 'db'));
        GUY.props.hide(this, 'db', db);
        this.cfg = GUY.lft.freeze(this.cfg);
        this.db.create_stdlib();
        if (typeof this._set_variables === "function") {
          this._set_variables();
        }
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
      _set_variables() {
        return this.db.setv('allow_change_on_mirror', 0);
      }

      //---------------------------------------------------------------------------------------------------------
      _procure_infrastructure() {
        /* TAINT skip if tables found */
        var prefix;
        ({prefix} = this.cfg);
        this.db(SQL`drop view   if exists ${prefix}_location_from_dsk_locid;
drop view   if exists ${prefix}_prv_nxt_xtra_from_dsk_locid;
drop table  if exists ${prefix}_locs;
drop table  if exists ${prefix}_mirror;
drop table  if exists ${prefix}_datasources;`);
        this.db(SQL`create table ${prefix}_datasources (
    dsk     text not null,
    path    text not null,
    digest  text default null,
  primary key ( dsk ) );`);
        this.db(SQL`create table ${prefix}_mirror (
    dsk     text    not null,
    lnr     integer not null,
    lnpart  integer not null default 0,
    xtra    integer not null default 0,
    locid   text default null,
    line    text    not null,
  foreign key ( dsk ) references ${prefix}_datasources,
  primary key ( dsk, lnr, lnpart, xtra ) );`);
        this.db(SQL`create trigger ${prefix}_before_delete_on_mirror before delete on ${prefix}_mirror
  begin
    select case when old.xtra = 0 and not std_getv( 'allow_change_on_mirror' ) then
    raise( fail, '^mirage@1^ not allowed to modify table ${prefix}_mirror for xtra = 0' ) end;
    end;`);
        this.db(SQL`create trigger ${prefix}_before_insert_on_mirror before insert on ${prefix}_mirror
  begin
    select case when new.xtra = 0 and not std_getv( 'allow_change_on_mirror' ) then
    raise( fail, '^mirage@2^ not allowed to modify table ${prefix}_mirror for xtra = 0' ) end;
    end;`);
        this.db(SQL`create trigger ${prefix}_before_update_on_mirror before update on ${prefix}_mirror
  begin
    select case when old.xtra = 0 and not std_getv( 'allow_change_on_mirror' ) then
    raise( fail, '^mirage@3^ not allowed to modify table ${prefix}_mirror for xtra = 0' ) end;
    end;`);
        this.db(SQL`create table ${prefix}_locs (
    dsk     text    not null,
    locid   text    not null,
    lnr     integer not null,
    lnpart  integer not null,
    props   json,
    del     boolean not null default false,
  foreign key ( dsk ) references ${prefix}_datasources,
  primary key ( dsk, locid ) );`);
        this.db(SQL`-- needs variables 'dsk', 'locid'
create view ${prefix}_location_from_dsk_locid as select
    std_assert(
      dsk,
      '^${prefix}_location_from_dsk_locid@546^' ||
      ' unknown locid ' || quote( std_getv( 'locid' ) ) )   as dsk,
    locid                                                   as locid,
    lnr                                                     as lnr,
    lnpart                                                  as lnpart,
    props                                                   as props,
    del                                                     as del
  from ( select
      *,
      count( locid ) as _count
    from ${prefix}_locs
    where true
      and ( dsk   = std_getv( 'dsk'   ) )
      and ( locid = std_getv( 'locid' ) )
    limit 1 );`);
        return this.db(SQL`-- needs variables 'dsk', 'locid'
create view ${prefix}_prv_nxt_xtra_from_dsk_locid as
  with r2 as ( select
      lnr,
      lnpart,
      props,
      del
    from ${prefix}_location_from_dsk_locid )
  select
    std_assert(
      r1.dsk,
      '^${prefix}_location_from_dsk_locid@546^' ||
      ' unknown locid ' || quote( std_getv( 'locid' ) ) )   as dsk,
    std_getv( 'locid' )                                     as locid,
    r1.lnr                                                  as lnr,
    r1.lnpart                                               as lnpart,
    r2.props                                                as props,
    r2.del                                                  as del,
    min( r1.xtra ) - 1                                      as prv_xtra,
    max( r1.xtra ) + 1                                      as nxt_xtra
  from
    ${prefix}_mirror as r1, r2
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
          get_db_object_count: SQL`select count(*) as count from sqlite_schema where starts_with( $name, $prefix || '_' );`,
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
            fields: ['dsk', 'lnr', 'lnpart', 'locid', 'line']
          }),
          //.....................................................................................................
          insert_xtra: this.db.create_insert({
            into: prefix + '_mirror',
            fields: ['dsk', 'lnr', 'lnpart', 'xtra', 'line'],
            returning: '*'
          }),
          //.....................................................................................................
          insert_xtra_using_dsk_locid: SQL`-- needs variables 'dsk', 'locid'
-- unfortunately, got to repeat the \`std_assert()\` call here
insert into ${prefix}_mirror ( dsk, lnr, lnpart, xtra, line )
  select
      $dsk                                                    as dsk,
      std_assert(
        lnr,
        '^insert_xtra_using_dsk_locid@546^' ||
        ' unknown locid ' || quote( std_getv( 'locid' ) ) )   as lnr,
      lnpart                                                  as lnpart,
      nxt_xtra                                                as nxt_xtra,
      $text                                                   as line
    from ${prefix}_prv_nxt_xtra_from_dsk_locid
  returning *;`,
          //.....................................................................................................
          insert_locid: this.db.create_insert({
            into: prefix + '_locs',
            fields: ['dsk', 'locid', 'lnr', 'lnpart', 'props', 'del']
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
        var R;
        this.db.setv('allow_change_on_mirror', 1);
        try {
          R = this._refresh_datasource(cfg);
        } finally {
          this.db.setv('allow_change_on_mirror', 0);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _refresh_datasource(cfg) {
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
            var del, i, insert_line, insert_lnpart, insert_locid, is_loc, kernel, len, line, lnpart, lnr, locid, part, parts, props, ref;
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
                is_loc = true;
                lnpart = -1;
                for (i = 0, len = parts.length; i < len; i++) {
                  part = parts[i];
                  lnpart++;
                  if ((is_loc = !is_loc)) {
                    kernel = part.slice(1, part.length - 2);
                    ({
                      id: locid,
                      class: props
                    } = ITXH.parse_compact_tagname(kernel, true));
                    del = indexOf.call(props != null ? props : [], 'delete-marker') >= 0 ? 1 : 0;
                    props = props != null ? JSON.stringify(props) : null;
                    insert_locid.run({dsk, lnr, lnpart, locid, props, del});
                    insert_lnpart.run({
                      dsk,
                      lnr,
                      lnpart,
                      locid,
                      line: part
                    });
                  } else {
                    insert_lnpart.run({
                      dsk,
                      lnr,
                      lnpart,
                      locid: null,
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
      get_text(cfg) {
        var d;
        return ((function() {
          var ref, results;
          ref = this.walk_line_rows(cfg);
          results = [];
          for (d of ref) {
            // validate.mrg_get_text_cfg ( cfg = { @constructor.C.defaults.mrg_get_text_cfg..., cfg..., } )
            results.push(d.line);
          }
          return results;
        }).call(this)).join('\n');
      }

      //---------------------------------------------------------------------------------------------------------
      get_line_rows(cfg) {
        return [...(this.walk_line_rows(cfg))];
      }

      //---------------------------------------------------------------------------------------------------------
      walk_line_rows(cfg) {
        var dsk, keep_locs, prefix;
        validate.mrg_walk_line_rows_cfg((cfg = {...this.constructor.C.defaults.mrg_walk_line_rows_cfg, ...cfg}));
        ({dsk, keep_locs} = cfg);
        ({prefix} = this.cfg);
        keep_locs = keep_locs != null ? (keep_locs ? 1 : 0) : null;
        return this.db(SQL`select distinct
    r1.dsk                                              as dsk,
    r1.lnr                                              as lnr,
    coalesce( group_concat( r1.line, '' ) over w, '' )  as line
  from ${prefix}_mirror as r1
  left join ${prefix}_locs as r2 using ( dsk, locid )
  where true
    and ( r1.dsk = $dsk )
    and ( ( del is null ) or
      case when $keep_locs is null then not del
      else $keep_locs end  )
  window w as (
    partition by r1.lnr
    order by r1.lnpart, r1.xtra
    range between unbounded preceding and unbounded following );`, {dsk, keep_locs});
      }

      //=========================================================================================================
      // CONTENT MANIPULATION
      //---------------------------------------------------------------------------------------------------------
      // _lnr_lnpart_from_dsk_locid: ( dsk, locid ) ->
      //   @db.setv 'dsk',   dsk
      //   @db.setv 'locid', locid
      //   return @db.single_row SQL"select * from #{@cfg.prefix}_location_from_dsk_locid;"

        // #---------------------------------------------------------------------------------------------------------
      // _prv_nxt_xtra_from_dsk_locid: ( dsk, locid ) ->
      //   @db.setv 'dsk',   dsk
      //   @db.setv 'locid', locid
      //   return @db.single_row SQL"select * from #{@cfg.prefix}_prv_nxt_xtra_from_dsk_locid;"

        // #---------------------------------------------------------------------------------------------------------
      // append_to_loc_OLD: ( cfg ) ->
      //   validate.mrg_append_to_loc_cfg ( cfg = { @constructor.C.defaults.mrg_append_to_loc_cfg..., cfg..., } )
      //   { dsk
      //     locid
      //     text    } = cfg
      //   insert_xtra = @db.prepare @sql.insert_xtra
      //   return @db =>
      //     { lnr, lnpart, prv_xtra, nxt_xtra, } = @_prv_nxt_xtra_from_dsk_locid dsk, locid
      //     return @db.first_row insert_xtra, { dsk, locid, lnr, lnpart, xtra: nxt_xtra, line: text, }

        //---------------------------------------------------------------------------------------------------------
      append_to_loc(cfg) {
        var dsk, locid, prefix, text;
        validate.mrg_append_to_loc_cfg((cfg = {...this.constructor.C.defaults.mrg_append_to_loc_cfg, ...cfg}));
        ({dsk, locid, text} = cfg);
        ({prefix} = this.cfg);
        this.db.setv('dsk', dsk);
        this.db.setv('locid', locid);
        return this.db.first_row(this.sql.insert_xtra_using_dsk_locid, {dsk, text});
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Mrg.C = GUY.lft.freeze({
      defaults: {
        //.....................................................................................................
        constructor_cfg: {
          db: null,
          prefix: 'mrg',
          loc_splitter: /(<mrg:loc[#.][-#._a-zA-Z0-9]*\/>)/g
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
          keep_locs: true
        }
      }
    });

    return Mrg;

  }).call(this);

}).call(this);

//# sourceMappingURL=_mirage.js.map