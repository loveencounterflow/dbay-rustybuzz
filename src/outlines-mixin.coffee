


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

  # #---------------------------------------------------------------------------------------------------------
  # constructor: ->
  #   super()
  #   return undefined

  #---------------------------------------------------------------------------------------------------------
  # _$outlines_initialize: ->

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

  # #---------------------------------------------------------------------------------------------------------
  # _normalize_drb_chrs: ( chrs ) ->
  #   chrs = ( chrs.flat Infinity ).join '' if @types.isa.list chrs
  #   return ( ( chr.codePointAt 0 ) for chr in Array.from chrs )

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
    sds           = @arrange { fontnick, text, fm: {}, doc: 0, par: 0, trk: 1, }
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
    { specials }        = @constructor.C
    { missing }         = specials
    #.......................................................................................................
    try
      @db.begin_transaction() unless @db.within_transaction()
      for [ gid, chrs, ] from cgid_map
        continue if gid <= missing.gid
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
    ###
    * **XXX** Update table `outlines` with the outlines of all glyfs needed for composition
    * **YYY** write HTML+SVG
    ###
    @types.validate.dbr_compose_cfg ( cfg = { @constructor.C.defaults.dbr_compose_cfg..., cfg..., } )
    { doc
      par
      text
      fontnick } = cfg
    #.......................................................................................................
    ads = @db.all_rows SQL"""
      select
          gid,
          chrs
        from ads
        where true
          and ( doc = $doc )
          and ( par = $par )
          and gid not in ( select gid from outlines where fontnick = $fontnick )
        order by 1, 2;""", { doc, par, fontnick, }
    @insert_outlines { fontnick, ads, }
    return null


