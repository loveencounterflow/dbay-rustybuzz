


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
  #   guy.props.hide @, 'state', {} unless @state?
  #   @state.prv_fontidx            = -1
  #   @state.font_idx_by_fontnicks  = {}
  #   #.........................................................................................................
  #   return undefined

  #-----------------------------------------------------------------------------------------------------------
  distribute: ( cfg ) -> @_distribute_with_db cfg
  # distribute: ( cfg ) -> @_distribute_v1 cfg

  #-----------------------------------------------------------------------------------------------------------
  _distribute_with_db: ( cfg ) ->
    { ads     } = cfg
    { schema,
      prefix  } = @cfg
    #.......................................................................................................
    v =
      mm_p_u:     cfg.mm_p_u
      width_mm:   cfg.width_mm
      width_u:    cfg.width_mm / cfg.mm_p_u # line width in glyf design unites (1000 per em)
      size_mm:    cfg.size_mm               # nominal type size (1em)
      size_u:     cfg.size_mm  / cfg.mm_p_u
      adi0:       0                         # index of AD that represents current line start
      dx0:        0                         # extraneous width (b/c paragraph was set in single long line)
    #.......................................................................................................
    create_udfs = ( v ) =>
      @db.create_function name: prefix + 'get_deviation', deterministic: false, call: ( x1 ) =>
        ### Essentiall distance of any point in the text from the end of the current line *relative to
        type size and scaled such that 1em = 1000u. Most favorable break points are the ones closest to
        zero. ###
        return Math.round ( x1 - v.dx0 - v.width_u ) / v.size_u * 1000
      @db.create_function name: prefix + 'vnr_pick', deterministic: true, call: ( vnr, nr ) =>
        return ( jp vnr )[ nr - 1 ]
      return null
    create_udfs v
    #.......................................................................................................
    @db =>
      @db SQL"""
        drop table if exists #{schema}.ads;
        drop view if exists #{schema}.brps;
        create table #{schema}.ads (
            pgi     integer generated always as ( #{prefix}vnr_pick( vnr, 1 ) ) virtual not null,
            adi     integer generated always as ( #{prefix}vnr_pick( vnr, 2 ) ) virtual not null,
            vnr     json not null primary key,
            gid     integer,
            b       integer,
            x       integer not null,
            y       integer not null,
            dx      integer not null,
            dy      integer not null,
            x1      integer not null,
            chrs    text,
            sid     text,
            br      text );
        create view #{schema}.brps as select
            *,
            #{prefix}get_deviation( x1 ) as deviation
          from #{schema}.ads
          where br is not null;"""
    @hollerith.alter_table { schema, table_name: 'ads', }
    insert_into_ads = @db.prepare_insert { schema, into: 'ads', }
    @db =>
      insert_into_ads.run { br: null, ad..., vnr: ( jr [ 1, ad.adi, ] ) } for ad in ads
    console.table @db.all_rows SQL"select pgi, adi, vnr, gid, b, x, y, dx, dy, x1, chrs, sid, br from #{schema}.ads order by vnr_blob;"
    console.table @db.all_rows SQL"select pgi, adi, vnr, gid, b, x, y, dx, dy, x1, chrs, sid, br from #{schema}.brps order by vnr_blob;"
    console.table @db.all_rows SQL"select pgi, adi, vnr, gid, b, x, y, dx, dy, x1, chrs, sid, br from #{schema}.brps order by abs( deviation ) limit 5;"
    #.......................................................................................................
    v.dx0         = 0
    nxt_brp       = @db.single_row SQL"select pgi, adi, vnr, gid, b, x, y, dx, dy, x1, chrs, sid, br from #{schema}.brps where br = 'start' limit 1;"
    nxt_brp.vnr   = jp nxt_brp.vnr
    prv_brp       = null
    lines         = []
    R             = { lines, }
    count         = -1
    loop
      count++
      if count > 100
        warn "infinite loop"
        process.exit 119
      break if nxt_brp.br is 'end'
      prv_brp       = nxt_brp
      before_nxt_brp       = @db.single_row SQL"select pgi, adi, vnr, gid, b, x, y, dx, dy, x1, chrs, sid, br from #{schema}.brps order by abs( deviation ) limit 1;"
      nxt_brp       = @db.all_rows SQL"select pgi, adi, vnr, gid, b, x, y, dx, dy, x1, chrs, sid, br from #{schema}.brps order by vnr_blob limit 2;"
      nxt_brp       = nxt_brp[ 1 ]
      nxt_brp.vnr   = jp nxt_brp.vnr
      # vnr_1         = @hollerith.advance prv_brp.vnr
      vnr_1         = prv_brp.vnr
      vnr_2         = nxt_brp.vnr
      pgi_1         = prv_brp.pgi
      pgi_2         = nxt_brp.pgi
      adi_1         = prv_brp.adi
      adi_2         = nxt_brp.adi
      vnr_1_blob    = @hollerith.encode vnr_1
      vnr_2_blob    = @hollerith.encode vnr_2
      text          = @db.single_value SQL"select group_concat( chrs, '' ) as chrs from ads where vnr_blob between $vnr_1_blob and $vnr_2_blob;", { vnr_1_blob, vnr_2_blob, }
      text         += '-' if nxt_brp.br is 'shy'
      info '^33209^', text
      lines.push    { pgi_1, pgi_2, adi_1, adi_2, vnr_1, vnr_2, dx0: v.dx0, }
      v.dx0         = nxt_brp.x
    return R

  #-----------------------------------------------------------------------------------------------------------
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




