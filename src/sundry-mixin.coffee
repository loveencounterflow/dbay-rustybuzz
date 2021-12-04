


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
SQL                       = String.raw


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


  #=========================================================================================================
  # VISUALIZATION
  #---------------------------------------------------------------------------------------------------------
  render_ad_chain: ( cfg ) ->
    @types.validate.dbr_render_ad_chain_cfg ( cfg = { @constructor.C.defaults.dbr_render_ad_chain_cfg..., cfg..., } )
    #.......................................................................................................
    { doc
      par
      b
      context }     = cfg
    { schema }      = @cfg
    collector       = [ [], [], [], [], [], [], ]
    # widths_sum      = 0
    sgis            = new Set()
    prv_sgi         = null
    #.......................................................................................................
    row = @db.first_row SQL"""
      select
          id
        from #{schema}.ads
        where true
          and ( doc = $doc )
          and ( par = $par )
          and ( alt = 1 )
          and ( b1 between $b - 10 and $b + 10 )
        order by abs( b1 - $b ), id
        limit 1;""", { doc, par, b, }
    throw new E.Dbr_value_error '^Drb/sundry@1^', 'b', b, "no suitable row in table #{schema}.ads" unless row?
    { id, } = row
    #.......................................................................................................
    for ad from @db SQL"""
      select
          *
        from ads
        where true
          and ( alt = 1 )
          and ( id between $id - $context and $id + $context )
        order by b1;""", { id, context, }
      { gid
        chrs
        sgi     } = ad
      sgis.add sgi
      b           = ad.b1.toString()
      chrs        = ad.chrs
      chrs        = chrs.replace '\xad', '¬'
      chrs        = chrs.replace '\x20', '␣'
      gid         = ad.gid.toString()
      sgi_t       = if sgi is prv_sgi then '〃' else sgi.toString()
      width       = Math.max 1, ( width_of b ), ( width_of chrs ), ( width_of gid ), ( width_of sgi_t )
      # widths_sum += width
      b           = to_width b,     width, { align: 'left',   }
      chrs        = to_width chrs,  width, { align: 'right',  }
      gid         = to_width gid,   width, { align: 'right',  }
      sgi_t       = to_width sgi_t, width, { align: 'center', }
      h           = '─'.repeat width
      collector[ 0 ].push b + ' '
      collector[ 1 ].push     '┬' + h
      collector[ 2 ].push     '│' + chrs
      collector[ 3 ].push     '│' + gid
      collector[ 4 ].push     '┴' + h
      collector[ 5 ].push     ' ' + sgi_t
      prv_sgi     = sgi
    collector[ 0 ].push ' '
    collector[ 1 ].push '┬'
    collector[ 2 ].push '│'
    collector[ 3 ].push '│'
    collector[ 4 ].push '┴'
    collector[ 5 ].push ' '
    #.......................................................................................................
    debug '^77890^', sgis
    #.......................................................................................................
    return ( line.join '' for line in collector ).join '\n'


