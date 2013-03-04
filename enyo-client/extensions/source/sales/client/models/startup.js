/*jshint indent:2, curly:true eqeqeq:true, immed:true, latedef:true,
newcap:true, noarg:true, regexp:true, undef:true, strict:true, trailing:true
white:true*/
/*global XT:true, XM:true, Backbone:true, _:true, console:true */

(function () {
  "use strict";

  XT.extensions.sales.initStartup = function () {
    XT.StartupTasks.push({
      taskName: "loadSaleTypes",
      task: function () {
        var options = {
            success: _.bind(this.didComplete, this)
          };
        options.query = {};
        options.query.orderBy = [
          {attribute: 'code'}
        ];
        XM.saleTypes = new XM.SaleTypeCollection();
        XM.saleTypes.fetch(options);
      }
    });
  };

}());
