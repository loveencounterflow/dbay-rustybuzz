


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
      throw new E.Dbr_unknown_or_unprepared_fontnick '^dbr/outlines@1^', fontnick
    return R

  #---------------------------------------------------------------------------------------------------------
  prepare_font: ( cfg ) ->
    clasz = @constructor
    unless @state.prv_fontidx < clasz.C.last_fontidx
      throw new E.Dbr_font_capacity_exceeded '^dbr/outlines@1^', clasz.C.last_fontidx + 1
    #.........................................................................................................
    @types.validate.dbr_prepare_font_cfg ( cfg = { @constructor.C.defaults.dbr_prepare_font_cfg..., cfg..., } )
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
  _normalize_drb_chrs: ( chrs ) ->
    chrs = ( chrs.flat Infinity ).join '' if @types.isa.list chrs
    return ( ( chr.codePointAt 0 ) for chr in Array.from chrs )

  #---------------------------------------------------------------------------------------------------------
  get_cgid_map: ( cfg ) ->
    ### Given a list of Unicode CIDs as `cids` and a `fontnick`, return a `Map` from CIDs to GIDs
    (glyf IDs). Unmappable CIDs will be left out. ###
    ### TAINT validate ###
    @types.validate.dbr_get_cgid_map_cfg ( cfg = { @constructor.C.defaults.dbr_get_cgid_map_cfg..., cfg..., } )
    { cids
      chrs
      fontnick }  = cfg
    cids       ?= @_normalize_drb_chrs chrs
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
  shape_text: ( cfg ) ->
    @types.validate.dbr_shape_text_cfg ( cfg = { @constructor.C.defaults.dbr_shape_text_cfg..., cfg..., } )
    { fontnick
      text      } = cfg
    font_idx      = @_font_idx_from_fontnick fontnick
    R             = JSON.parse @RBW.shape_text { format: 'json', text, font_idx, } # formats: json, rusty, short
    bytes         = Buffer.from text, { encoding: 'utf-8', }
    for d, idx in R
      nxt_b   = R[ idx + 1 ]?.b ? Infinity
      d.text  = bytes[ d.b ... nxt_b ].toString()
    return R

  #-----------------------------------------------------------------------------------------------------------
  get_font_metrics: ( cfg ) ->
    @types.validate.dbr_get_font_metrics_cfg ( cfg = { @constructor.C.defaults.dbr_get_font_metrics_cfg..., cfg..., } )
    { fontnick }  = cfg
    font_idx      = @_font_idx_from_fontnick fontnick
    return JSON.parse @RBW.get_font_metrics font_idx

  #-----------------------------------------------------------------------------------------------------------
  _zip:                     ( txt ) -> ZLIB.deflateRawSync ( Buffer.from txt ), @constructor.C.zlib_zip_cfg
  _unzip:                   ( bfr ) -> ( ZLIB.inflateRawSync bfr ).toString()

  #-----------------------------------------------------------------------------------------------------------
  insert_and_walk_outlines: ( cfg ) ->
    ### Given a `cfg.fontnick` and a (list or map of) `cfg.cgid_map`, insert the outlines and bounding
    boxes of the referred glyfs. ###
    ### TAINT validate ###
    @types.validate.dbr_insert_outlines_cfg ( cfg = { @constructor.C.defaults.dbr_insert_outlines_cfg..., cfg..., } )
    { fontnick
      chrs
      cids
      cgid_map }        = cfg
    cgid_map           ?= @get_cgid_map { fontnick, chrs, cids, }
    insert_outline      = @db.prepare @sql.insert_outline
    #.......................................................................................................
    try
      @db.begin_transaction()
      for [ cid, gid, ] from cgid_map
        glyph       = String.fromCodePoint cid
        { bbox
          pd    }   = @get_single_outline { gid, fontnick, }
        { x,  y,
          x1, y1, } = bbox
        pd_blob     = @_zip pd
        yield @db.first_row insert_outline, { fontnick, gid, cid, glyph, x, y, x1, y1, pd_blob, }
      return null
    catch error
      @db.rollback_transaction()
      throw error
    @db.commit_transaction()
    return null

  #-----------------------------------------------------------------------------------------------------------
  insert_outlines: ( cfg ) -> [ ( @insert_and_walk_outlines cfg )..., ]

#-----------------------------------------------------------------------------------------------------------
get_assigned_unicode_cids = ( cfg ) ->
  throw new Error "^3049385^ not implemented" if cfg?
  R = []
  ranges = [
    # excluded: 0x00, control characters, space
    [ 0x00021, 0x0d800 ]
    # excluded: high and low surrogates
    [ 0x0e000, 0x0f8ff ]
    # excluded: PUA
    [ 0x0f900, 0x0fffd ]
    # excluded: non-characters
    [ 0x10000, 0x1fffd ] # SMP
    # excluded: non-characters
    [ 0x20000, 0x2fffd ] # SIP
    # excluded: non-characters
    [ 0x30000, 0x3fffd ] # TIP
    # excluded: non-characters
    ]
  ### see https://unicode.org/reports/tr18/#General_Category_Property ###
  ### see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Unicode_Property_Escapes ###
  pattern_A = /^(\p{L}|\p{M}|\p{N}|\p{S}|\p{P})/u
  pattern_B = /^\P{Cn}$/u
  R = []
  for [ lo, hi, ] in ranges
    for cid in [ lo .. hi ]
      continue unless pattern_A.test String.fromCodePoint cid
      # continue unless pattern_B.test String.fromCodePoint cid
      R.push cid
  return R
# U+FFFE and U+FFFF on the BMP, U+1FFFE and U+1FFFF on Plane 1, and so on, up to U+10FFFE and U+10FFFF on
# Plane 16, for a total of 34 code points. In addition, there is a contiguous range of another 32 noncharacter
# code points in the BMP: U+FDD0..U+FDEF

# D800–DBFF) and 1024 "low" surrogates (DC00–DFFF



