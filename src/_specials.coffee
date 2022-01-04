
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
  missing1:
    chrs:     ''
    gid:      -1
    width:    500
  missing2:
    chrs:     ''
    gid:      -2
    width:    1000
  ignored:
    chrs:     ''
    gid:      -3
    marker:   'i'
    pd:       'M0,-609c-61,0 -111,50 -111,111c0,61 50,111 111,111c61,0 111,-50 111,-111c0,-29 -12,-58 -32,-78c-21,-21 -49,-32 -78,-32zM0,-560c16,0 32,6 43,18c11,11 18,27 18,43c0,34 -27,61 -61,61c-34,0 -61,-27 -61,-61c0,-16 6,-32 18,-43c11,-11 27,-18 43,-18z'
  spc:
    chrs:     '\u{0020}'  # soft space
    symbolic: '␣'         # U+2423 Open Box
    gid:      -4
  wbr:
    chrs:     '\u{200b}'  # word break opportunity (as in `foo/bar` with a WBR after the slash)
    gid:      -5
    marker:   'w'
    pd:       "M0,84l-147,166h293z"
  shy:
    chrs:     '\u{00ad}'  # soft hyphen
    gid:      -6
    marker:   's'
    pd:       "M-204,265h178v-802h50v802h178v70h-406z"
  hhy:
    chrs:     '\u{002d}'  # hard hyphen
    marker:   'h'
  nl:
    chrs:     '\n'        # manual line break
    symbolic: '⏎'         # U+23ce Return Symbol
    gid:      -7
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
  for _, entry of specials
    specials[ entry.gid ] = entry
  #.........................................................................................................
  return null

#-----------------------------------------------------------------------------------------------------------
module.exports = guy.lft.freeze { specials, }


