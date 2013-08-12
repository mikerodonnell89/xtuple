/*jshint bitwise:true, indent:2, curly:true, eqeqeq:true, immed:true,
latedef:true, newcap:true, noarg:true, regexp:true, undef:true,
trailing:true, white:true*/
/*global XT:true, XV:true, XM:true, _:true, enyo:true*/

(function () {

  enyo.kind({
    name: "XV.SortPopup",
    kind: "onyx.Popup",
    classes: "xv-sort-popup",
    centered: true,
    floating: true,
    modal: true,
    autoDismiss: false,
    scrim: true,
    published: {
      list: null,
      nav: null
    },
    components: [
      {kind: "FittableRows", components: [
        {kind: "onyx.Groupbox", components: [
          {kind: "onyx.GroupboxHeader", content: "_sortBy".loc()},
          {kind: "FittableColumns", style: "text-align: center;", components: [
            {kind: "XV.SortPicker", name: "sortPicker1"},
            {kind: "XV.SortTypePicker", name: "sortTypePicker1"}
          ]},
        ]},
        {kind: "onyx.Groupbox", components: [
          {kind: "onyx.GroupboxHeader", content: "_then".loc()},
          {kind: "FittableColumns", style: "text-align: center;", components: [
            {kind: "XV.SortPicker", name: "sortPicker2"},
            {kind: "XV.SortTypePicker", name: "sortTypePicker2"}
          ]},
        ]},
        {kind: "onyx.Groupbox", components: [
          {kind: "onyx.GroupboxHeader", content: "_then".loc()},
          {kind: "FittableColumns", style: "text-align: center;", components: [
            {kind: "XV.SortPicker", name: "sortPicker3"},
            {kind: "XV.SortTypePicker", name: "sortTypePicker3"}
          ]},
        ]},
        {classes: "xv-button-bar", components: [
          {kind: "onyx.Button", name: "sortListButton", ontap: "sortList",
            content: "_sort".loc()},
          {kind: "onyx.Button", name: "cancelButton", ontap: "closePopup",
            content: "_cancel".loc()}
        ]}
      ]}
    ],
    closePopup: function (inSender, inEvent) {
      this.hide();
    },
    setPickerStrings: function (inSender, inEvent) {
      var coll = XT.getObjectByName(this.list.getCollection()),
        mod,
        attrs,
        relations;

      if (coll.prototype) {
        mod = coll.prototype.model;
        attrs = mod.getAttributeNames();
        relations = mod.prototype.relations;
      }

      //remove chars we don't want to sort
      var unwanted = ["characteristics", "address",
        "id", "uuid", "priorityOrder", "statusOrder", "password"];

      for (var i = 0; i < attrs.length; i++) {
        if (unwanted.indexOf(attrs[i]) !== -1) {
          attrs.splice(attrs.indexOf(attrs[i]), 1);
        }
      }

      for (var i = 0; i < relations.length; i++) {
        if (relations[i].type === Backbone.HasOne && relations[i].isNested) {
          var obj = XT.getObjectByName(relations[i].relatedModel),
            relKey = relations[i].key;
          if (obj) {
            var edMod = obj.prototype.editableModel;
            if (edMod) {
              var edModByName = XT.getObjectByName(edMod);
              if (edModByName) {
                var relAttrs = edModByName.getSearchableAttributes(),
                  index = attrs.indexOf(relKey);
                //remove attr as it exists on the model's attrs
                attrs.splice(index, 1);
                //remove unwanted attrs from relAttrs
                for (var y = 0; y < relAttrs.length; y++) {
                  if (unwanted.indexOf(relAttrs[y]) !== -1) {
                    relAttrs.splice(relAttrs.indexOf(attrs[y]), 1);
                  }
                }
                //push searchable attributes of the removed attr to attrs array
                for (var x = 0; x < relAttrs.length; x++) {
                  relAttrs[x] = relKey + "." + relAttrs[x];
                  attrs.push(relAttrs[x]);
                }
              }
            }
          }
        }
      }

      this.$.sortPicker1.setComponentsList(attrs);
      this.$.sortPicker2.setComponentsList(attrs);
      this.$.sortPicker3.setComponentsList(attrs);
    },
    sortList: function (inSender, inEvent) {
    //calling getSelected on this.$.sortPicker1.$.picker returns undefined
    // our itemSelected function on this.$.sortPicker1 doesn't work either
      var attr1 = this.$.sortPicker1.attr,
        attr2 = this.$.sortPicker2.attr,
        attr3 = this.$.sortPicker3.attr,
        attr1type = this.$.sortTypePicker1.getValueToString().toLowerCase(),
        attr2type = this.$.sortTypePicker2.getValueToString().toLowerCase(),
        attr3type = this.$.sortTypePicker3.getValueToString().toLowerCase(),
        query = [];

      if (attr1 !== "none" && attr1) {
        query.push({attribute: attr1, descending: attr1type === "descending"});
      }
      if (attr2 !== "none" && attr2) {
        query.push({attribute: attr2, descending: attr2type === "descending"});
      }
      if (attr3 !== "none" && attr3) {
        query.push({attribute: attr3, descending: attr3type === "descending"});
      }

      if ((attr1 === "none" || !attr1) &&
          (attr2 === "none" || !attr2) &&
          (attr3 === "none" || !attr3)) {
        query.push({attribute: "id"});
      }
      this.getList().getQuery().orderBy = query;
      this.getNav().requery();
      this.closePopup();
    }
  });

}());