


'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DBAY-RUSTYBUZZ'
debug                     = CND.get_logger 'debug',     badge
alert                     = CND.get_logger 'alert',     badge
whisper                   = CND.get_logger 'whisper',   badge
warn                      = CND.get_logger 'warn',      badge
help                      = CND.get_logger 'help',      badge
urge                      = CND.get_logger 'urge',      badge
info                      = CND.get_logger 'info',      badge
jr                        = JSON.stringify
Intertype                 = ( require 'intertype' ).Intertype
intertype                 = new Intertype module.exports
dbay_types                = require 'dbay/lib/types'


#-----------------------------------------------------------------------------------------------------------
@declare 'constructor_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "@isa.nonempty_text x.prefix":                    ( x ) -> @isa.nonempty_text x.prefix
  "@isa_optional.nonempty_text x.path":             ( x ) -> @isa_optional.nonempty_text x.path
  "dbay_types.dbay_schema x.schema":                ( x ) -> dbay_types.isa.dbay_schema x.schema
  "@isa.boolean x.create":                          ( x ) -> @isa.boolean x.create

