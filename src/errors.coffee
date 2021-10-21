'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DBR/ERRORS'
debug                     = CND.get_logger 'debug',     badge
# warn                      = CND.get_logger 'warn',      badge
# info                      = CND.get_logger 'info',      badge
# urge                      = CND.get_logger 'urge',      badge
# help                      = CND.get_logger 'help',      badge
# whisper                   = CND.get_logger 'whisper',   badge
# echo                      = CND.echo.bind CND
E                         = require 'dbay/lib/errors'

#===========================================================================================================
# class @Dbr_not_implemented extends E.Dbay_error
class @Dbr_not_implemented extends E.DBay_not_implemented


