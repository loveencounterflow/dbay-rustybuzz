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
  line    text    not null,
  foreign key ( dsk ) references ${prefix}_datasources,
  primary key ( dsk, lnr ) );
-- ...................................................................................................
create table ${prefix}_locs (
  dsk     text    not null,
  loci    text    not null,
  lnr     integer not null,
  foreign key ( dsk ) references ${prefix}_datasources,
  primary key ( dsk, loci ) );`);
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
        var counts, current_digest, digest, dsk, force, loc_pattern, path, prefix;
        validate.mrg_refresh_datasource_cfg((cfg = {...this.constructor.C.defaults.mrg_refresh_datasource_cfg, ...cfg}));
        ({dsk, force} = cfg);
        ({prefix, loc_pattern} = this.cfg);
        ({path, digest} = this._ds_entry_from_dsk(dsk));
        current_digest = GUY.fs.get_content_hash(path);
        counts = {
          files: 0,
          bytes: 0
        };
        if (force || (digest !== current_digest)) {
          this.db(() => {
            var insert_line, line, lnr, loc_id, match, ref, ref1;
            this._delete_lines(dsk);
            insert_line = this.db.prepare(this.sql.insert_line);
            lnr = 0;
            ref = GUY.fs.walk_lines(path, {
              decode: false
            });
            for (line of ref) {
              lnr++;
              counts.bytes += line.length;
              line = line.toString('utf-8');
              ref1 = line.matchAll(loc_pattern);
              for (match of ref1) {
                ({
                  id: loc_id
                } = match.groups);
                debug('^54949^', {lnr, line, loc_id});
              }
              insert_line.run({dsk, lnr, line});
            }
            counts.files++;
            this._update_digest(dsk, current_digest);
            return null;
          });
        }
        return counts;
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Mrg.C = GUY.lft.freeze({
      defaults: {
        //.....................................................................................................
        constructor_cfg: {
          db: null,
          prefix: 'mrg',
          loc_pattern: /<mrg:loc#(?<id>[_a-zA-Z][-_a-zA-Z0-9]*)\/>/g
        },
        // schema:           'mrg'
        //.....................................................................................................
        mrg_refresh_datasource_cfg: {
          dsk: null,
          force: false
        }
      }
    });

    return Mrg;

  }).call(this);

}).call(this);

//# sourceMappingURL=_mirage.js.map