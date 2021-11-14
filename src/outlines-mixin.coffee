


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
SQL                       = String.raw
{ width_of
  to_width }              = require 'to-width'
jr                        = JSON.stringify
jp                        = JSON.parse


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
    try fspath = @_fspath_from_fontnick fontnick catch error
      if ( @types.type_of error ) is 'dbay_expected_single_row'
        throw new E.Dbr_unknown_or_unprepared_fontnick '^dbr/outlines@1^', fontnick
      throw error
    font_idx    = ( @state.prv_fontidx += 1 )
    font_bytes  = @_get_font_bytes fspath
    @RBW.register_font font_idx, font_bytes
    @state.font_idx_by_fontnicks[ fontnick ] = font_idx
    return null

  #---------------------------------------------------------------------------------------------------------
  _parse_sid: ( sid ) -> ( sid.match /^o(?<gid>[0-9]+)(?<fontnick>.+)$/ ).groups

  #---------------------------------------------------------------------------------------------------------
  get_single_outline: ( cfg ) ->
    ### TAINT this method is highly inefficient for large numbers of outline retrievals; the intention is to
    replace it with a function that allows for lists of `gid`s to be handled with a single call. ###
    #.........................................................................................................
    @types.validate.dbr_get_single_outline_cfg ( cfg = { @constructor.C.defaults.dbr_get_single_outline_cfg..., cfg..., } )
    { fontnick
      gid
      sid     } = cfg
    { fontnick
      gid     } = @_parse_sid sid if sid?
    # debug '^3334^', { fontnick, gid, sid, }
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
    ### Given a list of characters as `chrs` and a `fontnick`, return a `Map` from characters to GIDs
    (glyf IDs). Unmappable characters will be left out. ###
    @types.validate.dbr_get_cgid_map_cfg ( cfg = { @constructor.C.defaults.dbr_get_cgid_map_cfg..., cfg..., } )
    { ads
      chrs
      fontnick }  = cfg
    return @_get_cgid_map_from_ads ads if ads?
    font_idx      = @_font_idx_from_fontnick fontnick
    if @types.isa.list chrs then  text = chrs.join '\n'
    else                          text = chrs
    sds           = @shape_text { fontnick, text, }
    R             = new Map()
    for sd in sds
      continue if sd.gid is 0
      ### TAINT it *might* happen that several distinct `chrs` sequences map to the *same* GID ###
      R.set sd.gid, sd.chrs
    return R

  #---------------------------------------------------------------------------------------------------------
  _get_cgid_map_from_ads: ( ads ) ->
    R = new Map()
    for ad in ads
      continue unless ad.gid?
      R.set ad.gid, ad.chrs
    return R

  #---------------------------------------------------------------------------------------------------------
  ### 'arrange()' like 'compose()' and 'distribute()' ###
  _shape_hyphenated: ( cfg ) ->
    { fontnick
      ads
      doc
      par
      vrt   } = cfg
    R         = []
    #.......................................................................................................
    texts = []
    brpis = ( adi for ad, adi in ads when ad.br is 'shy' )
    debug '^44554^', { brpis, }
    #.......................................................................................................
    return R

  #---------------------------------------------------------------------------------------------------------
  ### 'arrange()' like 'compose()' and 'distribute()' ###
  shape_text: ( cfg ) ->
    @types.validate.dbr_shape_text_cfg ( cfg = { @constructor.C.defaults.dbr_shape_text_cfg..., cfg..., } )
    { fontnick
      text
      doc
      par
      vrt       } = cfg
    { special_chrs
      missing }   = @constructor.C
    font_idx      = @_font_idx_from_fontnick fontnick
    ads           = JSON.parse @RBW.shape_text { format: 'json', text, font_idx, } # formats: json, rusty, short
    #.......................................................................................................
    ads.unshift { doc, par, adi: 0, vrt, \
      vnr: [ doc, par, 0, vrt, ], \
      gid: null, b: null, x: 0, y: 0, dx: 0, dy: 0, x1: 0, chrs: null, sid: null, \
      br: 'start', }
    bytes         = Buffer.from text, { encoding: 'utf-8', }
    ced_x         = 0 # cumulative error displacement from missing outlines
    ced_y         = 0 # cumulative error displacement from missing outlines
    for ad, adi in ads
      ad.doc    = doc
      ad.par    = par
      ad.adi    = adi
      ad.vrt    = vrt
      ad.vnr    = [ doc, par, adi, vrt, ]
      nxt_b     = ads[ adi + 1 ]?.b ? Infinity
      ad.chrs   = bytes[ ad.b ... nxt_b ].toString()
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
      if ad.chrs.startsWith special_chrs.shy
        ### TAINT insert data about replacement gids, metrics if hyphen instead of soft hyphen should be
        used at this position ###
        ad.sid  = "oshy-#{fontnick}"
        ad.br   = 'shy'
        # ads[ adi ]  = [ ad, ]
      else if ad.chrs.startsWith special_chrs.wbr
        ad.sid  = "owbr-#{fontnick}"
        ad.br   = 'wbr'
      else if ad.chrs is ' '
        ad.br   = 'spc'
      #.....................................................................................................
      ad.x    = Math.round ad.x
      ad.y    = Math.round ad.y
      ad.dx   = Math.round ad.dx
      ad.dy   = Math.round ad.dy
      ad.x1   = ad.x + ad.dx
    #.......................................................................................................
    last_adi  = ads.length - 1
    last_ad   = ads[ last_adi ]
    ads.push { doc, par, adi: last_adi + 1, vrt, \
      vnr: [ doc, par, last_adi + 1, vrt, ], \
      gid: null, b: null, x: last_ad.x1, y: last_ad.y, dx: 0, dy: 0, \
      x1: last_ad.x1, chrs: null, sid: null, br: 'end', }
    #.......................................................................................................
    return ads

  #---------------------------------------------------------------------------------------------------------
  get_font_metrics: ( cfg ) ->
    @types.validate.dbr_get_font_metrics_cfg ( cfg = { @constructor.C.defaults.dbr_get_font_metrics_cfg..., cfg..., } )
    { fontnick }  = cfg
    font_idx      = @_font_idx_from_fontnick fontnick
    return JSON.parse @RBW.get_font_metrics font_idx

  #---------------------------------------------------------------------------------------------------------
  _zip:   ( txt ) -> ZLIB.deflateRawSync ( Buffer.from txt ), @constructor.C.zlib_zip_cfg
  _unzip: ( bfr ) -> ( ZLIB.inflateRawSync bfr ).toString()

  #---------------------------------------------------------------------------------------------------------
  insert_and_walk_outlines: ( cfg ) ->
    ### Given a `cfg.fontnick` and a (list or map of) `cfg.cgid_map`, insert the outlines and bounding
    boxes of the referred glyfs. ###
    ### TAINT validate ###
    @types.validate.dbr_insert_outlines_cfg ( cfg = { @constructor.C.defaults.dbr_insert_outlines_cfg..., cfg..., } )
    { fontnick
      chrs
      cgid_map
      ads             } = cfg
    cgid_map           ?= @get_cgid_map { fontnick, chrs, ads, }
    insert_outline      = @db.prepare @sql.insert_outline
    { missing }         = @constructor.C
    #.......................................................................................................
    try
      @db.begin_transaction() unless @db.within_transaction()
      for [ gid, chrs, ] from cgid_map
        continue if gid is missing.gid
        { bbox
          pd    }   = @get_single_outline { gid, fontnick, }
        { x,  y,
          x1, y1, } = bbox
        pd_blob     = @_zip pd
        row         = @db.first_row insert_outline, { fontnick, gid, chrs, x, y, x1, y1, pd_blob, }
        delete row.pd_blob
        yield row
    catch error
      @db.rollback_transaction() if @db.within_transaction()
      throw error
    @db.commit_transaction() if @db.within_transaction()
    return null

  #---------------------------------------------------------------------------------------------------------
  insert_outlines: ( cfg ) -> null for _ from @insert_and_walk_outlines cfg; null

  #---------------------------------------------------------------------------------------------------------
  compose: ( cfg ) ->
    ### Compose (usually up to one paragraph's worth of) text on a single line without line breaks. ###
    @types.validate.dbr_compose_cfg ( cfg = { @constructor.C.defaults.dbr_compose_cfg..., cfg..., } )
    { fontnick
      text
      known_ods         } = cfg
    known_ods            ?= {}
    new_ods               = {}
    missing_ads           = {}
    { missing, }          = @constructor.C
    fm                    = @get_font_metrics { fontnick, }
    #.......................................................................................................
    ### Shape text, which gives us positions, GIDs/SIDs, and the characters corresponding to each outline.
    The `required_ads` maps from SIDs to arrangement data items (ADs): ###
    ### TAINt return standard glyph for all missing outlines ###
    doc                   = 1 ### Document ID ###
    par                   = 1 ### Paragraph ID ###
    ads                   = @shape_text { fontnick, text, doc, par, vrt: 1, }
    ads                   = [ ads..., ( @_shape_hyphenated { fontnick, ads, doc, par, vrt: 2, } )..., ]
    #.......................................................................................................
    @db =>
      insert_ad = @db.prepare @sql.insert_ad ?= @db.create_insert { schema: @cfg.schema, into: 'ads', }
      for ad in ads
        vnr       = jr ad.vnr
        row       = { br: null, ad..., vnr, }
        row.nobr  = if row.nobr then 1 else 0
        insert_ad.run row
      return null
    #.......................................................................................................
    missing_ads[ d.sid ]  = d for d in ads
    fm                    = @get_font_metrics { fontnick, }
    #.......................................................................................................
    required_sids = Object.keys missing_ads
    for od from @db SQL"""
      select
          fontnick, gid, sid, chrs, x, y, x1, y1, pd
      from outlines
      where ( gid != 0 ) and ( sid in #{@db.sql.V required_sids} );"""
      known_ods[ od.sid ] = od
      delete missing_ads[ od.sid ]
    #.......................................................................................................
    ### Retrieve (from font) and insert (into DB) missing outline data (ODs) items: ###
    for od from @insert_and_walk_outlines { fontnick, ads, }
      delete missing_ads[ od.sid ]
      known_ods[  od.sid ]  = od
      new_ods[    od.sid ]  = od
    #.......................................................................................................
    missing_chrs = ( ad for ad in ads when ad.gid is missing.gid )
    #.......................................................................................................
    return { known_ods, new_ods, missing_chrs, ads, fm, }


