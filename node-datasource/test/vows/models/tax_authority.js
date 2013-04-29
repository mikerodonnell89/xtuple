/*jshint trailing:true, white:true, indent:2, strict:true, curly:true,
  immed:true, eqeqeq:true, forin:true, latedef:true,
  newcap:true, noarg:true, undef:true */
/*global XT:true, XM:true, XV:true, process:true, module:true, require:true */

var XVOWS = XVOWS || {};
(function () {
  "use strict";

  var vows = require("vows"),
    assert = require("assert"),
    zombieAuth = require("../lib/zombie_auth"),
    crud = require('../lib/crud');

  var data = {},
    deleteData = {};

  data.createHash = {
    number: "TAXAUTH3",
    name: "TAXAUTH NAME"
  };

  data.updateHash = {
    name: "Jon Fishman"
  };

  vows.describe('XM.TaxAuthority CRUD test').addBatch({
    'INITIALIZE ': {
      topic: function () {
        var that = this,
          callback = function () {
            data.model = new XM.TaxAuthority();
            that.callback(null, data);
          };
        zombieAuth.loadApp(callback);
      },
      'The record type is XM.TaxAuthority': function (data) {
        assert.equal(data.model.recordType, "XM.TaxAuthority");
      }
    }
  }).addBatch({
    'CREATE ': crud.create(data, {
      '-> Set values': {
        topic: function (data) {
          data.model.set(data.createHash);
          return data;
        },
        'Last Error is null': function (data) {
          assert.isNull(data.model.lastError);
        },
        '-> Save': crud.save(data)
      }
    })
  }).addBatch({
    'READ': {
      topic: function () {
        return data;
      },
      'ID is a string': function (data) {
        assert.isString(data.model.id);
      }
    }
  }).addBatch({
    'UPDATE ': crud.update(data, {
      '-> Set values': {
        topic: function () {
          deleteData.accntId = data.model.get("account");
          deleteData.accountModel = new XM.Account();
          data.model.set(data.updateHash);
          return data;
        },
        'Name is `Updated Test TaxAuthority`': function (data) {
          assert.equal(data.model.get('name'), data.updateHash.name);
        },
        '-> Commit': crud.save(data)
      }
    })
  }).addBatch({
    'DESTROY': crud.destroy(data, {
      '-> Destroy the Tax Authority': {
        //Destroy the tax authority.  When that is successful, destroy the account
        'Tax Authority destroyed': function (data) {
          assert.equal(data.model.getStatusString(), 'DESTROYED_CLEAN');
        },
        '-> Destroy the Account': {
          topic: function () {
            var that = this,
              account = deleteData.accountModel,
              fetchOptionsAccnt = {},
              destroyAccount;

            fetchOptionsAccnt.id = deleteData.accntId;

            destroyAccount = function () {
              if (account.getStatus() === XM.Model.READY_CLEAN) {
                var accountDestroyed = function () {
                    if (account.getStatus() === XM.Model.DESTROYED_CLEAN) {
                      account.off("statusChange", accountDestroyed);
                      that.callback(null, account);
                    }
                  };

                account.off("statusChange", destroyAccount);
                account.on("statusChange", accountDestroyed);
                account.destroy();
              }
            };
            account.on("statusChange", destroyAccount);
            account.fetch(fetchOptionsAccnt);
          },
          'Account destroyed': function (account) {
            assert.equal(account.getStatusString(), 'DESTROYED_CLEAN');
          }
        }
      }
    })
  }).export(module);
  
}());
