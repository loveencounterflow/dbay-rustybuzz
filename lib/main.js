(function() {
  'use strict';
  var CND, Drb_outlines, PATH, SQL, ZLIB, badge, debug, echo, font_path, guy, help, home, info, isa, rpr, type_of, types, urge, validate, validate_list_of, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DBAY-RUSTYBUZZ';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  PATH = require('path');

  types = require('./types');

  ({isa, type_of, validate, validate_list_of} = types.export());

  SQL = String.raw;

  guy = require('guy');

  home = PATH.resolve(PATH.join(__dirname, '..'));

  // data_path                 = PATH.join home, 'data'
  ({Drb_outlines} = require('./outlines-mixin'));

  font_path = PATH.resolve(PATH.join(__dirname, '../fonts'));

  ZLIB = require('zlib');

  //===========================================================================================================
  this.Drb = (function() {
    class Drb extends Drb_outlines() {
      //---------------------------------------------------------------------------------------------------------
      static cast_constructor_cfg(me, cfg = null) {
        var R, clasz;
        clasz = me.constructor;
        R = cfg != null ? cfg : me.cfg;
        // #.......................................................................................................
        // if R.path?
        //   R.temporary  ?= false
        //   R.path        = PATH.resolve R.path
        // else
        //   R.temporary  ?= true
        //   filename        = me._get_random_filename()
        //   R.path        = PATH.resolve PATH.join clasz.C.autolocation, filename
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      static declare_types(me) {
        var RBW, db;
        /* called from constructor via `guy.cfg.configure_with_types()` */
        me.cfg = this.cast_constructor_cfg(me);
        me.types.validate.constructor_cfg(me.cfg);
        //.......................................................................................................
        if (me.cfg.RBW != null) {
          ({RBW} = guy.obj.pluck_with_fallback(me.cfg, null, 'RBW'));
        } else {
          RBW = require('rustybuzz-wasm');
        }
        guy.props.hide(me, 'RBW', RBW);
        //.......................................................................................................
        ({db} = guy.obj.pluck_with_fallback(me.cfg, null, 'db'));
        me.cfg = guy.lft.freeze(guy.obj.omit_nullish(me.cfg));
        guy.props.hide(me, 'db', db);
        guy.props.hide(me, 'cache', {});
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        super();
        guy.cfg.configure_with_types(this, cfg, types);
        this._create_sql_functions();
        this._compile_sql();
        this._open_drb_db();
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _create_db_structure() {
        var prefix, schema;
        ({prefix, schema} = this.cfg);
        //.......................................................................................................
        this.db.execute(SQL`drop table if exists ${schema}.outlines;
drop table if exists ${schema}.fontnicks;
-- ...................................................................................................
vacuum ${schema};
-- ...................................................................................................
create table ${schema}.fontnicks (
    fontnick    text    not null,
    fspath      text    not null,
  primary key ( fontnick ) );
-- ...................................................................................................
create table ${schema}.outlines (
    fontnick  text    not null references fontnicks ( fontnick ),
    gid       integer not null,
    cid       integer,
    glyph     text,
    /* Unscaled Outline ID (OID): */
    uoid      text generated always as ( 'o' || gid || fontnick ) virtual,
    /* Scaled Outline ID (OID): */
    -- soid      text generated always as ( 'o' || gid || fontnick || '_' || 4.5 ) virtual,
    /* bounding box */
    x         float   not null,
    y         float   not null,
    x1        float   not null,
    y1        float   not null,
    /* PathData (PD): */
    pd        text generated always as ( ${prefix}unzip( pd_blob ) ) virtual,
    pd_blob   blob    not null,
    primary key ( fontnick, gid ) );`);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _compile_sql() {
        var prefix, schema;
        ({prefix, schema} = this.cfg);
        //.......................................................................................................
        guy.props.hide(this, 'sql', {
          //.....................................................................................................
          get_db_object_count: SQL`select count(*) as count from ${schema}.sqlite_schema;`,
          //.....................................................................................................
          upsert_fontnick: this.db.create_insert({
            schema,
            into: 'fontnicks',
            fields: ['fontnick', 'fspath'],
            on_conflict: {
              update: true
            }
          }),
          //.....................................................................................................
          insert_outline: this.db.create_insert({
            schema,
            into: 'outlines',
            fields: ['fontnick', 'gid', 'cid', 'glyph', 'x', 'y', 'x1', 'y1', 'pd_blob'],
            on_conflict: {
              update: true
            }
          }),
          //.....................................................................................................
          fspath_from_fontnick: SQL`select fspath from fontnicks where fontnick = $fontnick;`
        });
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _create_sql_functions() {
        var prefix, schema;
        ({prefix, schema} = this.cfg);
        //-------------------------------------------------------------------------------------------------------
        this.db.create_function({
          name: prefix + 'unzip',
          deterministic: true,
          varargs: false,
          call: (pd_bfr) => {
            return this._unzip(pd_bfr);
          }
        });
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _get_db_object_count() {
        return this.db.single_value(this.sql.get_db_object_count);
      }

      // _truncate_entries:      ( source ) -> @db @sql.truncate_entries, { source, }
      // _delete_arpabet_trlits: -> @db @sql.delete_arpabet_trlits

        //---------------------------------------------------------------------------------------------------------
      _open_drb_db() {
        this.db.open(this.cfg);
        if (this.cfg.create || (this._get_db_object_count() === 0)) {
          this._create_db_structure();
          this._populate_db();
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _populate_db() {
        this._prepopulate_fontnicks();
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _prepopulate_fontnicks() {
        var upsert_fontnick;
        upsert_fontnick = this.db.prepare(this.sql.upsert_fontnick);
        this.db(() => {
          var fontnick, fspath, ref, results;
          ref = this.cfg.std_fontnicks;
          results = [];
          for (fontnick in ref) {
            fspath = ref[fontnick];
            results.push(this.db(upsert_fontnick, {fontnick, fspath}));
          }
          return results;
        });
        return null;
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Drb.C = guy.lft.freeze({
      // replacement:  '█'
      last_fontidx: 15,
      zlib_zip_cfg: {
        level: 1,
        strategy: ZLIB.constants.Z_HUFFMAN_ONLY
      },
      defaults: {
        //.....................................................................................................
        dbr_register_fontnick_cfg: {
          fontnick: null,
          fspath: null
        },
        //.....................................................................................................
        dbr_prepare_font_cfg: {
          fontnick: null,
          gid: null
        },
        //.....................................................................................................
        dbr_insert_outlines_cfg: {
          fontnick: null,
          cgid_map: null,
          cids: null,
          text: null
        },
        //.....................................................................................................
        constructor_cfg: {
          db: null,
          prefix: 'drb_',
          schema: 'drb',
          create: false,
          // path:             PATH.join home,      'cmudict.sqlite'
          std_fontnicks: {
            gi: PATH.join(font_path, 'ebgaramond/EBGaramond12-Italic.otf'),
            gr: PATH.join(font_path, 'ebgaramond/EBGaramond12-Regular.otf'),
            amr: PATH.join(font_path, 'amiri/Amiri-Regular.ttf')
          },
          RBW: null
        }
      }
    });

    return Drb;

  }).call(this);

  // #---------------------------------------------------------------------------------------------------------
// _cache_spellings: ->
//   cache = ( @cache.spellings ?= {} )
//   count = 0
//   for line from guy.fs.walk_lines @cfg.paths.spellings
//     continue if line.startsWith '#'
//     line = line.trim()
//     continue if line.length is 0
//     continue unless ( match = line.match /(?<lc>\S+)\s+(?<spelling>.*)$/ )?
//     #.....................................................................................................
//     count++
//     if count > @cfg.max_entry_count
//       warn '^dbay-cmudict/main@3^', "shortcutting at #{@cfg.max_entry_count} entries"
//       break
//     #.....................................................................................................
//     { lc,
//       spelling, } = match.groups
//     lc            = lc.toLowerCase()
//     spelling      = spelling.trimEnd()
//     cache[ lc ]   = spelling
//   return null

}).call(this);

//# sourceMappingURL=main.js.map