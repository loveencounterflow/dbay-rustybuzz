


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
  "@isa.boolean x.create":                          ( x ) -> @isa.boolean x.create
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
  "@isa.nonempty_text x.fontnick":                  ( x ) -> @isa.nonempty_text x.fontnick
  "@isa.cardinal x.gid":                            ( x ) -> @isa.cardinal x.gid

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_shape_text_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "@isa.nonempty_text x.fontnick":                  ( x ) -> @isa.nonempty_text x.fontnick
  "@isa.text x.text":                               ( x ) -> @isa.text x.text
  "( @isa.float x.size_mm ) and ( 0 <= x.size_mm <= 1000 )": ( x ) -> ( @isa.float x.size_mm ) and ( 0 <= x.size_mm <= 1000 )

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
  "exactly one of x.chrs, x.cids, x.cgid_map is set": ( x ) ->
    if x.chrs?
      return false unless @isa.dbr_chrs x.chrs
      return ( not x.cids? ) and ( not x.cgid_map? )
    if x.cids?
      return false unless @isa.list x.cids
      return ( not x.chrs? ) and ( not x.cgid_map? )
    return false

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_insert_outlines_cfg', tests:
  "@isa.object x":                                    ( x ) -> @isa.object x
  "@isa.nonempty_text x.fontnick":                    ( x ) -> @isa.nonempty_text x.fontnick
  "exactly one of x.chrs, x.cids, x.cgid_map is set": ( x ) ->
    if x.chrs?
      return false unless @isa.dbr_chrs x.chrs
      return ( not x.cids? ) and ( not x.cgid_map? )
    if x.cids?
      return false unless @isa.list x.cids
      return ( not x.chrs? ) and ( not x.cgid_map? )
    if x.cgid_map?
      return false unless @isa.map x.cgid_map
      return ( not x.chrs? ) and ( not x.cids? )
    return false


