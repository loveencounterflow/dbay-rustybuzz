(function() {
  'use strict';
  var CND, PATH, SQL, badge, debug, echo, guy, help, home, info, isa, rpr, type_of, types, urge, validate, validate_list_of, warn, whisper;

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

  //===========================================================================================================
  this.Drb = (function() {
    class Drb {
      // path:             PATH.join home,      'cmudict.sqlite'
      // paths:
      //   cmu:            PATH.join data_path, 'cmudict-0.7b'
      //   beep:           PATH.join data_path, 'beep/beep-1.0'
      //   bf_expansions:  BRITFONE.expansions
      //   bf_main:        BRITFONE.main
      //   bf_symbols:     BRITFONE.symbols
      //   spellings:      PATH.join data_path, 'beep/case.txt'
      //   abipa:          PATH.join data_path, 'arpabet-to-ipa.tsv'
      //   xsipa:          PATH.join data_path, 'xsampa-to-ipa.tsv'
      // create:           false
      // max_entry_count:  Infinity

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
        var db;
        /* called from constructor via `guy.cfg.configure_with_types()` */
        me.cfg = this.cast_constructor_cfg(me);
        me.types.validate.constructor_cfg(me.cfg);
        ({db} = guy.obj.pluck_with_fallback(me.cfg, null, 'db'));
        me.cfg = guy.lft.freeze(guy.obj.omit_nullish(me.cfg));
        guy.props.def(me, 'db', {
          enumerable: false,
          value: db
        });
        guy.props.def(me, 'cache', {
          enumerable: false,
          value: {}
        });
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        guy.cfg.configure_with_types(this, cfg, types);
        this._compile_sql();
        this._create_sql_functions();
        this._open_drb_db();
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _create_db_structure() {
        var prefix, schema;
        ({prefix, schema} = this.cfg);
        //@db.execute SQL"""
        //  drop index if exists #{schema}.entries_word_idx;
        //  drop index if exists #{schema}.entries_ipa_idx;
        //  drop table if exists #{schema}.trlits;
        //  drop table if exists #{schema}.trlit_nicks;
        //  drop table if exists #{schema}.abs_phones;
        //  drop table if exists #{schema}.entries;
        //  drop table if exists #{schema}.source_nicks;
        //  -- ...................................................................................................
        //  vacuum #{schema};
        //  -- ...................................................................................................
        //  create table #{schema}.entries (
        //      id        integer not null primary key,
        //      word      text    not null,
        //      source    text    not null references source_nicks ( nick ),
        //      nr        integer not null default 1,
        //      ipa       text    not null,
        //      ipa_raw   text    not null );
        //  create index #{schema}.entries_word_idx on entries ( word );
        //  create index #{schema}.entries_ipa_idx  on entries ( ipa );
        //  -- ...................................................................................................
        //  create table #{schema}.trlits ( -- trlits: transliterations
        //      ipa         text    not null,
        //      nick        text    not null references trlit_nicks ( nick ),
        //      trlit       text    not null,
        //      example     text,
        //    primary key ( ipa, nick ) );
        //  create table #{schema}.trlit_nicks (
        //      nick        text    not null,
        //      name        text    not null,
        //      comment     text,
        //    primary key ( nick ) );
        //  create table #{schema}.source_nicks (
        //      nick        text    not null,
        //      name        text    not null,
        //      comment     text,
        //    primary key ( nick ) );
        //  """
        //  # -- -- ...................................................................................................
        //  # -- create view #{schema}.abs_phones as select
        //  # --     r1.word   as word,
        //  # --     r2.lnr    as lnr,
        //  # --     r2.rnr    as rnr,
        //  # --     r2.part   as abs1_phone
        //  # --   from
        //  # --     entries                           as r1,
        //  # --     std_str_split_re( r1.abs1, '\s' ) as r2;
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _compile_sql() {
        var prefix, schema, sql;
        ({prefix, schema} = this.cfg);
        sql = {};
        //  get_db_object_count:  SQL"select count(*) as count from #{schema}.sqlite_schema;"
        //  truncate_entries:     SQL"delete from #{schema}.entries where source = $source;"
        //  insert_entry: SQL"""
        //    insert into #{schema}.entries ( word, source, nr, ipa_raw, ipa )
        //      values ( $word, $source, $nr, $ipa_raw, $ipa );"""
        //  insert_trlit: SQL"""
        //    insert into #{schema}.trlits ( ipa, nick, trlit, example )
        //      values ( $ipa, $nick, $trlit, $example );"""
        //  upsert_source_nick: SQL"""
        //    insert into #{schema}.source_nicks ( nick, name, comment )
        //      values ( $nick, $name, $comment )
        //      on conflict ( nick ) do update set
        //        name = excluded.name, comment = excluded.comment;"""
        //  upsert_trlit_nick: SQL"""
        //    insert into #{schema}.trlit_nicks ( nick, name, comment )
        //      values ( $nick, $name, $comment )
        //      on conflict ( nick ) do update set
        //        name = excluded.name, comment = excluded.comment;"""
        //  delete_arpabet_trlits: SQL"""
        //    delete from #{schema}.trlits
        //      where nick in ( 'ab1', 'ab2' );
        //    """
        //  # insert_abs_phones: SQL"""
        //  #   insert into #{schema}.abs_phones ( word, lnr, rnr, abs0_phone, abs1_phone, stress )
        //  #     values ( $word, $lnr, $rnr, $abs0_phone, $abs1_phone, $stress );"""
        guy.props.def(this, 'sql', {
          enumerable: false,
          value: sql
        });
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _create_sql_functions() {
        var prefix, schema;
        ({prefix, schema} = this.cfg);
        // #-------------------------------------------------------------------------------------------------------
        // @db.create_function
        //   name:           prefix + 'ipa_from_abs1'
        //   deterministic:  true
        //   varargs:        false
        //   call:           ( abs1 ) => @ipa_from_abs1( abs1 )
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      // _get_db_object_count:   -> @db.single_value @sql.get_db_object_count
      // _truncate_entries:      ( source ) -> @db @sql.truncate_entries, { source, }
      // _delete_arpabet_trlits: -> @db @sql.delete_arpabet_trlits

        //---------------------------------------------------------------------------------------------------------
      _open_drb_db() {
        this.db.open(this.cfg);
        if (this.cfg.create || (this._get_db_object_count() === 0)) {
          this._create_db_structure();
          this._populate_db();
        } else {
          null;
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _populate_db() {
        return null;
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Drb.C = guy.lft.freeze({
      // replacement:  '█'
      defaults: {
        //.....................................................................................................
        constructor_cfg: {
          db: null,
          prefix: 'drb_',
          schema: 'drb'
        }
      }
    });

    return Drb;

  }).call(this);

  // #---------------------------------------------------------------------------------------------------------
// _populate_cmu_entries: ->
//   count         = 0
//   insert_entry  = @db.prepare @sql.insert_entry
//   source        = 'cmu'
//   @_truncate_entries source
//   @db @sql.upsert_source_nick, { nick: source, name: "CMUdict", comment: "v0.7b", }
//   @db =>
//     for line from guy.fs.walk_lines @cfg.paths.cmu
//       continue if line.startsWith ';;;'
//       line                  = line.trimEnd()
//       [ word, ab, ]         = line.split '\x20\x20'
//       word                  = word.trim()
//       if ( not word? ) or ( word.length is 0 ) or ( not ab? ) or ( ab.length is 0 )
//         warn '^4443^', count, ( rpr line )
//         continue
//       #...................................................................................................
//       count++
//       if count > @cfg.max_entry_count
//         warn '^dbay-cmudict/main@1^', "shortcutting at #{@cfg.max_entry_count} entries"
//         break
//       { word
//         nr    } = @_get_bracketed_nr word
//       word      = word.toLowerCase()
//       word      = @cache.spellings[ word ] ? word ### replace LC variant with correct upper/lower case where found ###
//       ipa_raw   = @ipa_raw_from_arpabet2  ab
//       ipa       = @ipa_from_cmu_ipa_raw       ipa_raw
//       insert_entry.run { word, source, nr, ipa_raw, ipa, }
//     return null
//   return null

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