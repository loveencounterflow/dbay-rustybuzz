


'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DRB/MIXIN/PREPARATION'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
guy                       = require 'guy'
PATH                      = require 'path'
FS                        = require 'fs'
E                         = require './errors'
SQL                       = String.raw
jr                        = JSON.stringify
jp                        = JSON.parse


#-----------------------------------------------------------------------------------------------------------
@Drb_preparation = ( clasz = Object ) => class extends clasz

  #---------------------------------------------------------------------------------------------------------
  constructor: ->
    super()
    guy.props.hide @, 'state', {} unless @state?
    @state.prv_fontidx            = -1
    @state.font_idx_by_fontnicks  = {}
    #.........................................................................................................
    return undefined

  #---------------------------------------------------------------------------------------------------------
  # _$preparation_initialize: ->

  #---------------------------------------------------------------------------------------------------------
  _resolve_font_path: ( font_path ) ->
    return font_path if font_path.startsWith '/'
    jzrfonts_path = '../../../assets/jizura-fonts'
    return PATH.resolve PATH.join __dirname, jzrfonts_path, font_path

  #---------------------------------------------------------------------------------------------------------
  _get_font_bytes: ( font_path ) -> ( FS.readFileSync font_path ).toString 'hex'

  #---------------------------------------------------------------------------------------------------------
  register_fontnick: ( cfg ) ->
    @types.validate.dbr_register_fontnick_cfg ( cfg = { @constructor.C.defaults.dbr_register_fontnick_cfg..., cfg..., } )
    @db @sql.upsert_fontnick, cfg
    return null

  #---------------------------------------------------------------------------------------------------------
  _fspath_from_fontnick: ( fontnick ) ->
    ### TAINT use fallback to configure behavior in case of failure ###
    return @db.single_value @sql.fspath_from_fontnick, { fontnick, }

  #---------------------------------------------------------------------------------------------------------
  _font_idx_from_fontnick: ( fontnick )->
    ### TAINT use fallback to configure behavior in case of failure ###
    unless ( R = @state.font_idx_by_fontnicks[ fontnick ] )?
      throw new E.Dbr_unknown_or_unprepared_fontnick '^dbr/preparation@1^', fontnick
    return R

  #---------------------------------------------------------------------------------------------------------
  prepare_font: ( cfg ) ->
    clasz = @constructor
    unless @state.prv_fontidx < clasz.C.last_fontidx
      throw new E.Dbr_font_capacity_exceeded '^dbr/preparation@2^', clasz.C.last_fontidx + 1
    #.........................................................................................................
    @types.validate.dbr_prepare_font_cfg ( cfg = { @constructor.C.defaults.dbr_prepare_font_cfg..., cfg..., } )
    { fontnick
      fspath  } = cfg
    #.........................................................................................................
    throw new E.Dbr_not_implemented '^dbr/preparation@3^', "setting fspath" if fspath?
    return null if @state.font_idx_by_fontnicks[ fontnick ]?
    #.........................................................................................................
    try fspath = @_fspath_from_fontnick fontnick catch error
      if ( @types.type_of error ) is 'dbay_expected_single_row'
        throw new E.Dbr_unknown_or_unprepared_fontnick '^dbr/preparation@4^', fontnick
      throw error
    font_idx    = ( @state.prv_fontidx += 1 )
    font_bytes  = @_get_font_bytes fspath
    @RBW.register_font font_idx, font_bytes
    @state.font_idx_by_fontnicks[ fontnick ] = font_idx
    fm          = @_add_fontmetrics fontnick, font_idx
    @_add_special_glyfs fontnick, font_idx, fm
    return null

  #---------------------------------------------------------------------------------------------------------
  _add_fontmetrics: ( fontnick, font_idx ) ->
    fm          = JSON.parse @RBW.get_font_metrics font_idx
    fm.fontnick = fontnick
    @db @sql.insert_fontmetric, fm
    return fm

  #---------------------------------------------------------------------------------------------------------
  get_fontmetrics: ( cfg ) ->
    @types.validate.dbr_get_fontmetrics_cfg ( cfg = { @constructor.C.defaults.dbr_get_fontmetrics_cfg..., cfg..., } )
    { fontnick }  = cfg
    try
      return @db.single_row SQL"""
        select * from #{@cfg.schema}.fontmetrics where fontnick = $fontnick;""", { fontnick, }
    catch error
      if ( @types.type_of error ) is 'dbay_expected_single_row'
        throw new E.Dbr_unknown_or_unprepared_fontnick '^dbr/preparation@5^', fontnick
      throw error
    return R

  #---------------------------------------------------------------------------------------------------------
  _add_special_glyfs: ( fontnick, font_idx, fm ) ->
    { specials  } = @constructor.C
    swdth         = 0.5 # stroke width in mm
    # swdth        *= 1000 * size_mm * mm_p_u
    # swdth        *= 1000 * ( 10 ) * ( 10 / 1000 )
    swdth        *= 100
    owdth         = 3 * swdth
    top           = fm.ascender  + 1 * owdth
    bottom        = fm.descender - 0 * owdth
    left          = Math.round owdth * 0.5
    right         = Math.round 1000 - owdth * 0.5
    # sid           = @_get_sid fontnick, gid
    ### TAINT consider to use library (`cupofhtml`?) for this ###
    x1            = 0
    y1            = bottom
    x2            = 0
    y2            = top
    text_x        = x2 - 100
    text_y        = y1 + 75
    olt           = 'g'
    cx            = x2
    cy            = y1
    cr            = 200
    cswdth        = swdth * 0.5
    #.......................................................................................................
    # for special_key in [ 'ignored', 'wbr', 'shy', 'hhy', ]
    for special_key in [ 'ignored', 'wbr', 'shy', ]
      special       = specials[ special_key ]
      gid           = special.gid
      chrs          = special.chrs
      marker        = special.marker
      gd            = cleanup_svg """
        <g
          class         ='fontmetric #{special_key}'
          transform     ='skewX(#{fm.angle})'
          >
        <line
          x1            ='#{x1}'
          y1            ='#{y1}'
          x2            ='#{x2}'
          y2            ='#{y2}'
          />
        <circle
          cx            = '#{cx}'
          cy            = '#{cy}'
          r             = '#{cr}'
          />
        <text
          x             ='#{text_x}'
          y             ='#{text_y}'
          >#{marker}</text>
          </g>"""
      ### TAINT should adapt & use `@insert_outlines()` ###
      insert_outline      = @db.prepare @sql.insert_outline
      gd_blob             = @_zip gd ### Glyf Data Blob ###
      ### TAINT must rename fields x, y, y1, y1 in tables ads, outlines ###
      row                 = @db.first_row insert_outline, \
        { fontnick, gid, chrs, x: x1, y: y1, x1: x2, y1: y2, olt, gd_blob, }
    #.......................................................................................................
    for special_key in [ 'missing1', 'missing2', ]
      special       = specials[ special_key ]
      gid           = special.gid
      width         = special.width
      rwidth        = width - 3 *swdth
      # rheight       = bottom - top
      rheight       = -top
      gd            = cleanup_svg """
        <g
          class         ='fontmetric missing #{special_key}'
          transform     ='skewX(#{fm.angle})'
          >
        <rect x='#{left}' y='#{top}' width='#{rwidth}' height='#{rheight}'/>
          </g>"""
        # "M#{left} #{bottom} L#{left} #{top} L#{right} #{top} L#{right} #{bottom}"
      ### TAINT should adapt & use `@insert_outlines()` ###
      insert_outline      = @db.prepare @sql.insert_outline
      gd_blob             = @_zip gd ### Glyf Data Blob ###
      ### TAINT must rename fields x, y, y1, y1 in tables ads, outlines ###
      row                 = @db.first_row insert_outline, \
        { fontnick, gid, chrs, x: 0, y: 0, x1: width, y1: 0, olt, gd_blob, }
    #.......................................................................................................
    return null

#-----------------------------------------------------------------------------------------------------------
cleanup_svg = ( svg ) ->
  R = svg
  R = R.replace /\n/g,        '\x20'
  R = R.replace /\x20{2,}/g,  '\x20'
  R = R.replace /\x20=\x20/g, '='
  R = R.replace />\x20</g,    '><'
  R = R.trim()
  R = R.replace /\s+\/>$/,    '/>'
  return R





