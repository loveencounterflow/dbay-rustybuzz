


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
  arrange: ( cfg ) ->
    @types.validate.dbr_arrange_cfg ( cfg = { @constructor.C.defaults.dbr_arrange_cfg..., cfg..., } )
    ads     = @_shape_text        { cfg..., trk: 1, }
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
    left_ads        = []
    right_ads       = []
    #.......................................................................................................
    { trk_max, } = @db.single_row SQL"""
      select max( trk ) as trk_max
      from #{schema}.ads where ( doc = $doc ) and ( par = $par );""", { doc, par, }
    new_trk = trk_max
    #.......................................................................................................
    for { shy_b1, shy_sgi, } in @db.all_rows SQL"""
      select b1 as shy_b1, sgi as shy_sgi from #{schema}.ads
        where true
          and ( doc = $doc )
          and ( par = $par )
          and ( br  in ( 'shy', 'wbr' ) )
          and ( trk = 1 );""", { doc, par, }
      #.....................................................................................................
      # First batch: Characters in same shape group as SHY, up to the shy, with an added hyphen:
      { text, b1, b2, dx0, } = @db.first_row SQL"""
        select
            coalesce(
              group_concat( case when br = 'shy' then '' else chrs end, '' ),
              '' ) || case when br = 'shy' then '-' else '' end               as text,
            min( x )                                                          as dx0,
            min( b1 )                                                         as b1,
            max( b2 )                                                         as b2
          from ads
          where true
            and ( doc = $doc )
            and ( par = $par )
            and ( sgi = $shy_sgi )
            and ( b1 <= $shy_b1 )
            and ( trk = 1 )
          order by b1, id;""", { doc, par, shy_b1, shy_sgi, }
      urge '^arg740-1^', { shy_b1, shy_sgi, dx0, text, new_trk, }
      new_trk++
      left_ads      = @_shape_text { cfg..., text, b1, b2, dx0, trk: new_trk, osgi: shy_sgi, }
      urge '^arg740-2^', "left_ads"; console.table left_ads
      # last_left_ad  = left_ads[ left_ads.length - 1 ]
      #.....................................................................................................
      { text, b1, b2, dx2, } = @db.first_row SQL"""
        select
            coalesce(
              group_concat( case when br = 'shy' then '' else chrs end, '' ),
              '' )                    as text,
            max( x1 )                 as dx2,
            min( b1 )                 as b1,
            max( b2 )                 as b2
          from ads
          where true
            and ( doc = $doc )
            and ( par = $par )
            and ( sgi = $shy_sgi )
            and ( b1  > $shy_b1 )
            and ( trk = 1 )
          order by b1, id;""", { doc, par, shy_b1, shy_sgi, }
      info '^arg740-3^', { text, dx2, }
      if text isnt ''
        urge '^arg740-4^', { shy_b1, shy_sgi, dx2, text, new_trk, }
        right_ads = @_shape_text { cfg..., text, b1, b2, dx2, trk: new_trk, osgi: shy_sgi, }
        urge '^arg740-5^', "right_ads"; console.table right_ads
      urge '^arg740-6^'
    #.......................................................................................................
    return [ left_ads..., right_ads..., ]

  #---------------------------------------------------------------------------------------------------------
  _prepare_ads: ( text, fontnick, ads ) ->
    ### As it stands `rustybuzz-wasm` will follow `rustybuzz` in that soft hyphens (SHYs) and word break
    opportunities (WBRs) either get their own arrangement data item (AD) or else are tacked to the *front*
    of one or more letters when they appear in the middle of a ligature (as in `af&shy;firm` with ligature
    `ff` or `ffi`). In order to simplify processing and remove the case distinction, we normalize all cases
    where WBRs and SHYs appear with other material to always make them standalone ADs. ###
    R                 = []
    { specials      } = @constructor.C
    bytes             = Buffer.from text, { encoding: 'utf-8', }
    prv_ad            = null
    for ad, idx in ads
      ad.b1     = ad.b
      ad.b2     = ads[ idx + 1 ]?.b ? bytes.length
      delete ad.b
      ad.chrs   = bytes[ ad.b1 ... ad.b2 ].toString()
      extra_ad  = null
      has_shy   = false
      has_wbr   = false
      special   = null
      if      ad.chrs.startsWith specials.shy.chrs then special = specials.shy
      else if ad.chrs.startsWith specials.wbr.chrs then special = specials.wbr
      ### SHY and WBR may appear together with other material in the same AD, this we don't want so we
      separate those into their own ADs: ###
      if special?
        ad.br           = special.name
        if ad.chrs.length > 1 ### NOTE safe b/c we know SHY is BMP codepoint ###
          extra_ad      = { ad..., }
          ad.b2         = ad.b1 + special.bytecount
          extra_ad.chrs = ad.chrs[ 1 .. ]
          extra_ad.b1   = ad.b2
          extra_ad.br   = null
          extra_ad.gid  = specials.ignored.gid
          extra_ad.sid  = _get_sid { fontnick, gid: specials.ignored.gid, }
          ad.chrs       = ad.chrs[ 0 ]
          ad.dx         = 0
          ad.x1         = ad.x
      else if ad.chrs is ' '
        ad.br           = specials.spc.name
        ad.gid          = specials.spc.gid
      else if ad.chrs is '-'
        ad.br           = specials.hhy.name
      else if ad.chrs is '\n'
        ad.br           = specials.nl.name
        ad.gid          = specials.nl.gid
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
      dx0   ### NOTE optional leftmost  x reference coordinate ###
      dx2   ### NOTE optional rightmost x reference coordinate ###
      b1    ### NOTE optional leftmost byte index ###
      b2    ### NOTE optional rightmost byte index ###
      doc
      par
      trk
      osgi      } = cfg
    skip_ends     = dx0? or dx2? ### TAINT will probably be removed ###
    b1           ?= 0
    b2           ?= null
    dx0          ?= 0 ### TAINT use validation, defaults ###
    dx2          ?= null
    font_idx      = @_font_idx_from_fontnick fontnick
    ads           = JSON.parse @RBW.shape_text { format: 'json', text, font_idx, }
    ads           = @_prepare_ads text, fontnick, ads
    { specials  } = @constructor.C
    { schema    } = @cfg
    #.......................................................................................................
    ced_x           = 0 # cumulative error displacement from missing outlines
    ced_y           = 0 # cumulative error displacement from missing outlines
    osgi           ?= null
    sgi             = 0
    ### TAINT will not properly handle multiple SHYs in the same segment (this might happen in ligatures
    like `ffi`) ###
    for ad, idx in ads
      sgi++ unless ad.nobr
      ad.doc    = doc
      ad.par    = par
      ad.trk    = trk
      ad.b1    += b1
      ad.b2    += b1
      ad.sgi    = sgi
      ad.osgi   = osgi
      ad.sid    = _get_sid { fontnick, gid: ad.gid, }
      ad.x     += ced_x
      ad.y     += ced_y
      #.....................................................................................................
      # Replace original metrics with those of missing outline:
      if ad.gid is specials.missing.gid
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
      # debug '^arg740-7^', ( rpr ad.chrs ), to_width ( rpr ad ), 100
    #.......................................................................................................
    if b2?  then  ads[ ads.length - 1 ].b2 = b2
    if dx2? then  delta_x = dx2 - ads[ ads.length - 1 ].x1
    else          delta_x = 0
    #.......................................................................................................
    @db =>
      insert_ad = @db.prepare @sql.insert_ad
      last_idx  = ads.length - 1
      for ad, idx in ads
        ad.x       += delta_x
        ad.x1      += delta_x
        ad.br       = 'end' if ( trk is 1 ) and ( idx is last_idx )
        row         = { br: null, ad..., }
        row.nobr    = if row.nobr then 1 else 0
        # debug '^arg740-8^', row
        ads[ idx ]  = @db.first_row insert_ad, row
      return null
    #.......................................................................................................
    return ads
