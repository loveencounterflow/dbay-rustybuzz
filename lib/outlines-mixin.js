(function() {
  'use strict';
  var CND, E, FS, PATH, SQL, ZLIB, _TO_BE_REMOVED_bbox_pattern, badge, debug, echo, guy, help, info, jp, jr, rpr, to_width, urge, warn, whisper, width_of;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DRB/MIXIN/OUTLINES';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  guy = require('guy');

  PATH = require('path');

  FS = require('fs');

  E = require('./errors');

  ZLIB = require('zlib');

  _TO_BE_REMOVED_bbox_pattern = /^<rect x="(?<x>[-+0-9]+)" y="(?<y>[-+0-9]+)" width="(?<width>[-+0-9]+)" height="(?<height>[-+0-9]+)"\/>$/;

  SQL = String.raw;

  ({width_of, to_width} = require('to-width'));

  jr = JSON.stringify;

  jp = JSON.parse;

  //-----------------------------------------------------------------------------------------------------------
  this.Drb_outlines = (clasz = Object) => {
    return class extends clasz {
      // #---------------------------------------------------------------------------------------------------------
      // constructor: ->
      //   super()
      //   return undefined

        //---------------------------------------------------------------------------------------------------------
      // _$outlines_initialize: ->

        //---------------------------------------------------------------------------------------------------------
      get_single_outline(cfg) {
        var br, font_idx, fontnick, gid, height, match, parameters, pd, sid, width, x, x1, y, y1;
        /* TAINT this method is highly inefficient for large numbers of outline retrievals; the intention is to
           replace it with a function that allows for lists of `gid`s to be handled with a single call. */
        //.........................................................................................................
        this.types.validate.dbr_get_single_outline_cfg((cfg = {...this.constructor.C.defaults.dbr_get_single_outline_cfg, ...cfg}));
        ({fontnick, gid, sid} = cfg);
        if (sid != null) {
          ({fontnick, gid} = this._parse_sid(sid));
        }
        // debug '^3334^', { fontnick, gid, sid, }
        font_idx = this._font_idx_from_fontnick(fontnick);
        //.........................................................................................................
        ({br, pd} = JSON.parse(this.RBW.glyph_to_svg_pathdata(font_idx, gid)));
        //.........................................................................................................
        /* TAINT we parse the bounding rectangle (which will look like `<rect x="49" y="-613" width="245"
           height="627"/>`) so users of this method get (more or less) the format we mean to implement in the
           future. */
        if ((match = br.match(_TO_BE_REMOVED_bbox_pattern)) == null) {
          parameters = rpr({fontnick, gid, br});
          throw new E.Dbr_internal_error('^dbr/outlines@1^', `found unknown format when trying to parse bounding box SVG ${parameters}`);
        }
        x = parseInt(match.groups.x, 10);
        y = parseInt(match.groups.y, 10);
        width = parseInt(match.groups.width, 10);
        height = parseInt(match.groups.height, 10);
        x1 = x + width;
        y1 = y + height;
        return {
          bbox: {x, y, x1, y1, width, height},
          pd
        };
      }

      // #---------------------------------------------------------------------------------------------------------
      // _normalize_drb_chrs: ( chrs ) ->
      //   chrs = ( chrs.flat Infinity ).join '' if @types.isa.list chrs
      //   return ( ( chr.codePointAt 0 ) for chr in Array.from chrs )

        //---------------------------------------------------------------------------------------------------------
      get_cgid_map(cfg) {
        var R, ads, chrs, font_idx, fontnick, i, len, sd, sds, text;
        /* Given a list of characters as `chrs` and a `fontnick`, return a `Map` from characters to GIDs
           (glyf IDs). Unmappable characters will be left out. */
        this.types.validate.dbr_get_cgid_map_cfg((cfg = {...this.constructor.C.defaults.dbr_get_cgid_map_cfg, ...cfg}));
        ({ads, chrs, fontnick} = cfg);
        if (ads != null) {
          return this._get_cgid_map_from_ads(ads);
        }
        font_idx = this._font_idx_from_fontnick(fontnick);
        if (this.types.isa.list(chrs)) {
          text = chrs.join('\n');
        } else {
          text = chrs;
        }
        sds = this.arrange({
          fontnick,
          text,
          fm: {},
          doc: 0,
          par: 0,
          trk: 1
        });
        R = new Map();
        for (i = 0, len = sds.length; i < len; i++) {
          sd = sds[i];
          if (sd.gid === 0) {
            continue;
          }
          /* TAINT it *might* happen that several distinct `chrs` sequences map to the *same* GID */
          R.set(sd.gid, sd.chrs);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _get_cgid_map_from_ads(ads) {
        var R, ad, i, len;
        R = new Map();
        for (i = 0, len = ads.length; i < len; i++) {
          ad = ads[i];
          if (ad.gid == null) {
            continue;
          }
          R.set(ad.gid, ad.chrs);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _zip(txt) {
        return ZLIB.deflateRawSync(Buffer.from(txt), this.constructor.C.zlib_zip_cfg);
      }

      _unzip(bfr) {
        return (ZLIB.inflateRawSync(bfr)).toString();
      }

      //---------------------------------------------------------------------------------------------------------
      * insert_and_walk_outlines(cfg) {
        var ads, bbox, cgid_map, chrs, error, fontnick, gid, insert_outline, missing, pd, pd_blob, row, specials, x, x1, y, y1, z;
        /* Given a `cfg.fontnick` and a (list or map of) `cfg.cgid_map`, insert the outlines and bounding
           boxes of the referred glyfs. */
        /* TAINT validate */
        this.types.validate.dbr_insert_outlines_cfg((cfg = {...this.constructor.C.defaults.dbr_insert_outlines_cfg, ...cfg}));
        ({fontnick, chrs, cgid_map, ads} = cfg);
        if (cgid_map == null) {
          cgid_map = this.get_cgid_map({fontnick, chrs, ads});
        }
        insert_outline = this.db.prepare(this.sql.insert_outline);
        ({specials} = this.constructor.C);
        ({missing} = specials);
        try {
          if (!this.db.within_transaction()) {
            //.......................................................................................................
            this.db.begin_transaction();
          }
          for (z of cgid_map) {
            [gid, chrs] = z;
            if (gid <= missing.gid) {
              continue;
            }
            ({bbox, pd} = this.get_single_outline({gid, fontnick}));
            ({x, y, x1, y1} = bbox);
            pd_blob = this._zip(pd);
            row = this.db.first_row(insert_outline, {fontnick, gid, chrs, x, y, x1, y1, pd_blob});
            delete row.pd_blob;
            yield row;
          }
        } catch (error1) {
          error = error1;
          if (this.db.within_transaction()) {
            this.db.rollback_transaction();
          }
          throw error;
        }
        if (this.db.within_transaction()) {
          this.db.commit_transaction();
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      insert_outlines(cfg) {
        var _, ref;
        ref = this.insert_and_walk_outlines(cfg);
        for (_ of ref) {
          null;
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      compose(cfg) {
        var ads, doc, fontnick, par, text;
        /*
        * **XXX** Update table `outlines` with the outlines of all glyfs needed for composition
        * **YYY** write HTML+SVG
         */
        this.types.validate.dbr_compose_cfg((cfg = {...this.constructor.C.defaults.dbr_compose_cfg, ...cfg}));
        ({doc, par, text, fontnick} = cfg);
        //.......................................................................................................
        ads = this.db.all_rows(SQL`select
    gid,
    chrs
  from ads
  where true
    and ( doc = $doc )
    and ( par = $par )
    and gid not in ( select gid from outlines where fontnick = $fontnick )
  order by 1, 2;`, {doc, par, fontnick});
        this.insert_outlines({fontnick, ads});
        return null;
      }

    };
  };

}).call(this);

//# sourceMappingURL=outlines-mixin.js.map