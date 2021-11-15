
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DBAY-RUSTYBUZZ'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
PATH                      = require 'path'
types                     = require './types'
{ isa
  type_of
  validate
  validate_list_of }      = types.export()
SQL                       = String.raw
guy                       = require 'guy'
home                      = PATH.resolve PATH.join __dirname, '..'
# data_path                 = PATH.join home, 'data'
{ Drb_outlines }          = require './outlines-mixin'
{ Drb_codepoints }        = require './codepoints-mixin'
{ Drb_distribution }      = require './distribution-mixin'
font_path                 = PATH.resolve PATH.join __dirname, '../fonts'
ZLIB                      = require 'zlib'
{ Hollerith, }            = require 'icql-dba-hollerith'


#===========================================================================================================
class @Drb extends Drb_outlines Drb_distribution Drb_codepoints()

  #---------------------------------------------------------------------------------------------------------
  @C: guy.lft.freeze
    # replacement:  '█'
    last_fontidx:       15
    zlib_zip_cfg:       { level: 1, strategy: ZLIB.constants.Z_HUFFMAN_ONLY, }
    ### TAINT try to reorder specials for better comprehension ###
    # special:
    #   missing:
    #     gid:    0
    #   ignored:
    #     gid:   -1
    gids:
      '-2':           'reserved'  # for future purposes
      '-1':           'ignored'   # for ADs that intentionally have no outline (but may appear in debugging)
      '0':            'missing'   # font cannot render this codepoint
    ignored:
      gid:             -1
    missing:
      gid:              0
    special_chrs:
      hhy:              '\u{002d}' # hard hyphen
      shy:              '\u{00ad}' # soft hyphen
      wbr:              '\u{200b}' # word break opportunity (as in `foo/bar` with a WBR after the slash)
    defaults:
      #.....................................................................................................
      dbr_register_fontnick_cfg:
        fontnick:         null
        fspath:           null
      #.....................................................................................................
      dbr_prepare_font_cfg:
        fontnick:         null
        gid:              null
      #.....................................................................................................
      dbr_get_cgid_map_cfg:
        fontnick:         null
        cids:             null
        chrs:             null
        ads:              null
      #.....................................................................................................
      dbr_insert_outlines_cfg:
        fontnick:         null
        cgid_map:         null
        cids:             null
        chrs:             null
        ads:              null
      #.....................................................................................................
      dbr_get_single_outline_cfg:
        fontnick:         null
        gid:              null
        sid:              null
      #.....................................................................................................
      dbr_shape_text_cfg:
        fontnick:         null
        text:             null
        doc:              null
        par:              null
        vrt:              null
      #.....................................................................................................
      dbr_get_font_metrics_cfg:
        fontnick:         null
      #.....................................................................................................
      dbr_compose_cfg:
        fontnick:         null
        text:             null
        known_ods:        null
      #.....................................................................................................
      constructor_cfg:
        db:               null
        prefix:           'drb_'
        schema:           'drb'
        rebuild:          false
        # path:             PATH.join home,      'cmudict.sqlite'
        std_fontnicks:
          gi:               PATH.join font_path, 'ebgaramond/EBGaramond12-Italic.otf'
          gr:               PATH.join font_path, 'ebgaramond/EBGaramond12-Regular.otf'
          amr:              PATH.join font_path, 'amiri/Amiri-Regular.ttf'
          hora:             PATH.join font_path, 'schäffel.ch/2002_horatius.otf'
          b42:              PATH.join font_path, 'schäffel.ch/1455_gutenberg_b42.otf'
        RBW:              null

  #---------------------------------------------------------------------------------------------------------
  @cast_constructor_cfg: ( me, cfg = null ) ->
    clasz           = me.constructor
    R               = cfg ? me.cfg
    # #.......................................................................................................
    # if R.path?
    #   R.temporary  ?= false
    #   R.path        = PATH.resolve R.path
    # else
    #   R.temporary  ?= true
    #   filename        = me._get_random_filename()
    #   R.path        = PATH.resolve PATH.join clasz.C.autolocation, filename
    return R

  #---------------------------------------------------------------------------------------------------------
  @declare_types: ( me ) ->
    ### called from constructor via `guy.cfg.configure_with_types()` ###
    me.cfg        = @cast_constructor_cfg me
    me.types.validate.constructor_cfg me.cfg
    #.......................................................................................................
    if me.cfg.RBW?  then  { RBW, }  = guy.obj.pluck_with_fallback me.cfg, null, 'RBW'
    else                    RBW     = require 'rustybuzz-wasm'
    guy.props.hide me, 'RBW', RBW
    #.......................................................................................................
    { db, }       = guy.obj.pluck_with_fallback me.cfg, null, 'db'
    me.cfg        = guy.lft.freeze guy.obj.omit_nullish me.cfg
    guy.props.hide me, 'db',     db
    guy.props.hide me, 'cache',  {}
    return null

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    super()
    guy.cfg.configure_with_types @, cfg, types
    @_create_sql_functions()
    @_compile_sql()
    @hollerith = new Hollerith { dba: @db, }
    @_$outlines_initialize?()
    @_$distribution_initialize?()
    @_$codepoints_initialize?()
    @_open_drb_db()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _create_db_structure: ->
    { prefix
      schema    } = @cfg
    #.......................................................................................................
    @db.execute SQL"""
      drop table if exists #{schema}.outlines;
      drop table if exists #{schema}.fontnicks;
      drop table if exists #{schema}.ads;
      drop view  if exists #{schema}.current_brp;
      drop view  if exists #{schema}.current_brps;
      -- ...................................................................................................
      vacuum #{schema};
      -- ...................................................................................................
      create table #{schema}.fontnicks (
          fontnick    text    not null,
          fspath      text    not null,
        primary key ( fontnick ) );
      -- ...................................................................................................
      create table #{schema}.outlines (
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
          pd        text generated always as ( #{prefix}unzip( pd_blob ) ) virtual,
          pd_blob   blob    not null,
          primary key ( fontnick, gid ) );
      -- ...................................................................................................
      create table #{schema}.ads (
          doc     integer generated always as ( #{prefix}vnr_pick( vnr, 1 ) ) virtual not null, -- document idx
          par     integer generated always as ( #{prefix}vnr_pick( vnr, 2 ) ) virtual not null, -- paragraph idx
          adi     integer generated always as ( #{prefix}vnr_pick( vnr, 3 ) ) virtual not null, -- arr. dat. idx
          sgi     integer not null, -- segment idx, a segment being a suite of ADs that must be reshaped if broken
          vrt     integer generated always as ( #{prefix}vnr_pick( vnr, 4 ) ) virtual not null, -- variant idx
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
          nobr    boolean not null,
          br      text,
          lnr     integer not null default 0 -- line number
          -- primary key ( doc, par, adi, vrt )
          );
      create view #{schema}.brps as select
          *,
          #{prefix}get_deviation( x1 ) as deviation
        from #{schema}.ads
        where br is not null;
      create view #{schema}.shy_brps as select
          *,
          #{prefix}get_deviation( x1 ) as deviation
        from #{schema}.ads
        where br is 'shy';
      """
    @hollerith.alter_table { schema, table_name: 'ads', }
    return null

  #---------------------------------------------------------------------------------------------------------
  _compile_sql: ->
    { prefix
      schema }  = @cfg
    #.......................................................................................................
    guy.props.hide @, 'sql',
      #.....................................................................................................
      get_db_object_count:  SQL"select count(*) as count from #{schema}.sqlite_schema;"
      #.....................................................................................................
      upsert_fontnick: @db.create_insert {
        schema,
        into:   'fontnicks',
        fields: [ 'fontnick', 'fspath', ],
        on_conflict: { update: true, }, }
      #.....................................................................................................
      insert_outline: @db.create_insert {
        schema,
        into:       'outlines',
        fields:     [ 'fontnick', 'gid', 'chrs', 'x', 'y', 'x1', 'y1', 'pd_blob', ],
        returning:  '*',
        on_conflict: { update: true, }, }
      #.....................................................................................................
      fspath_from_fontnick: SQL"select fspath from fontnicks where fontnick = $fontnick;"
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _create_sql_functions: ->
    { prefix
      schema } = @cfg
    #-------------------------------------------------------------------------------------------------------
    @db.create_function
      name:           prefix + 'unzip'
      deterministic:  true
      varargs:        false
      call:           ( pd_bfr ) => @_unzip pd_bfr
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _get_db_object_count:   -> @db.single_value @sql.get_db_object_count
  # _truncate_entries:      ( source ) -> @db @sql.truncate_entries, { source, }
  # _delete_arpabet_trlits: -> @db @sql.delete_arpabet_trlits

  #---------------------------------------------------------------------------------------------------------
  _open_drb_db: ->
    @db.open @cfg
    if @cfg.rebuild or ( @_get_db_object_count() is 0 )
      @_create_db_structure()
      @_populate_db()
    return null

  #---------------------------------------------------------------------------------------------------------
  _populate_db: ->
    @_prepopulate_fontnicks()
    return null

  #---------------------------------------------------------------------------------------------------------
  _prepopulate_fontnicks: ->
    upsert_fontnick = @db.prepare @sql.upsert_fontnick
    @db =>
      for fontnick, fspath of @cfg.std_fontnicks
        @db upsert_fontnick, { fontnick, fspath, }
    return null

  # #---------------------------------------------------------------------------------------------------------
  # _cache_spellings: ->
  #   cache = ( @cache.spellings ?= {} )
  #   count = 0
  #   for line from guy.fs.walk_lines @cfg.paths.spellings
  #     continue if line.startsWith '#'
  #     line = line.trim()
  #     continue if line.length is 0
  #     continue unless ( match = line.match /(?<lc>\S+)\s+(?<spelling>.*)$/ )?
  #     #.....................................................................................................
  #     count++
  #     if count > @cfg.max_entry_count
  #       warn '^dbay-cmudict/main@3^', "shortcutting at #{@cfg.max_entry_count} entries"
  #       break
  #     #.....................................................................................................
  #     { lc,
  #       spelling, } = match.groups
  #     lc            = lc.toLowerCase()
  #     spelling      = spelling.trimEnd()
  #     cache[ lc ]   = spelling
  #   return null


