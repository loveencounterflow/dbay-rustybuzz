


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
  "@isa.unset x.path":                              ( x ) -> @isa.unset x.path
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
@declare 'dbr_gid', ( x ) -> ( @isa.integer x ) and ( x >= -2 ) ### TAINT link with `Dbr.C` ###

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_get_single_outline_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "exactly one of x.sid or ( x.fontnick, x.gid ) is set": ( x ) ->
    ### TAINT when any of the `isa` tests fails, error message is not to the point ###
    if x.sid?
      return false if x.fontnick? or x.gid?
      return @isa.nonempty_text x.sid
    return false unless x.fontnick? and x.gid?
    return false unless @isa.nonempty_text x.fontnick
    return @isa.dbr_gid x.gid

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_arrange_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "@isa.nonempty_text x.fontnick":                  ( x ) -> @isa.nonempty_text x.fontnick
  "@isa.text x.text":                               ( x ) -> @isa.text x.text
  "@isa.integer x.doc":                             ( x ) -> @isa.integer x.doc
  "@isa.integer x.par":                             ( x ) -> @isa.integer x.par
  "@isa.integer x.trk":                             ( x ) -> @isa.integer x.trk
  # "( @isa.float x.size_mm ) and ( 0 <= x.size_mm <= 1000 )": ( x ) -> ( @isa.float x.size_mm ) and ( 0 <= x.size_mm <= 1000 )

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_get_fontmetrics_cfg', tests:
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
@declare 'dbr_compose_cfg', tests:
  "@isa.object x":                                    ( x ) -> @isa.object x
  "@isa.nonempty_text x.fontnick":                    ( x ) -> @isa.nonempty_text x.fontnick
  "@isa.text x.text":                                 ( x ) -> @isa.text x.text
  "@isa.integer x.doc":                               ( x ) -> @isa.integer x.doc
  "@isa.integer x.par":                               ( x ) -> @isa.integer x.par

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_prepare_text_cfg', tests:
  "@isa.object x":                                    ( x ) -> @isa.object x
  "@isa.text x.text":                                 ( x ) -> @isa.text x.text
  "@isa.boolean x.entities":                          ( x ) -> @isa.boolean x.entities
  "@isa.boolean x.hyphenate":                         ( x ) -> @isa.boolean x.hyphenate
  "@isa.boolean x.newlines":                          ( x ) -> @isa.boolean x.newlines
  "@isa.boolean x.uax14":                             ( x ) -> @isa.boolean x.uax14
  "@isa.boolean x.trim":                              ( x ) -> @isa.boolean x.trim
  "@isa.boolean x.chomp":                             ( x ) -> @isa.boolean x.chomp

#-----------------------------------------------------------------------------------------------------------
@declare 'dbr_render_ad_chain_cfg', tests:
  "@isa.object x":                                    ( x ) -> @isa.object x
  "x.format in [ 'compact', ]":                       ( x ) -> x.format in [ 'compact', ]
  "@isa.integer x.doc":                               ( x ) -> @isa.integer x.doc
  "@isa.integer x.par":                               ( x ) -> @isa.integer x.par
  "@isa.integer x.b":                                 ( x ) -> @isa.integer x.b
  "@isa.cardinal x.context":                          ( x ) -> @isa.cardinal x.context
