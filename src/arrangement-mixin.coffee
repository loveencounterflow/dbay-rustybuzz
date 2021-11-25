


'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DRB/MIXIN/ARRANGEMENT'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
guy                       = require 'guy'
E                         = require './errors'
SQL                       = String.raw
{ width_of
  to_width }              = require 'to-width'
jr                        = JSON.stringify
jp                        = JSON.parse


#-----------------------------------------------------------------------------------------------------------
@Drb_arrangement = ( clasz = Object ) => class extends clasz

  # #---------------------------------------------------------------------------------------------------------
  # constructor: ->
  #   super()
  #   return undefined

  #---------------------------------------------------------------------------------------------------------
  # _$arrangement_initialize: ->

  #---------------------------------------------------------------------------------------------------------
  ### 'arrange()' like 'compose()' and 'distribute()' ###
  shape_text: ( cfg ) ->
    @types.validate.dbr_shape_text_cfg ( cfg = { @constructor.C.defaults.dbr_shape_text_cfg..., cfg..., } )
    ads     = @_shape_text        { cfg..., alt: 1, }
    shy_ads = @_shape_hyphenated  { cfg..., ads, }
    return [ ads..., shy_ads..., ]

  #---------------------------------------------------------------------------------------------------------
  _shape_hyphenated: ( cfg ) ->
    ### TAINT use proper validation ###
    { fontnick
      doc
      par
      ads         } = cfg
    { schema      } = @cfg
    { V, I, L,    } = @sql
    { shy         } = @constructor.C.special_chrs
    R               = []
    #.......................................................................................................
    { alt_max, } = @db.single_row SQL"""
      select max( alt ) as alt_max
      from #{schema}.ads where ( doc = $doc ) and ( par = $par );""", { doc, par, }
    new_alt = alt_max
    #.......................................................................................................
    # urge '^7875^', {  fontnick, doc, par, alt,         }
    # urge '^7875^', 'ads'; console.table @db.all_rows SQL"select * from #{schema}.ads order by doc, par, adi, sgi, alt;"
    for shy_row in @db.all_rows SQL"""
      select adi, sgi from #{schema}.ads
        where true
          and ( doc = $doc )
          and ( par = $par )
          and ( br  = 'shy' )
          and ( alt = $alt );""", { doc, par, alt, }
      ### NOTE `sg_ads`: *S*hape *G*roup *A*rrangement *D*ata item*S* ###
      sg_ads = @db.all_rows SQL"""
        select * from ads
          where true
            and ( doc = $doc )
            and ( par = $par )
            and ( sgi = $sgi )
            and ( alt = $alt )
          order by doc, par, adi;""", { doc, par, sgi: shy_row.sgi, alt, }
      new_alt++
      ### TAINT wrong if there's more than one hyphen ###
      text      = ( ( if ad.adi is shy_row.adi then '- ' else ad.chrs ) for ad in sg_ads ).join ''
      adi_0     = sg_ads[ 0 ].adi
      dx0       = sg_ads[ 0 ].x
      debug '^4874^', shy_row, { adi_0, dx0, }, rpr text
      @_shape_text { cfg..., text, adi_0, dx0, alt: new_alt, }
        # R = [ R..., hhy_ads..., ]
        # # debug '^3345345^', hhy_ads
    #.......................................................................................................
    # urge '^7875^', 'ads'; console.table @db.all_rows SQL"select * from #{schema}.ads order by doc, par, adi, sgi, alt;"
    return R

  #---------------------------------------------------------------------------------------------------------
  _prepare_ads: ( text, fontnick, ads ) ->
    ### As it stands `rustybuzz-wasm` will follow `rustybuzz` in that soft hyphens (SHYs) and word break
    opportunities (WBRs) either get their own arrangement data item (AD) or else are tacked to the *front*
    of one or more letters when they appear in the middle of a ligature (as in `af&shy;firm` with ligature
    `ff` or `ffi`). In order to simplify processing and remove the case distinction, we normalize all cases
    where WBRs and SHYs appear with other material to always make them standalone ADs. ###
    R                 = []
    { special_chrs
      ignored       } = @constructor.C
    bytes             = Buffer.from text, { encoding: 'utf-8', }
    prv_ad            = null
    for ad, adi in ads
      nxt_b     = ads[ adi + 1 ]?.b ? Infinity
      ad.chrs   = bytes[ ad.b ... nxt_b ].toString()
      extra_ad  = null
      has_shy   = false
      has_wbr   = false
      if      ad.chrs.startsWith special_chrs.shy then has_shy = true
      else if ad.chrs.startsWith special_chrs.wbr then has_wbr = true
      if has_shy or has_wbr
        ad.br           = if has_shy then 'shy' else 'wbr'
        if ad.chrs.length > 1 ### NOTE safe b/c we know SHY is BMP codepoint ###
          extra_ad      = { ad..., }
          extra_ad.chrs = ad.chrs[ 1 .. ]
          extra_ad.br   = null
          extra_ad.gid  = ignored.gid
          extra_ad.sid  = "o#{ignored.gid}#{fontnick}"
          ad.chrs       = ad.chrs[ 0 ]
          ad.dx         = 0
          ad.x1         = ad.x
      else if ad.chrs is ' '
        ad.br           = 'spc'
      else if ad.chrs is '-'
        ad.br           = 'hhy'
      R.push ad
      if extra_ad?
        R.push extra_ad
        extra_ad = null
    prv_ad = ad
    return R

  #---------------------------------------------------------------------------------------------------------
  _shape_text: ( cfg ) ->
    { fontnick
      text
      adi_0 ### NOTE optional first AD index ###
      dx0   ### NOTE optional x reference coordinate ###
      doc
      par
      alt
      osgi      } = cfg
    { missing   } = @constructor.C
    adi_0_given   = adi_0?
    adi_0        ?= 0 ### TAINT use validation, defaults ###
    dx0          ?= 0 ### TAINT use validation, defaults ###
    font_idx      = @_font_idx_from_fontnick fontnick
    ads           = @RBW.shape_text { format: 'json', text, font_idx, }
    ads           = JSON.parse ads
    ads           = @_prepare_ads text, fontnick, ads
    #.......................................................................................................
    unless adi_0_given
      ads.unshift {
        doc
        par
        alt
        adi:    0
        sgi:    0
        osgi:   null
        gid:    null
        b:      null
        x:      0
        y:      0
        dx:     0
        dy:     0
        x1:     0
        chrs:   null
        sid:    null
        nobr:   0
        br:     'start' }
    #.......................................................................................................
    ced_x           = 0 # cumulative error displacement from missing outlines
    ced_y           = 0 # cumulative error displacement from missing outlines
    osgi           ?= null
    sgi             = 0
    ### TAINT will not properly handle multiple SHYs in the same segment (this might happen in ligatures
    like `ffi`) ###
    for ad, idx in ads
      continue if ( not adi_0_given ) and ( idx is 0 )
      adi       = adi_0 + idx
      #.....................................................................................................
      sgi++ unless ad.nobr
      ad.doc    = doc
      ad.par    = par
      ad.alt    = alt
      ad.adi    = adi
      ad.sgi    = sgi
      ad.osgi   = osgi
      ad.sid    = "o#{ad.gid}#{fontnick}"
      ad.x     += ced_x
      ad.y     += ced_y
      #.....................................................................................................
      # Replace original metrics with those of missing outline:
      if ad.gid is missing.gid
        if ( width_of ( Array.from ad.chrs )[ 0 ] ) < 2
          width = 500
        else
          width = 1000
        ed_x    = width - ad.dx
        ced_x  += ed_x
        ad.dx   = width
      #.....................................................................................................
      ad.x    = Math.round ad.x + dx0
      ad.y    = Math.round ad.y
      ad.dx   = Math.round ad.dx
      ad.dy   = Math.round ad.dy
      ad.x1   = ad.x + ad.dx
      # debug '^3447^', ( rpr ad.chrs ), to_width ( rpr ad ), 100
    #.......................................................................................................
    unless adi_0_given
      last_adi  = ads.length - 1
      last_ad   = ads[ last_adi ]
      this_adi  = last_adi + 1
      ads.push {
        doc
        par
        alt
        adi:  this_adi
        sgi:  last_ad.sgi + 1
        osgi
        gid:  null
        b:    null
        x:    last_ad.x1
        y:    last_ad.y
        dx:   0
        dy:   0
        x1:   last_ad.x1
        chrs: null
        sid:  null
        nobr: 0
        br:   'end' }
    #.......................................................................................................
    @db =>
      insert_ad = @db.prepare @sql.insert_ad
      for ad, idx in ads
        row         = { br: null, ad..., }
        row.nobr    = if row.nobr then 1 else 0
        ads[ idx ]  = @db.first_row insert_ad, row
      return null
    #.......................................................................................................
    return ads
