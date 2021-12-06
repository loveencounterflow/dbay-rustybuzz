


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
      hyphenate
      newlines
      uax14
      trim
      chomp } = cfg
    R         = R.replace /^\s+$/, ''                   if chomp
    R         = R.replace /\n+/g, '\x20'                if newlines
    R         = R.replace /^\x20*(.*?)\x20*$/, '$1'     if trim
    R         = @_decode_entities R                     if entities
    R         = @_hyphenate R                           if hyphenate
    R         = @_uax14 R                               if uax14
    return R

  #---------------------------------------------------------------------------------------------------------
  _decode_entities: ( text ) ->
    R = text
    R = @RBW.decode_ncrs R
    # else          R = R.replace /&shy;/g, @constructor.C.special_chrs.shy
    R = R.replace /&wbr;/g, @constructor.C.special_chrs.wbr
    R = R.replace /&nl;/g,  @constructor.C.special_chrs.nl
    return R

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
    @types.validate.dbr_render_ad_chain_cfg ( cfg = { @constructor.C.defaults.dbr_render_ad_chain_cfg..., cfg..., } )
    { doc
      par
      b
      context     } = cfg
    { schema      } = @cfg
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
    ids = @db.all_first_values SQL"""
      select
          id
        from #{schema}.ads
        where true
          and ( doc = $doc )
          and ( par = $par )
          and ( alt = 1 )
          and ( b1 between $b - $context and $b + $context )
        order by b1;""", { doc, par, b, context, }
    #.......................................................................................................
    { sgis
      lines     } = @_render_ad_chain { doc, par, ids, }
    R             = lines
    #.......................................................................................................
    for sgi from sgis
      track_ids = @db.all_first_values SQL"""
        select
            *
          from #{schema}.ads
          where true
            and ( doc = $doc )
            and ( par = $par )
            and ( alt > 1 )
            and ( osgi = $sgi )
          order by b1;""", { doc, par, sgi, }
      if track_ids.length > 0
        { lines } = @_render_ad_chain { doc, par, ids: track_ids, }
        R         = [ R..., lines..., ]
    return R.join '\n'

  #---------------------------------------------------------------------------------------------------------
  _render_ad_chain: ({ doc, par, ids, }) ->
    { schema }      = @cfg
    collector       = [ [], [], [], [], [], [], ]
    # widths_sum      = 0
    { V, I, L, }    = @db.sql
    sgis            = new Set()
    prv_sgi         = null
    #.......................................................................................................
    for ad from @db SQL"""
      select
          *
        from ads
        where true
          and ( id in #{V ids} )
        order by b1;"""
      { gid
        chrs
        sgi     } = ad
      sgis.add sgi
      b_t         = ad.b1.toString()
      chrs_t      = ad.chrs
      chrs_t      = chrs_t.replace '\xad', '¬'
      chrs_t      = chrs_t.replace '\x20', '␣'
      gid_t       = ad.gid.toString()
      sgi_t       = if sgi is prv_sgi then '〃' else sgi.toString()
      width       = Math.max 2, ( width_of b_t ), ( width_of chrs_t ), ( width_of gid_t ), ( width_of sgi_t )
      # widths_sum += width
      b_t         = to_width b_t,     width, { align: 'left',   }
      chrs_t      = to_width chrs_t,  width, { align: 'right',  }
      gid_t       = to_width gid_t,   width, { align: 'right',  }
      sgi_t       = to_width sgi_t, width, { align: 'center', }
      h           = '─'.repeat width
      collector[ 0 ].push b_t + ' '
      collector[ 1 ].push     '┬' + h
      collector[ 2 ].push     '│' + chrs_t
      collector[ 3 ].push     '│' + gid_t
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
    lines = ( line.join '' for line in collector )
    return { sgis, lines, }


