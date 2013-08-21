/*jshint indent:2, curly:true, eqeqeq:true, immed:true, latedef:true,
newcap:true, noarg:true, regexp:true, undef:true, strict:true, trailing:true,
white:true*/
/*global XT:true, XM:true, Backbone:true, _:true, console:true */

(function () {
  "use strict";

  XT.extensions.inventory.initShipmentModels = function () {

    /**
      @class

      @extends XM.Document
    */
    XM.Shipment = XM.Document.extend({

      recordType: "XM.Shipment",

      numberPolicy: XM.Document.AUTO_NUMBER,
      /*
      readOnlyAttributes: [
        "order"
      ],
      */
  
      canRecallShipment: function (callback) {
        var priv = this.get("isShipped") && this.get("isInvoiced") && this.get("isInvoicePosted") === false ? "RecallInvoicedShipment" : this.get("isShipped") && this.get("isInvoiced") === false ? "RecallOrders" : false;
        return _canDo.call(this, priv, callback);
      },
      
      doRecallShipment: function (callback) {
        return _doDispatch.call(this, "recallShipment", callback);
      }

    });

    /** @private */
    var _canDo = function (priv, callback) {
      var ret = XT.session.privileges.get(priv);
      if (callback) {
        callback(ret);
      }
      return ret;
    };

    /** @private */ 
    var _doDispatch = function (method, callback, params) {
      var that = this,
        options = {};
      params = params || [];
      params.unshift(this.id);
      options.success = function (resp) {
        var fetchOpts = {};
        fetchOpts.success = function () {
          if (callback) { callback(resp); }
        };
        if (resp) {
          that.fetch(fetchOpts);
        }
      };
      options.error = function (resp) {
        if (callback) { callback(resp); }
      };
      this.dispatch("XM.Inventory", method, params, options);
      return this;
    };

    /**
      @class

      @extends XM.Document
    */
    XM.ShipmentLine = XM.Document.extend({

      recordType: "XM.ShipmentLine",

      parentKey: "shipment"

    });

    /**
      @class

      @extends XM.Info
    */
    XM.ShipmentRelation = XM.Info.extend({

      recordType: "XM.ShipmentRelation",

      editableModel: "XM.Shipment"

    });


    // ..........................................................
    // COLLECTIONS
    //

    /**
      @class

      @extends XM.Collection
    */
    XM.ShipmentCollection = XM.Collection.extend({

      model: XM.Shipment

    });

  };

}());

