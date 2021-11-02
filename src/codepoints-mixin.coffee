


'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DRB/MIXIN/CODEPOINTS'
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


#-----------------------------------------------------------------------------------------------------------
@Drb_codepoints = ( clasz = Object ) => class extends clasz

  # #---------------------------------------------------------------------------------------------------------
  # constructor: ->
  #   super()
  #   #.........................................................................................................
  #   return undefined

  #---------------------------------------------------------------------------------------------------------
  get_assigned_unicode_chrs: ( cfg ) ->
    throw new E.Dbr_not_implemented '^Drb/codepoints@1^', "cfg for get_assigned_unicode_chrs()" if cfg?
    R = new Set()
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
    pattern_A = /^(\p{L}|\p{M}|\p{N}|\p{S}|\p{P})/u ### Printing codepoints ###
    # pattern_B = /^\P{Cn}$/u                         ### Assigned codepoints ###
    R = new Set()
    for [ lo, hi, ] in ranges
      for cid in [ lo .. hi ]
        continue unless pattern_A.test String.fromCodePoint cid
        # continue unless pattern_B.test String.fromCodePoint cid
        R.add String.fromCodePoint cid
    return [ R..., ]


