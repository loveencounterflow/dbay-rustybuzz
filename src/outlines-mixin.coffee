


'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DRB/MIXIN/OUTLINES'
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
ZLIB                      = require 'zlib'
_TO_BE_REMOVED_bbox_pattern = /^<rect x="(?<x>[-+0-9]+)" y="(?<y>[-+0-9]+)" width="(?<width>[-+0-9]+)" height="(?<height>[-+0-9]+)"\/>$/


#-----------------------------------------------------------------------------------------------------------
@Drb_outlines = ( clasz = Object ) => class extends clasz

  #---------------------------------------------------------------------------------------------------------
  constructor: ->
    super()
    guy.props.hide @, 'state', {} unless @state?
    @state.prv_fontidx            = -1
    @state.font_idx_by_fontnicks  = {}
    #.........................................................................................................
    return undefined

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
      throw new E.Dbr_unknown_fontnick '^dbr/outlines@1^', fontnick
    return R

  #---------------------------------------------------------------------------------------------------------
  load_font: ( cfg ) ->
    clasz = @constructor
    unless @state.prv_fontidx < clasz.C.last_fontidx
      throw new E.Dbr_font_capacity_exceeded '^dbr/outlines@1^', clasz.C.last_fontidx + 1
    #.........................................................................................................
    @types.validate.dbr_load_font_cfg ( cfg = { @constructor.C.defaults.dbr_load_font_cfg..., cfg..., } )
    { fontnick
      fspath  } = cfg
    #.........................................................................................................
    throw new E.Dbr_not_implemented '^dbr/outlines@1^', "setting fspath" if fspath?
    return null if @state.font_idx_by_fontnicks[ fontnick ]?
    #.........................................................................................................
    fspath      = @_fspath_from_fontnick fontnick
    font_idx    = ( @state.prv_fontidx += 1 )
    font_bytes  = @_get_font_bytes fspath
    @RBW.register_font font_idx, font_bytes
    @state.font_idx_by_fontnicks[ fontnick ] = font_idx
    return null

  #---------------------------------------------------------------------------------------------------------
  get_single_outline: ( cfg ) ->
    ### TAINT this method is highly inefficient for large numbers of outline retrievals; the intention is to
    replace it with a function that allows for lists of `gid`s to be handled with a single call. ###
    #.........................................................................................................
    @types.validate.dbr_get_single_outline_cfg ( cfg = { @constructor.C.defaults.dbr_get_single_outline_cfg..., cfg..., } )
    { fontnick
      gid     } = cfg
    font_idx    = @_font_idx_from_fontnick fontnick
    #.........................................................................................................
    { br, pd, } = JSON.parse @RBW.glyph_to_svg_pathdata font_idx, gid
    #.........................................................................................................
    ### TAINT we parse the bounding rectangle (which will look like `<rect x="49" y="-613" width="245"
    height="627"/>`) so users of this method get (more or less) the format we mean to implement in the
    future. ###
    unless ( match = br.match _TO_BE_REMOVED_bbox_pattern )?
      parameters = rpr { fontnick, gid, br, }
      throw new E.Dbr_internal_error '^dbr/outlines@1^', "found unknown format when trying to parse bounding box SVG #{parameters}"
    x           = parseInt match.groups.x,      10
    y           = parseInt match.groups.y,      10
    width       = parseInt match.groups.width,  10
    height      = parseInt match.groups.height, 10
    x1          = x + width
    y1          = y + height
    return { bbox: { x, y, x1, y1, width, height, }, pd, }

  #---------------------------------------------------------------------------------------------------------
  gids_from_cids: ( cfg ) ->
    ### Given a list of Unicode CIDs as `cids` and a `fontnick`, return a `Map` from CIDs to GIDs
    (glyf IDs). Unmappable CIDs will be left out. ###
    { cids
      fontnick }  = cfg
    font_idx    = @_font_idx_from_fontnick fontnick
    text        = ( ( ( String.fromCodePoint cid ) for cid in cids ).join '\n' ) + '\n'
    gids        = @RBW.shape_text { format: 'short', text, font_idx, } # formats: json, rusty, short
    gids        = gids.replace /\|([0-9]+:)[^|]+\|[^|]+/g, '$1'
    gids        = gids[ ... gids.length - 2 ]
    gids        = gids.split ':'
    gids        = ( ( parseInt gid ) for gid in gids )
    R           = new Map()
    for cid, idx in cids
      continue if ( gid = gids[ idx ] ) is 0
      R.set cid, gid
    return R

  #-----------------------------------------------------------------------------------------------------------
  _despace_svg_pathdata: ( svg_pathdata ) ->
    R = svg_pathdata
    R = R.replace /([0-9])\x20([^0-9])/g, '$1$2'
    R = R.replace /([^0-9])\x20([0-9])/g, '$1$2'
    return R

  #-----------------------------------------------------------------------------------------------------------
  _compress_svg_pathdata: ( svg_pathdata ) -> ZLIB.deflateRawSync ( Buffer.from svg_pathdata ), {
    level: 1, strategy: ZLIB.constants.Z_HUFFMAN_ONLY, }

  #-----------------------------------------------------------------------------------------------------------
  _decompress_svg_pathdata: ( pd_blob ) -> ZLIB.inflateRawSync pd_blob

  #-----------------------------------------------------------------------------------------------------------
  prepare_insert_outline: -> @db.prepare @sql.insert_outline





