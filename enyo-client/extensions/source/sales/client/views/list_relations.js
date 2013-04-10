/*jshint bitwise:true, indent:2, curly:true eqeqeq:true, immed:true,
latedef:true, newcap:true, noarg:true, regexp:true, undef:true,
trailing:true white:true*/
/*global XT:true, XM:true, XV:true, _:true, window: true, enyo:true, Globalize:true*/

(function () {

  // ..........................................................
  // CUSTOMER GROUP CUSTOMER
  //

  enyo.kind({
    name: "XV.CustomerGroupCustomerListRelations",
    kind: "XV.ListRelations",
    orderBy: [
      {attribute: "customer.number"}
    ],
    parentKey: "customerGroup",
    components: [
      {kind: "XV.ListItem", components: [
        {kind: "FittableRows", components: [
          {kind: "XV.ListColumn", classes: "first", components: [
            {kind: "FittableColumns", components: [
              {kind: "XV.ListAttr", attr: "customer.number"},
              {kind: "XV.ListAttr", attr: "customer.name", fit: true, classes: "right"}
            ]}
          ]}
        ]}
      ]}
    ]
  });

}());
