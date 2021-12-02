


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
    left_ads        = []
    right_ads       = []
    #.......................................................................................................
    { alt_max, } = @db.single_row SQL"""
      select max( alt ) as alt_max
      from #{schema}.ads where ( doc = $doc ) and ( par = $par );""", { doc, par, }
    new_alt = alt_max
    #.......................................................................................................
    # urge '^7875^', {  fontnick, doc, par, alt,         }
    # urge '^7875^', 'ads'; console.table @db.all_rows SQL"select * from #{schema}.ads order by doc, par, adi, sgi, alt;"
    for { shy_adi, shy_sgi, } in @db.all_rows SQL"""
      select adi as shy_adi, sgi as shy_sgi from #{schema}.ads
        where true
          and ( doc = $doc )
          and ( par = $par )
          and ( br  = 'shy' )
          and ( alt = 1 );""", { doc, par, }
      #.....................................................................................................
      # First batch: Chracters in same shape group as SHY, up to the shy, with an added hyphen:
      { text, dx0, } = @db.first_row SQL"""
        select
            coalesce(
              group_concat( case when br = 'shy' then '' else chrs end, '' ),
              '' ) || '-'             as text,
            min( x )                  as dx0
          from ads
          where true
            and ( doc = $doc )
            and ( par = $par )
            and ( sgi = $shy_sgi )
            and ( adi <= $shy_adi )
            and ( alt = 1 )
          order by adi;""", { doc, par, shy_adi, shy_sgi, }
      urge '^460971^', { shy_adi, shy_sgi, dx0, text, new_alt, }
      new_alt++
      left_ads      = @_shape_text { cfg..., text, dx0, alt: new_alt, osgi: shy_sgi, }
      # last_left_ad  = left_ads[ left_ads.length - 1 ]
      #.....................................................................................................
      { text, dx2, } = @db.first_row SQL"""
        select
            coalesce(
              group_concat( case when br = 'shy' then '' else chrs end, '' ),
              '' )                    as text,
            max( x1 )                 as dx2
          from ads
          where true
            and ( doc = $doc )
            and ( par = $par )
            and ( sgi = $shy_sgi )
            and ( adi > $shy_adi )
            and ( alt = 1 )
          order by adi;""", { doc, par, shy_adi, shy_sgi, }
      info '^460971^', { text, dx2, }
      if text isnt ''
        urge '^460971^', { shy_adi, shy_sgi, dx2, text, new_alt, }
        right_ads = @_shape_text { cfg..., text, dx2, alt: new_alt, osgi: shy_sgi, }
      urge '^460971^'
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
      dx0   ### NOTE optional leftmost  x reference coordinate ###
      dx2   ### NOTE optional rightmost x reference coordinate ###
      doc
      par
      alt
      osgi      } = cfg
    { missing   } = @constructor.C
    skip_ends     = dx0? or dx2? ### TAINT will probably be removed ###
    dx0          ?= 0 ### TAINT use validation, defaults ###
    dx2          ?= null
    font_idx      = @_font_idx_from_fontnick fontnick
    ads           = @RBW.shape_text { format: 'json', text, font_idx, }
    ads           = JSON.parse ads
    ads           = @_prepare_ads text, fontnick, ads
    { schema, }   = @cfg
    #.......................................................................................................
    { current_adi, } = @db.first_row SQL"""
      select
          max( adi ) as current_adi
        from #{schema}.ads
        where true
          and ( doc = $doc )
          and ( par = $par )
          and ( alt = $alt );""", { doc, par, alt, }
    current_adi ?= 0
    #.......................................................................................................
    # if false # unless skip_ends
    #   ads.unshift {
    #     doc
    #     par
    #     alt
    #     adi:    current_adi
    #     sgi:    0
    #     osgi:   null
    #     gid:    null
    #     b:      null
    #     x:      0
    #     y:      0
    #     dx:     0
    #     dy:     0
    #     x1:     0
    #     chrs:   null
    #     sid:    null
    #     nobr:   0
    #     br:     'start' }
    #.......................................................................................................
    ced_x           = 0 # cumulative error displacement from missing outlines
    ced_y           = 0 # cumulative error displacement from missing outlines
    osgi           ?= null
    sgi             = 0
    ### TAINT will not properly handle multiple SHYs in the same segment (this might happen in ligatures
    like `ffi`) ###
    for ad, idx in ads
      # continue if ( not skip_ends ) and ( idx is 0 )
      current_adi++
      #.....................................................................................................
      sgi++ unless ad.nobr
      ad.doc    = doc
      ad.par    = par
      ad.alt    = alt
      ad.adi    = current_adi
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
    # if false # unless skip_ends
    #   current_adi++
    #   last_ad   = ads[ ads.length - 1 ]
    #   ads.push {
    #     doc
    #     par
    #     alt
    #     adi:  current_adi
    #     sgi:  last_ad.sgi + 1
    #     osgi
    #     gid:  null
    #     b:    null
    #     x:    last_ad.x1
    #     y:    last_ad.y
    #     dx:   0
    #     dy:   0
    #     x1:   last_ad.x1
    #     chrs: null
    #     sid:  null
    #     nobr: 0
    #     br:   'end' }
    #.......................................................................................................
    if dx2? then  delta_x = dx2 - ads[ ads.length - 1 ].x1
    else          delta_x = 0
    #.......................................................................................................
    @db =>
      insert_ad = @db.prepare @sql.insert_ad
      for ad, adi in ads
        ad.x       += delta_x
        ad.x1      += delta_x
        row         = { br: null, ad..., }
        row.nobr    = if row.nobr then 1 else 0
        # debug '^545456^', row
        ads[ adi ]  = @db.first_row insert_ad, row
      return null
    #.......................................................................................................
    return ads
