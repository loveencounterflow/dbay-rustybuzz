
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DBAY-RUSTYBUZZ/_SPECIALS'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
types                     = require './types'
{ isa
  type_of
  validate
  validate_list_of }      = types.export()
E                         = require './errors'
SQL                       = String.raw
guy                       = require 'guy'


#===========================================================================================================
# SPECIALS
#-----------------------------------------------------------------------------------------------------------
specials =
  ignored:
    chrs:     ''
    gid:      -1
  spc:
    chrs:     '\u{0020}'  # soft space
    symbolic: '␣'         # U+2423 Open Box
    gid:      -2
  wbr:
    chrs:     '\u{200b}'  # word break opportunity (as in `foo/bar` with a WBR after the slash)
    gid:      -3
  shy:
    chrs:     '\u{00ad}'  # soft hyphen
    gid:      -4
  hhy:
    chrs:     '\u{002d}'  # hard hyphen
  nl:
    chrs:     '\n'        # manual line break
    symbolic: '⏎'         # U+23ce Return Symbol
    gid:      -6
  missing:
    chrs:     ''
    gid:      0

#-----------------------------------------------------------------------------------------------------------
do =>
  #.........................................................................................................
  seen =
    gid:        {}
    chrs:       {}
    symbolic:   {}
  #.........................................................................................................
  for name, d of specials
    d.name                    = name
    d.bytecount               = Buffer.byteLength d.chrs
    d.chrs                   ?= ''
    d.symbolic               ?= null
    d.gid                    ?= null
    #.......................................................................................................
    if d.gid?
      if ( entry = seen.gid[ d.gid ] )?
        throw new E.Dbr_internal_error '^dbr/main@1^', "GID #{d.gid} already in use for #{rpr entry}, \
          can't re-use for #{rpr d}"
      seen.gid[ d.gid ]  = d
    #.......................................................................................................
    if d.chrs.length > 1
      if ( entry = seen.chrs[ d.chrs ] )?
        throw new E.Dbr_internal_error '^dbr/main@1^', "chrs #{rpr d.chrs} already in use for #{rpr entry}, \
          can't re-use for #{rpr d}"
      seen.chrs[ d.chrs ] = d
    #.......................................................................................................
    if d.symbolic?
      if ( entry = seen.symbolic[ d.symbolic ] )?
        throw new E.Dbr_internal_error '^dbr/main@1^', "symbolic #{rpr d.symbolic} already in use for #{rpr entry}, \
          can't re-use for #{rpr d}"
      seen.symbolic[ d.symbolic ] = d
  #.........................................................................................................
  return null

#-----------------------------------------------------------------------------------------------------------
module.exports = guy.lft.freeze { specials, }


