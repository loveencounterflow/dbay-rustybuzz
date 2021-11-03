


'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DBAY-RUSTYBUZZ'
debug                     = CND.get_logger 'debug',     badge
alert                     = CND.get_logger 'alert',     badge
whisper                   = CND.get_logger 'whisper',   badge
warn                      = CND.get_logger 'warn',      badge
help                      = CND.get_logger 'help',      badge
urge                      = CND.get_logger 'urge',      badge
info                      = CND.get_logger 'info',      badge
jr                        = JSON.stringify
Intertype                 = ( require 'intertype' ).Intertype
intertype                 = new Intertype module.exports
dbay_types                = require 'dbay/lib/types'


#-----------------------------------------------------------------------------------------------------------
@declare 'constructor_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "@isa.nonempty_text x.prefix":                    ( x ) -> @isa.nonempty_text x.prefix
  "@isa_optional.nonempty_text x.path":             ( x ) -> @isa_optional.nonempty_text x.path
  "dbay_types.dbay_schema x.schema":                ( x ) -> dbay_types.isa.dbay_schema x.schema
  "@isa.boolean x.rebuild":                         ( x ) -> @isa.boolean x.rebuild
  "( @isa.object x.db ) or ( @isa.function x.db ":  ( x ) -> ( @isa.object x.db ) or ( @isa.function x.db )
  "@isa_optional.object x.RBW":                     ( x ) -> @isa_optional.object x.RBW

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_register_fontnick_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "@isa.nonempty_text x.fontnick":                  ( x ) -> @isa.nonempty_text x.fontnick
  "@isa.nonempty_text x.fspath":                    ( x ) -> @isa.nonempty_text x.fspath

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_prepare_font_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "@isa.nonempty_text x.fontnick":                  ( x ) -> @isa.nonempty_text x.fontnick
  "@isa_optional.nonempty_text x.fspath":           ( x ) -> @isa_optional.nonempty_text x.fspath

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_get_single_outline_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "exactly one of x.sid or ( x.fontnick, x.gid ) is set": ( x ) ->
    if x.sid?
      return false if x.fontnick? or x.gid?
      return @isa.nonempty_text x.sid
    return false unless x.fontnick? and x.gid?
    return false unless @isa.nonempty_text x.fontnick
    return @isa.cardinal x.gid

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_shape_text_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "@isa.nonempty_text x.fontnick":                  ( x ) -> @isa.nonempty_text x.fontnick
  "@isa.text x.text":                               ( x ) -> @isa.text x.text
  # "( @isa.float x.size_mm ) and ( 0 <= x.size_mm <= 1000 )": ( x ) -> ( @isa.float x.size_mm ) and ( 0 <= x.size_mm <= 1000 )

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_get_font_metrics_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "@isa.nonempty_text x.fontnick":                  ( x ) -> @isa.nonempty_text x.fontnick

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_chrs', ( x ) -> ( @isa.text x ) or ( @isa.list x ) ### list of texts, really ###

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_get_cgid_map_cfg', tests:
  "@isa.object x":                                    ( x ) -> @isa.object x
  "@isa.nonempty_text x.fontnick":                    ( x ) -> @isa.nonempty_text x.fontnick
  "exactly one of ( x.chrs, x.cgid_map, x.ads ) is set": ( x ) ->
    if x.chrs?
      return false unless @isa.dbr_chrs x.chrs
      return ( not x.cgid_map? ) and ( not x.ads? )
    if x.cgid_map?
      return @isa.map x.cgid_map
    return @isa.list x.ads

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_insert_outlines_cfg', tests:
  "@isa.object x":                                    ( x ) -> @isa.object x
  "@isa.nonempty_text x.fontnick":                    ( x ) -> @isa.nonempty_text x.fontnick
  "exactly one of ( x.chrs, x.cgid_map, x.ads ) is set": ( x ) ->
    if x.chrs?
      return false unless @isa.dbr_chrs x.chrs
      return ( not x.cgid_map? ) and ( not x.ads? )
      return not x.cgid_map?
    if x.cgid_map?
      return @isa.map x.cgid_map
    return @isa.list x.ads

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_typeset_cfg', tests:
  "@isa.object x":                                    ( x ) -> @isa.object x
  "@isa.nonempty_text x.fontnick":                    ( x ) -> @isa.nonempty_text x.fontnick
  "@isa.text x.text":                                 ( x ) -> @isa.text x.text
  "@isa_optional.object x.known_ods":                 ( x ) -> @isa_optional.object x.known_ods

