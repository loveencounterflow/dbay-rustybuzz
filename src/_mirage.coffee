
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
XXHADD                    = require 'xxhash-addon'

#===========================================================================================================
types.declare 'constructor_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "( @isa.object x.db ) or ( @isa.function x.db ":  ( x ) -> ( @isa.object x.db ) or ( @isa.function x.db )

#-----------------------------------------------------------------------------------------------------------
types.declare 'mrg_refresh_datasource_cfg', tests:
  "@isa.object x":                ( x ) -> @isa.object x
  "@isa.nonempty_text x.dsk":     ( x ) -> @isa.nonempty_text x.dsk
  "@isa.boolean x.force":         ( x ) -> @isa.boolean x.force


#===========================================================================================================
class @Mrg

  #---------------------------------------------------------------------------------------------------------
  @C: GUY.lft.freeze
    defaults:
      #.....................................................................................................
      constructor_cfg:
        db:               null
        prefix:           'mrg'
        loc_pattern:      /<mrg:loc#(?<id>[_a-zA-Z][-_a-zA-Z0-9]*)\/>/g
        # schema:           'mrg'
      #.....................................................................................................
      mrg_refresh_datasource_cfg:
        dsk:              null
        force:            false

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
        line    text    not null,
        foreign key ( dsk ) references #{prefix}_datasources,
        primary key ( dsk, lnr ) );
      -- ...................................................................................................
      create table #{prefix}_locs (
        dsk     text    not null,
        loci    text    not null,
        lnr     integer not null,
        foreign key ( dsk ) references #{prefix}_datasources,
        primary key ( dsk, loci ) );
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
      loc_pattern } = @cfg
    { path
      digest      } = @_ds_entry_from_dsk dsk
    current_digest  = GUY.fs.get_content_hash path
    counts          = { files: 0, bytes: 0, }
    if force or ( digest isnt current_digest )
      @db =>
        @_delete_lines dsk
        insert_line = @db.prepare @sql.insert_line
        lnr         = 0
        for line from GUY.fs.walk_lines path, { decode: false, }
          lnr++
          counts.bytes += line.length
          line          = line.toString 'utf-8'
          for match from line.matchAll loc_pattern
            { id: loc_id, } = match.groups
            debug '^54949^', { lnr, line, loc_id, }
          insert_line.run { dsk, lnr, line, }
        counts.files++
        @_update_digest dsk, current_digest
        return null
    return counts


















