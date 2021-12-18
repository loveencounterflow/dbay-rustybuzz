
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DBAY-RUSTYBUZZ/MIRAGE'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
PATH                      = require 'path'
types                     = new ( require 'intertype' ).Intertype()
{ isa
  type_of
  validate
  validate_list_of }      = types.export()
SQL                       = String.raw
GUY                       = require 'guy'


#===========================================================================================================
types.declare 'constructor_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "( @isa.object x.db ) or ( @isa.function x.db ":  ( x ) -> ( @isa.object x.db ) or ( @isa.function x.db )

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_refresh_datasource_cfg', tests:
  "@isa.object x":                ( x ) -> @isa.object x
  "@isa.nonempty_text x.dsk":     ( x ) -> @isa.nonempty_text x.dsk
  "@isa.boolean x.force":         ( x ) -> @isa.boolean x.force

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_append_to_loc_cfg', tests:
  "@isa.object x":                ( x ) -> @isa.object x
  "@isa.nonempty_text x.dsk":     ( x ) -> @isa.nonempty_text x.dsk
  "@isa.nonempty_text x.locid":   ( x ) -> @isa.nonempty_text x.locid
  "@isa.text x.text":             ( x ) -> @isa.text x.text

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_walk_line_rows_cfg', tests:
  "@isa.object x":                ( x ) -> @isa.object x
  "@isa.nonempty_text x.dsk":     ( x ) -> @isa.nonempty_text x.dsk


#===========================================================================================================
class @Mrg

  #---------------------------------------------------------------------------------------------------------
  @C: GUY.lft.freeze
    defaults:
      #.....................................................................................................
      constructor_cfg:
        db:               null
        prefix:           'mrg'
        loc_splitter:     /(<mrg:loc#[_a-zA-Z][-_a-zA-Z0-9]*\/>)/g
        locid_re:         /#(?<locid>[^\/]+)/
      #.....................................................................................................
      mrg_refresh_datasource_cfg:
        dsk:              null
        force:            false
      #.....................................................................................................
      mrg_append_to_loc_cfg:
        dsk:              null
      #.....................................................................................................
      mrg_walk_line_rows_cfg:
        dsk:              null
        locid:            null
        text:             null

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    @cfg    = { @constructor.C.defaults.constructor_cfg..., cfg..., }
    GUY.props.hide @, 'types', types
    @types.validate.constructor_cfg @cfg
    { db, } = GUY.obj.pluck_with_fallback @cfg, null, 'db'
    GUY.props.hide @, 'db', db
    @cfg    = GUY.lft.freeze @cfg
    @_create_sql_functions?()
    @_compile_sql?()
    @_procure_infrastructure?()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _procure_infrastructure: ->
    ### TAINT skip if tables found ###
    { prefix } = @cfg
    @db SQL"""
      drop table if exists #{prefix}_mirror;
      drop table if exists #{prefix}_datasources;
      -- ...................................................................................................
      create table #{prefix}_datasources (
        dsk     text not null,
        path    text not null,
        digest  text default null,
        primary key ( dsk ) );
      -- ...................................................................................................
      create table #{prefix}_mirror (
        dsk     text    not null,
        lnr     integer not null,
        lnpart  integer not null default 0,
        xtra    integer not null default 0,
        isloc   boolean not null default 0,
        line    text    not null,
        foreign key ( dsk ) references #{prefix}_datasources,
        primary key ( dsk, lnr, lnpart, xtra ) );
      -- ...................................................................................................
      create table #{prefix}_locs (
        dsk     text    not null,
        locid   text    not null,
        lnr     integer not null,
        lnpart  integer not null,
        foreign key ( dsk ) references #{prefix}_datasources,
        primary key ( dsk, locid ) );
      """

  #---------------------------------------------------------------------------------------------------------
  _compile_sql: ->
    { prefix } = @cfg
    #.......................................................................................................
    GUY.props.hide @, 'sql',
      #.....................................................................................................
      get_db_object_count:  SQL"""
        select count(*) as count from sqlite_schema where starts_with( $name, $prefix_ );"""
      #.....................................................................................................
      ds_entry_from_dsk:  SQL"""
        select * from #{prefix}_datasources where dsk = $dsk;"""
      #.....................................................................................................
      update_digest: SQL"""
        update #{prefix}_datasources set digest = $digest where dsk = $dsk;"""
      #.....................................................................................................
      delete_lines: SQL"""
        delete from #{prefix}_mirror where dsk = $dsk;"""
      #.....................................................................................................
      upsert_datasource: @db.create_insert {
        into:   prefix + '_datasources',
        fields: [ 'dsk', 'path', ],
        on_conflict: { update: true, }, }
      #.....................................................................................................
      insert_line: @db.create_insert {
        into:       prefix + '_mirror',
        fields:     [ 'dsk', 'lnr', 'line', ], }
      #.....................................................................................................
      insert_lnpart: @db.create_insert {
        into:       prefix + '_mirror',
        fields:     [ 'dsk', 'lnr', 'lnpart', 'isloc', 'line', ], }
      #.....................................................................................................
      insert_xtra: @db.create_insert {
        into:       prefix + '_mirror',
        fields:     [ 'dsk', 'lnr', 'lnpart', 'xtra', 'line', ],
        returning:  '*', }
      #.....................................................................................................
      insert_locid: @db.create_insert {
        into:       prefix + '_locs',
        fields:     [ 'dsk', 'locid', 'lnr', 'lnpart', ], }
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  register_dsk: ( cfg ) ->
    # { dsk, path, }  = cfg
    @db @sql.upsert_datasource, cfg
    return null

  #---------------------------------------------------------------------------------------------------------
  _ds_entry_from_dsk: ( dsk ) -> @db.single_row @sql.ds_entry_from_dsk, { dsk, }
  _update_digest: ( dsk, digest ) -> @db @sql.update_digest, { dsk, digest, }
  _delete_lines: ( dsk ) -> @db @sql.delete_lines, { dsk, }

  #---------------------------------------------------------------------------------------------------------
  refresh_datasource: ( cfg ) ->
    validate.mrg_refresh_datasource_cfg ( cfg = { @constructor.C.defaults.mrg_refresh_datasource_cfg..., cfg..., } )
    { dsk         
      force       } = cfg
    { prefix
      loc_splitter
      locid_re   } = @cfg
    { path
      digest      } = @_ds_entry_from_dsk dsk
    current_digest  = GUY.fs.get_content_hash path
    counts          = { files: 0, bytes: 0, }
    #.......................................................................................................
    if force or ( digest isnt current_digest )
      #.....................................................................................................
      @db =>
        @_delete_lines dsk
        insert_line   = @db.prepare @sql.insert_line
        insert_lnpart = @db.prepare @sql.insert_lnpart
        insert_locid  = @db.prepare @sql.insert_locid
        lnr           = 0
        #...................................................................................................
        for line from GUY.fs.walk_lines path, { decode: false, }
          lnr++
          counts.bytes   += line.length
          line            = line.toString 'utf-8'
          parts           = line.split loc_splitter
          if parts.length is 1
            insert_line.run { dsk, lnr, line, }
          else
            isloc   = true
            lnpart  = 0
            for part in parts
              lnpart++
              if ( isloc = not isloc )
                { locid, }  = ( part.match locid_re ).groups
                insert_locid.run  { dsk, lnr, lnpart, locid, }
                insert_lnpart.run   { dsk, lnr, lnpart, isloc: 1, line: part, }
              else
                insert_lnpart.run { dsk, lnr, lnpart, isloc: 0, line: part, }
        #...................................................................................................
        counts.files++
        @_update_digest dsk, current_digest
        return null
    #.......................................................................................................
    return counts


  #=========================================================================================================
  # CONTENT RETRIEVAL
  #---------------------------------------------------------------------------------------------------------
  walk_line_rows: ( cfg ) ->
    validate.mrg_walk_line_rows_cfg ( cfg = { @constructor.C.defaults.mrg_walk_line_rows_cfg..., cfg..., } )
    { dsk     } = cfg
    { prefix  } = @cfg
    return @db SQL"""
      select distinct
          dsk                                             as dsk,
          lnr                                             as lnr,
          coalesce( group_concat( line, '' ) over w, '' ) as line
        from #{prefix}_mirror
        where true
          and ( dsk = $dsk )
          -- and ( not isloc )
        window w as (
          partition by lnr
          order by lnpart, xtra
          range between unbounded preceding and unbounded following );
      """, { dsk, }

  #=========================================================================================================
  # CONTENT MANIPULATION
  #---------------------------------------------------------------------------------------------------------
  append_to_loc: ( cfg ) ->
    validate.mrg_append_to_loc_cfg ( cfg = { @constructor.C.defaults.mrg_append_to_loc_cfg..., cfg..., } )
    { dsk
      locid
      text    } = cfg
    { prefix  } = @cfg
    insert_xtra = @db.prepare @sql.insert_xtra
    ### Given a datasource `dsk` and a location ID `locid`, find the line and line part numbers, `lnr` and
    `lnpart`. This is possible because when inserting, we split up the line into several parts such that
    each location marker got its own line part separate from any other material: ###
    return @db =>
      { lnr, lnpart, } = @db.single_row SQL"""
        select
            lnr,
            lnpart
          from #{prefix}_locs
          where true
            and ( dsk   = $dsk    )
            and ( locid = $locid  )
          limit 1;""", { dsk, locid, }
      ### Given a datasource `dsk`, a line number `lnr` and a line part number `lnpart`, find the previous and
      next extra material numbers `prv_xtra`, `nxt_xtra`:  ###
      urge '^4545689^'; console.table @db.all_rows SQL"""
        select
            dsk,
            lnr,
            lnpart,
            $locid          as locid,
            min( xtra ) - 1 as prv_xtra,
            max( xtra ) + 1 as nxt_xtra
          from #{prefix}_mirror
          where true
            and ( dsk     = $dsk      )
            and ( lnr     = $lnr      )
            and ( lnpart  = $lnpart   )
          limit 1;""", { dsk, locid, lnr, lnpart, }
      { prv_xtra, nxt_xtra, } = @db.single_row SQL"""
        select
            min( xtra ) - 1 as prv_xtra,
            max( xtra ) + 1 as nxt_xtra
          from #{prefix}_mirror
          where true
            and ( dsk     = $dsk      )
            and ( lnr     = $lnr      )
            and ( lnpart  = $lnpart   )
          limit 1;""", { dsk, locid, lnr, lnpart, }
      console.table [{ dsk, locid, lnr, lnpart, prv_xtra, nxt_xtra, }]
      ### Insert the material at the appropriate point: ###
      return @db.first_row insert_xtra, { dsk, locid, lnr, lnpart, xtra: nxt_xtra, line: text, }

















