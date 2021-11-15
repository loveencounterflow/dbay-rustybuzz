


'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DRB/MIXIN/DISTRIBUTION'
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
jr                        = JSON.stringify
jp                        = JSON.parse


#-----------------------------------------------------------------------------------------------------------
@Drb_distribution = ( clasz = Object ) => class extends clasz

  #---------------------------------------------------------------------------------------------------------
  constructor: ->
    super()
    @_v ?= {}
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _$distribution_initialize: ->
    { schema,
      prefix  } = @cfg
    #.......................................................................................................
    @db.create_function name: prefix + 'get_deviation', deterministic: false, call: ( x1 ) =>
      ### Essentiall distance of any point in the text from the end of the current line *relative to
      type size and scaled such that 1em = 1000u. Most favorable break points are the ones closest to
      zero. ###
      R   = Math.round ( x1 - @_v.dx0 - @_v.width_u ) / @_v.size_u * 1000
      R  *= 2 if R > 0 ### penalty for lines that are too long ###
      return R
    #.......................................................................................................
    @db.create_function name: prefix + 'vnr_pick', deterministic: true, call: ( vnr, nr ) =>
      return ( jp vnr )[ nr - 1 ]
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  distribute: ( cfg ) -> @_distribute_with_db cfg
  # distribute: ( cfg ) -> @_distribute_v1 cfg

  #---------------------------------------------------------------------------------------------------------
  _distribute_with_db: ( cfg ) ->
    { ads     } = cfg
    { schema,
      prefix  } = @cfg
    #.......................................................................................................
    @_v.mm_p_u    = cfg.mm_p_u
    @_v.width_mm  = cfg.width_mm
    @_v.width_u   = cfg.width_mm / cfg.mm_p_u # line width in glyf design unites (1000 per em)
    @_v.size_mm   = cfg.size_mm               # nominal type size (1em)
    @_v.size_u    = cfg.size_mm  / cfg.mm_p_u
    @_v.adi0      = 0                         # index of AD that represents current line start
    @_v.dx0       = 0                         # extraneous width (b/c paragraph was set in single long line)
    #.......................................................................................................
    console.table @db.all_rows SQL"select doc, par, adi, vrt, vnr, gid, b, x, y, dx, dy, x1, chrs, sid, sgi, nobr, br from #{schema}.ads order by vnr_blob;"
    # console.table @db.all_rows SQL"select doc, par, adi, vrt, vnr, gid, b, x, y, dx, dy, x1, chrs, sid, sgi, nobr, br, deviation from #{schema}.brps where br = 'shy' order by vnr_blob;"
    # console.table @db.all_rows SQL"select * from #{schema}.brps order by vnr_blob;"
    #.......................................................................................................
    @_v.dx0       = 0
    brp_2         = @db.single_row SQL"select doc, par, adi, vrt, vnr, gid, b, x, y, dx, dy, x1, chrs, sid, sgi, nobr, br, deviation from #{schema}.brps order by vnr_blob limit 1;"
    console.table [ brp_2, ]
    brp_2.vnr     = jp brp_2.vnr
    brp_1         = null
    lines         = []
    R             = { lines, }
    count         = -1
    loop
      count++
      if count > 100
        warn "infinite loop"
        process.exit 119
      break if brp_2.br is 'end'
      brp_1                   = brp_2
      brp_2                   = @db.single_row SQL"""
        select
            doc, par, adi, vrt, vnr, gid, b, x, y, dx, dy, x1, chrs, sid, sgi, nobr, br, deviation
          from #{schema}.brps
          where br != 'shy' -- A SHY is never a valid line break, the corresponding HHY is
          order by abs( deviation )
          limit 1;"""
      #.....................................................................................................
      console.table @db.all_rows SQL"""
        select
            doc, par, adi, vrt, vnr, gid, b, x, y, dx, dy, x1, chrs, sid, sgi, nobr, br, deviation
          from #{schema}.brps
          where br != 'shy' -- A SHY is never a valid line break, the corresponding HHY is
          order by abs( deviation )
          limit 5;"""
      #.....................................................................................................
      brp_2.vnr               = jp brp_2.vnr
      vnr_1                   = brp_1.vnr # or use `select from ads`?
      ### NOTE move from breakpoint to material ###
      ### TAINT doesn't honor multiple consecutive breakpoints ###
      vnr_1[ 2 ]++
      vnr_2                       = brp_2.vnr
      [ doc, par, adi_1, vrt_1, ] = vnr_1
      [ _,   _,   adi_2, vrt_2, ] = vnr_2
      #.....................................................................................................
      ### TAINT use `stamped` boolean column to select variant ###
      info '^4476^', rpr @_text_from_adis { schema, doc, par, adi_1, adi_2, vrt: 1, }
      #.....................................................................................................
      lines.push { doc, par, adi_1, adi_2, vrt_1, vrt_2, vnr_1, vnr_2, dx0: @_v.dx0, }
      @_v.dx0 = brp_2.x1
    return R

  #---------------------------------------------------------------------------------------------------------
  _text_from_adis: ( cfg ) ->
    { schema
      doc
      par
      adi_1
      adi_2
      vrt   } = cfg
    ads       = @db.all_rows SQL"""
      select
          *
        from #{schema}.ads
        where true
          and doc = $doc
          and par = $par
          and adi between $adi_1 and $adi_2
          and vrt = $vrt
        order by vnr_blob;""", { doc, par, adi_1, adi_2, vrt, }
    ad_2  = ads[ ads.length - 1 ]
    R     = ( ad.chrs for ad in ads ).join ''
    R    += '-' if ad_2.br is 'shy'
    return R

  #---------------------------------------------------------------------------------------------------------
  _distribute_v1: ( cfg ) ->
    { ads
      mm_p_u
      width_mm  } = cfg
    lines         = []
    R             = { lines, }
    width_u       = width_mm / mm_p_u # line width in glyf design unites (1000 per em)
    brps          = []                # BReak PointS
    #.......................................................................................................
    ### Find BReak PointS: ###
    brps.push { adi: 0, br: 'start', x: 0, }
    for ad, adi in ads
      continue unless ad.br?
      brps.push { adi, br: ad.br, x: ad.x, }
    last_adi  = ads.length - 1
    last_ad   = ads[ last_adi ]
    brps.push { adi: last_adi, br: 'end', x: last_ad.x + last_ad.dx, dx: 0, }
    #.......................................................................................................
    brpi      = -1                    # index to BRP
    last_brpi = brps.length - 1
    brpi1     = 0                     # index to left-hand BRP
    brpi2     = null                  # index to right-hand BRP
    adi1      = null                  # index to left-hand AD
    adi2      = null                  # index to right-hand AD
    dx0       = 0                     # extraneous width (b/c paragraph was set in single long line)
    #.......................................................................................................
    loop
      brpi++
      break if brpi > last_brpi
      brp           = brps[ brpi ]
      corrected_x   = brp.x - dx0
      ### TAINT use tolerance to allow line break when line is just a bit too long ###
      continue unless corrected_x > width_u
      brpi2         = brpi - 1 ### TAINT may be < 0 when first word too long ###
      adi1          = ( adi2 ? brps[ brpi1 ].adi - 1 ) + 1
      adi2          = brps[ brpi2 ].adi
      lines.push { adi1, adi2, dx0, }
      brpi1         = brpi
      dx0           = ads[ adi2 + 1 ].x
    #.......................................................................................................
    if adi2 < last_adi
      dx0           = ads[ adi2 + 1 ].x
      brpi1         = brpi2 + 1
      brpi2         = last_brpi
      adi1          = adi2 + 1
      adi2          = last_adi
      lines.push { adi1, adi2, dx0, }
    #.......................................................................................................
    lnr = 0
    rnr = lines.length + 1
    for line in lines
      lnr++; line.lnr = lnr
      rnr--; line.rnr = rnr
      # continue unless ads[ line.adi2 ].br is 'shy'
      ### TAINT consider to always use visible hyphen but hide it in CSS ###
      ### TAINT not the way to do this ###
      # ads[ line.adi2 ].sid = 'o14eg8i'
      debug '^94509^', line
    #.......................................................................................................
    return R




