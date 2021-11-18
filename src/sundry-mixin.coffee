


'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DRB/MIXIN/SUNDRY'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
guy                       = require 'guy'
E                         = require './errors'
ZLIB                      = require 'zlib'
{ width_of
  to_width }              = require 'to-width'
jr                        = JSON.stringify
jp                        = JSON.parse
HYPH                      = require 'intertext/lib/hyphenation'


#-----------------------------------------------------------------------------------------------------------
@Drb_sundry = ( clasz = Object ) => class extends clasz

  # #---------------------------------------------------------------------------------------------------------
  # constructor: ->
  #   super()
  #   return undefined

  #---------------------------------------------------------------------------------------------------------
  # _$sundry_initialize: ->

  #---------------------------------------------------------------------------------------------------------
  prepare_text: ( cfg ) ->
    @types.validate.dbr_prepare_text_cfg ( cfg = { @constructor.C.defaults.dbr_prepare_text_cfg..., cfg..., } )
    { text: R
      entities
      ncrs
      hyphenate
      newlines
      uax14
      trim
      chomp       } = cfg
    R               = @_decode_entities R, ncrs               if entities
    R               = @_hyphenate R                           if hyphenate
    R               = R.replace /\n+/g, '\x20'                if newlines
    R               = @_uax14 R                               if uax14
    R               = R.replace /^\n+$/, ''                   if chomp
    R               = R.replace /^\x20*(.*?)\x20*$/, '$1'     if trim
    return R

  #---------------------------------------------------------------------------------------------------------
  decode_entities: ( cfg ) ->
    ### ###
    @types.validate.dbr_decode_entities_cfg ( cfg = { @constructor.C.defaults.dbr_decode_entities_cfg..., cfg..., } )
    return @_decode_entities cfg.text, cfg.ncrs

  #---------------------------------------------------------------------------------------------------------
  _decode_entities: ( text, ncrs ) ->
    R               = text
    if ncrs then  R = @RBW.decode_ncrs R
    else          R = R.replace /&shy;/g, @constructor.C.special_chrs.shy
    return R.replace /&wbr;/g, @constructor.C.special_chrs.wbr

  #---------------------------------------------------------------------------------------------------------
  _uax14: ( text ) ->
    text_bfr  = Buffer.from text
    bris      = JSON.parse @RBW.find_line_break_positions text
    parts     = ( ( text_bfr[ bri ... bris[ idx + 1 ] ? Infinity ].toString 'utf-8' ) for bri, idx in bris )
    R         = parts.join @constructor.C.special_chrs.wbr
    ### remove WBR after SHY, SPC? ###
    ### TAINT precompile patterns, always use constants instead of literals ###
    R         = R.replace /\xad\u200b/g, @constructor.C.special_chrs.shy
    R         = R.replace /\x20\u200b/g, '\x20'
    R         = R.replace /\u200b{2,}/g, @constructor.C.special_chrs.wbr
    R         = R.replace /\u200b$/g, ''
    return R

  #---------------------------------------------------------------------------------------------------------
  _hyphenate: ( text ) -> HYPH.hyphenate text





