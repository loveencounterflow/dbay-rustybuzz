


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

  # #---------------------------------------------------------------------------------------------------------
  # constructor: ->
  #   super()
  #   return undefined

  #---------------------------------------------------------------------------------------------------------
  _$distribution_initialize: ->
    { schema,
      prefix  } = @cfg
    #.......................................................................................................
    @db.create_function name: prefix + 'get_deviation', call: ( dx0, size_u, width_u, x1 ) =>
      ### Essentiall distance of any point in the text from the end of the current line *relative to
      type size and scaled such that 1em = 1000u. Most favorable break points are the ones closest to
      zero. ###
      R   = Math.round ( x1 - dx0 - width_u ) / size_u * 1000
      R  *= 2 if R > 0 ### penalty for lines that are too long ###
      return R
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  distribute: ( cfg ) -> @_distribute_with_db cfg
  # distribute: ( cfg ) -> @_distribute_v1 cfg

  #---------------------------------------------------------------------------------------------------------
  get_current_brp: ( cfg ) ->
    defaults  = { limit: 1, }
    cfg       = { defaults..., cfg..., }
    { dx0
      size_u
      width_u
      x1
      limit   } = cfg
    { prefix
      schema  } = @cfg
    R = @db.all_rows SQL"""
      select
          *,
          #{prefix}get_deviation( $dx0, $size_u, $width_u, x1 ) as deviation
        from #{schema}.ads
        where ( br is not null ) and ( br != 'shy' )
        order by abs( deviation ) asc
        limit $limit;""", { schema, dx0, size_u, width_u, limit, }
    return if limit is 1 then R[ 0 ] else R

  #---------------------------------------------------------------------------------------------------------
  _distribute_with_db: ( cfg ) ->
    { schema,
      prefix  } = @cfg
    #.......................................................................................................
    { doc
      par
      mm_p_u
      width_mm
      size_mm } = cfg                       # nominal type size (1em)
    width_u     = width_mm / mm_p_u         # line width in glyf design units (1000 per em)
    size_u      = size_mm  / mm_p_u
    adi0        = 0                         # index of AD that represents current line start
    dx0         = 0                         # extraneous width (b/c paragraph was set in single long line)
    #.......................................................................................................
    urge '^4875^', 'ads'; console.table @db.all_rows SQL"select * from #{schema}.ads order by doc, par, alt, b1, adi, sgi;"
    # urge '^4875^', 'ads'; console.table @db.all_rows SQL"select b1, b2, sgi, osgi, chrs, x from #{schema}.ads where sgi = 12 or osgi = 12 order by doc, par, alt, b1, adi, sgi;"
    # process.exit 119
    # urge '^4875^', 'current_brps'; console.table @db.all_rows SQL"select * from #{schema}.current_brps;"
    #.......................................................................................................
    # select last AD: SQL"select * from ads where alt = 1 and adi = ( select max( adi ) from ads where alt = 1 );"
    # brp_2         = @db.single_row SQL"select * from #{schema}.ads where br = 'start' limit 1;"
    brp_2         = @db.single_row SQL"""
      select
          *
        from #{schema}.ads
        where true
          and ( doc = $doc )
          and ( par = $par )
          -- and ( br = 'start' )
        order by adi asc
        limit 1;""", { doc, par, }
    brp_1         = null
    lnr           = 0
    # lines         = []
    # R             = { lines, }
    R             = null ### NOTE result via DB for the time being ###
    count         = 0
    loop
      count++
      if count > 3
        warn "infinite loop"
        break
      # break if brp_2.br is 'end'
      lnr++
      info '^5850-1^', '███████████████████████████████████████████████████ line:', lnr
      brp_1   = brp_2
      urge '^5850-2^', "current BRPs"; console.table @get_current_brp { dx0, size_u, width_u, limit: 5, }
      brp_2   = @get_current_brp { dx0, size_u, width_u, }
      unless brp_2?
        warn '^5850-3^', "did not find `end` element"
        break
      { doc
        par } = brp_2
      urge '^5850-4^ brp_1 and brp_2'; console.table [ brp_1, brp_2, ]
      #.....................................................................................................
      if brp_2.alt is 1 ### non-shy BRP ###
        line_ads = @db.all_rows SQL"""
          select * from #{schema}.ads
            where true
              and ( doc = $doc )
              and ( par = $par )
              and ( adi >= $brp_1_adi )
              and ( adi <= $brp_2_adi )
              and ( alt = 1 )
              -- and ( br != 'shy' )
            order by doc, par, adi;""", {
              doc, par, brp_1_adi: brp_1.adi, brp_2_adi: brp_2.adi, }
        urge '^5850-5^', "line_ads", { lnr, }; console.table line_ads
        @db =>
          debug '^5850-6^', @db.all_rows @sql.insert_line, { doc, par, lnr, x0: brp_1.x, x1: brp_2.x1, }
          for ad in line_ads
            x = ad.x - dx0
            y = ad.y
            @db @sql.insert_line_ad, { doc, par, lnr, ads_id: ad.id, x, y, }
          return null
        brp_2 = @db.first_row SQL"""
          select * from #{schema}.ads
            where true
              and ( doc = $doc )
              and ( par = $par )
              and ( adi = $brp_2_adi + 1 )
              and ( alt = 1 )
            limit 1;""", { doc, par, brp_2_adi: brp_2.adi, }
        unless brp_2?
          warn '^5850-7^', "did not find `end` element"
          break
        urge '^5850-8^', "brp_2"; console.table [ brp_2, ]
        dx0 = brp_2.x
      #.....................................................................................................
      else
        ### TAINT how to handle case when shapegroup has elements on right hand side of HHY? ###
        original_shapegroup = @db.all_rows SQL"""
          select * from #{schema}.ads
            where true
              and ( doc = $doc )
              and ( par = $par )
              and ( sgi = $osgi )
              and ( alt = 1 )
            order by doc, par, adi;""", { doc, par, osgi: brp_2.osgi, }
        urge '^5850-9^', "original_shapegroup"; console.table original_shapegroup
        line_ads = @db.all_rows SQL"""
          select * from #{schema}.ads
            where true
              and ( doc = $doc )
              and ( par = $par )
              and ( adi >= $brp_1_adi )
              and ( adi < $first_replaced_adi )
              and ( alt = 1 )
              -- and ( br != 'shy' )
          union all
          select * from #{schema}.ads
            where true
              and ( doc = $doc )
              and ( par = $par )
              and ( alt = $brp_2_alt )
              and ( adi <= $brp_2_adi )
              -- and ( br != 'shy' )
            order by doc, par, x, adi;""", {
              doc,
              par,
              brp_2_alt:            brp_2.alt,
              brp_1_adi:            brp_1.adi,
              first_replaced_adi:   original_shapegroup[ 0 ].adi,
              brp_2_adi:            brp_2.adi, }
        urge '^5850-10^', "line_ads", { lnr, }; console.table line_ads
        ### at his point we know that the material to be typeset on the current line
        starts with BRP 1 and extends to the SG of BRP 2 using the ALT of that break point;
        it excludes the SG of BRP 2 with ALT = 1 (that is the one with a SHY). ###
        @db =>
          debug '^5850-11^', @db.all_rows @sql.insert_line, { doc, par, lnr, x0: brp_1.x, x1: brp_2.x1, }
          for ad in line_ads
            x = ad.x - dx0
            y = ad.y
            @db @sql.insert_line_ad, { doc, par, lnr, ads_id: ad.id, x, y, }
          return null
        # debug '^5850-12^ line_ads'; console.table @db.all_rows SQL"select * from #{schema}.line_ads order by 1, 2, 3;"
        ### TAINT does not correctly handle case when shapegroup has elements on right hand side of HHY ###
        debug '^5850-13^', original_shapegroup[ original_shapegroup.length - 1 ]
        debug '^5850-14^', last_osg_adi = original_shapegroup[ original_shapegroup.length - 1 ].adi
        urge '^5850-15^', "brp_2"; console.table [ brp_2, ]
        urge '^5850-16^', "next brp_2"; console.table @db.all_rows SQL"""
          select * from #{schema}.ads
            where true
              and ( doc = $doc )
              and ( par = $par )
              and ( adi = $brp_2_adi + 1 )
              and ( alt = $brp_2_alt )
            union all
          select * from #{schema}.ads
            where true
              and ( doc = $doc )
              and ( par = $par )
              and ( adi = $last_osg_adi + 1 )
              and ( alt = 1 );""", {
                doc, par, last_osg_adi, brp_2_adi: brp_2.adi, brp_2_alt: brp_2.alt, }
        brp_2 = @db.first_row SQL"""
          select * from #{schema}.ads
            where true
              and ( doc = $doc )
              and ( par = $par )
              and ( adi = $brp_2_adi + 1 )
              and ( alt = $brp_2_alt )
            union all
          select * from #{schema}.ads
            where true
              and ( doc = $doc )
              and ( par = $par )
              and ( adi = $last_osg_adi + 1 )
              and ( alt = 1 );""", {
                doc, par, last_osg_adi, brp_2_adi: brp_2.adi, brp_2_alt: brp_2.alt, }
        unless brp_2?
          warn '^5850-17^', "did not find `end` element"
          break
        # urge '^5850-18^', "brp_2"; console.table [ brp_2, ]
        dx0 = brp_2.x
    #.......................................................................................................
    # urge '^5850-19^', "line_ads", { lnr, }; console.table @db.all_rows SQL"select * from #{schema}.line_ads order by 1, 2, 3, 4;"
    return R

  #---------------------------------------------------------------------------------------------------------
  _text_from_adis: ( cfg ) ->
    { schema
      doc
      par
      adi_1
      adi_2
      alt   } = cfg
    ads       = @db.all_rows SQL"""
      select
          *
        from #{schema}.ads
        where true
          and doc = $doc
          and par = $par
          and adi between $adi_1 and $adi_2
          and alt = $alt
        order by doc, par, adi, sgi, alt;""", { doc, par, adi_1, adi_2, alt, }
    ad_2  = ads[ ads.length - 1 ]
    R     = ( ad.chrs ? '' for ad in ads ).join ''
    R    += '-' if ad_2.br is 'shy'
    return R



