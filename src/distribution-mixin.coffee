


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
    { schema,
      prefix } = @cfg
    @db =>
      @db SQL"""
        drop table if exists #{schema}.ads;
        drop view if exists #{schema}.brps;
        create table #{schema}.ads (
            adi     integer not null primary key,
            gid     integer not null,
            b       integer not null,
            x       integer not null,
            y       integer not null,
            dx      integer not null,
            dy      integer not null,
            chrs    text    not null,
            sid     text    not null,
            br      text );
        create view #{schema}.brps as
          with
            v1 as ( select max( adi ) as last_adi from #{schema}.ads ),
            v2 as ( select x, dx from #{schema}.ads as ads join v1 on ( ads.adi = v1.last_adi ) )
          select
            *
          from #{schema}.ads
          where br is not null
          union all select
              -1                as adi,
              null              as gid,
              null              as b,
              0                 as x,
              null              as y,
              null              as dx,
              null              as dy,
              null              as chrs,
              null              as sid,
              'start'           as br
          union all
            select
              v1.last_adi + 1   as adi,
              null              as gid,
              null              as b,
              v2.x + v2.dx      as x,
              null              as y,
              0                 as dx,
              null              as dy,
              null              as chrs,
              null              as sid,
              'end'             as br
            from v1, v2
        ;
      """
    insert_into_ads = @db.prepare_insert { schema, into: 'ads', exclude: [ 'adi', ], }
    { ads
      mm_p_u
      width_mm  } = cfg
    @db =>
      insert_into_ads.run { br: null, ad..., } for ad in ads
    debug '^3321^', console.table @db.all_rows SQL"select * from #{schema}.ads;"
    debug '^3321^', console.table @db.all_rows SQL"select * from #{schema}.brps order by adi;"
    process.exit 1

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




