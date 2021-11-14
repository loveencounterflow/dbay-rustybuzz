(function() {
  'use strict';
  var CND, Drb_codepoints, Drb_distribution, Drb_outlines, Hollerith, PATH, SQL, ZLIB, badge, debug, echo, font_path, guy, help, home, info, isa, rpr, type_of, types, urge, validate, validate_list_of, warn, whisper;

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

  ({Drb_codepoints} = require('./codepoints-mixin'));

  ({Drb_distribution} = require('./distribution-mixin'));

  font_path = PATH.resolve(PATH.join(__dirname, '../fonts'));

  ZLIB = require('zlib');

  ({Hollerith} = require('icql-dba-hollerith'));

  //===========================================================================================================
  this.Drb = (function() {
    class Drb extends Drb_outlines(Drb_distribution(Drb_codepoints())) {
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
        this.hollerith = new Hollerith({
          dba: this.db
        });
        if (typeof this._$outlines_initialize === "function") {
          this._$outlines_initialize();
        }
        if (typeof this._$distribution_initialize === "function") {
          this._$distribution_initialize();
        }
        if (typeof this._$codepoints_initialize === "function") {
          this._$codepoints_initialize();
        }
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
    sid       text generated always as ( 'o' || gid || fontnick ) virtual,
    chrs      text,
    /* Shape ID (SID): */
    /* bounding box */
    x         float   not null,
    y         float   not null,
    x1        float   not null,
    y1        float   not null,
    /* PathData (PD): */
    pd        text generated always as ( ${prefix}unzip( pd_blob ) ) virtual,
    pd_blob   blob    not null,
    primary key ( fontnick, gid ) );
-- ...................................................................................................
drop table if exists ${schema}.ads;
drop view if exists ${schema}.brps;
drop view if exists ${schema}.shy_brps;
create table ${schema}.ads (
    doc     integer generated always as ( ${prefix}vnr_pick( vnr, 1 ) ) virtual not null, -- document idx
    par     integer generated always as ( ${prefix}vnr_pick( vnr, 2 ) ) virtual not null, -- paragraph idx
    adi     integer generated always as ( ${prefix}vnr_pick( vnr, 3 ) ) virtual not null, -- arr. dat. idx
    vrt     integer generated always as ( ${prefix}vnr_pick( vnr, 4 ) ) virtual not null, -- variant idx
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
    -- cadi_1  integer not null, -- first ADI of cluster
    -- cadi_2  integer not null, -- last  ADI of cluster
    nobr    boolean not null,
    br      text
    -- primary key ( doc, par, adi, vrt )
    );
create view ${schema}.brps as select
    *,
    ${prefix}get_deviation( x1 ) as deviation
  from ${schema}.ads
  where br is not null;
create view ${schema}.shy_brps as select
    *,
    ${prefix}get_deviation( x1 ) as deviation
  from ${schema}.ads
  where br is 'shy';`);
        this.hollerith.alter_table({
          schema,
          table_name: 'ads'
        });
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
            fields: ['fontnick', 'gid', 'chrs', 'x', 'y', 'x1', 'y1', 'pd_blob'],
            returning: '*',
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
        if (this.cfg.rebuild || (this._get_db_object_count() === 0)) {
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
      missing: {
        gid: 0
      },
      special_chrs: {
        shy: '\u{00ad}',
        wbr: '\u{200b}'
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
        dbr_get_cgid_map_cfg: {
          fontnick: null,
          cids: null,
          chrs: null,
          ads: null
        },
        //.....................................................................................................
        dbr_insert_outlines_cfg: {
          fontnick: null,
          cgid_map: null,
          cids: null,
          chrs: null,
          ads: null
        },
        //.....................................................................................................
        dbr_get_single_outline_cfg: {
          fontnick: null,
          gid: null,
          sid: null
        },
        //.....................................................................................................
        dbr_shape_text_cfg: {
          fontnick: null,
          text: null,
          doc: null,
          par: null,
          vrt: null
        },
        //.....................................................................................................
        dbr_get_font_metrics_cfg: {
          fontnick: null
        },
        //.....................................................................................................
        dbr_compose_cfg: {
          fontnick: null,
          text: null,
          known_ods: null
        },
        //.....................................................................................................
        constructor_cfg: {
          db: null,
          prefix: 'drb_',
          schema: 'drb',
          rebuild: false,
          // path:             PATH.join home,      'cmudict.sqlite'
          std_fontnicks: {
            gi: PATH.join(font_path, 'ebgaramond/EBGaramond12-Italic.otf'),
            gr: PATH.join(font_path, 'ebgaramond/EBGaramond12-Regular.otf'),
            amr: PATH.join(font_path, 'amiri/Amiri-Regular.ttf'),
            hora: PATH.join(font_path, 'schäffel.ch/2002_horatius.otf'),
            b42: PATH.join(font_path, 'schäffel.ch/1455_gutenberg_b42.otf')
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