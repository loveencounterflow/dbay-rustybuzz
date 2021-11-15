


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
  get_current_brp: ( cfg ) ->
    { schema, dx0, brp_1, } = cfg
    @_v.dx0 = brp_1.x1 ### NOTE this value must be set before using the below select ###
    return @db.single_row SQL"select * from #{schema}.current_brp;" ### TAINT use API (?) ###

  #---------------------------------------------------------------------------------------------------------
  _distribute_with_db: ( cfg ) ->
    # { Tbl, }    = require '../../icql-dba-tabulate'
    # dtab        = new Tbl { db: @db, }
    #.......................................................................................................
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
    urge '^4875^', 'ads';          console.table @db.all_rows SQL"select id, doc, par, adi, sgi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, nobr, br, lnr from #{schema}.ads order by vnr_blob;"
    urge '^4875^', 'current_brps'; console.table @db.all_rows SQL"select id, doc, par, adi, sgi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, nobr, br, lnr, deviation from #{schema}.current_brps;"
    # console.table @db.all_rows SQL"select * from #{schema}.brps order by vnr_blob;"
    #.......................................................................................................
    brp_2         = @db.single_row SQL"select * from #{schema}.current_brps where br = 'start' limit 1;"
    delete brp_2.vnr; delete brp_2.vnr_blob; console.table [ brp_2, ]
    brp_1         = null
    lnr           = 0
    # lines         = []
    # R             = { lines, }
    R             = null ### NOTE result via DB for the time being ###
    count         = -1
    loop
      count++
      if count > 100
        warn "infinite loop"
        process.exit 119
      break if brp_2.br is 'end'
      lnr++
      brp_1   = brp_2
      brp_2   = @get_current_brp { schema, dx0: @_v.dx0, brp_1, }
      { doc
        par } = brp_2
      #.....................................................................................................
      urge '^5850^', "current BRPs"; console.table @db.all_rows SQL"""
        select
            id, doc, par, adi, sgi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, nobr, br, lnr, deviation
          from #{schema}.current_brps limit 3;"""
      debug '^347446^', {
              dx0: @_v.dx0, lnr,
              doc, par, brp_1_adi: brp_1.adi, brp_2_sgi: brp_2.sgi, brp_2_vrt: brp_2.vrt, }
      @db SQL"""
        update #{schema}.ads set
            x   = x - $dx0,
            lnr = $lnr
          where id in ( select id
            from #{schema}.ads
            where true
              and ( doc = $doc )
              and ( par = $par )
              and ( sgi = $brp_2_sgi )
              and ( vrt = $brp_2_vrt )
          union all select id
            from #{schema}.ads
            where true
              and ( doc = $doc )
              and ( par = $par )
              and ( adi > $brp_1_adi )
              and ( sgi < $brp_2_sgi )
              and ( vrt = 1 ) );""", {
              dx0: @_v.dx0, lnr,
              doc, par, brp_1_adi: brp_1.adi, brp_2_sgi: brp_2.sgi, brp_2_vrt: brp_2.vrt, }
      #.....................................................................................................
      urge '^5850^', "current ADs"; console.table @db.all_rows SQL"""
        select
            id, doc, par, adi, sgi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, nobr, br, lnr
          from #{schema}.ads
          where true
            and ( doc = $doc )
            and ( par = $par )
            and ( sgi = $brp_2_sgi )
            and ( vrt = $brp_2_vrt )
        union all
        select
            id, doc, par, adi, sgi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, nobr, br, lnr
          from #{schema}.ads
          where true
            and ( doc = $doc )
            and ( par = $par )
            and ( adi > $brp_1_adi )
            and ( sgi < $brp_2_sgi )
            and ( vrt = 1 )
          order by doc, par, adi, sgi, vrt;""",
            { doc, par, brp_1_adi: brp_1.adi, brp_2_sgi: brp_2.sgi, brp_2_vrt: brp_2.vrt, }
      #.....................................................................................................
      # info '^4476^', rpr @_text_from_adis { schema, doc, par, adi_1, adi_2, vrt: 1, }
      #.....................................................................................................
      # lines.push { doc, par, adi_1, adi_2, vrt_1, vrt_2, vnr_1, vnr_2, dx0: @_v.dx0, }
    # urge '^4875^', 'ads'; echo dtab._tabulate @db SQL"select id, doc, par, adi, sgi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, nobr, br, lnr from #{schema}.ads order by vnr_blob;"
    urge '^4875^', 'ads';          console.table @db.all_rows SQL"select id, doc, par, adi, sgi, vrt, gid, b, x, y, dx, dy, x1, chrs, sid, nobr, br, lnr from #{schema}.ads order by vnr_blob;"
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



