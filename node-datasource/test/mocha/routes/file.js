/*jshint node:true, indent:2, curly:false, eqeqeq:true, immed:true, latedef:true, newcap:true, noarg:true,
regexp:true, undef:true, strict:true, trailing:true, white:true */
/*global X:true, XT:true, _:true, describe:true, it:true, before:true */

XT = {};
_ = require("underscore");

var assert = require("chai").assert,
  fileRoute = require("../../../routes/file"),
  dataRoute = require("../../../routes/data");

require("../../../xt");
require("../../../../lib/tools/source/foundation");
require("../../../../lib/tools/source/ext/string");
require("../../../../lib/tools/source/ext/proto/string");

(function () {
  "use strict";

  describe('The File route', function () {

    it('should transform binary data', function (done) {
      // mock the request
      var req = {
          query: {recordType: "XM.File", id: "mockymock"},
          session: {passport: {user: {}}}
        },
        // mock the response object
        mockData = "here is my mock data",
        buffer = new Buffer(mockData),
        res = {
          send: function (result) {
            assert.isUndefined(result.isError);
            // this is the real thing that we're testing: that the
            // result comes back clean just as it was put in
            assert.equal(result, mockData);
            done();
          },
          attachment: function () {}
        },
        // mock the call to the database
        queryFunction = function (org, query, callback) {
          // "I'm pg and I'm returning some data"
          var result = "{\"data\":{\"description\":\"foo.txt\",\"data\":\"" + buffer + "\"}}";
          callback(null, {rows: [{get: result}]});
        };

      // inject our mock query into the global variable
      X.database = {query: queryFunction};

      fileRoute.file(req, res);
    });
  });

  /**
    Test the transformation of binary data in the post route
  */
  describe('The POST method', function () {

    it('should be implemented with a queryDatabase function', function () {
      assert.isFunction(dataRoute.queryDatabase);
    });

    it('should transform binary data if asked to', function (done) {
      var binaryData = "flerg", // okay, I know this isn't really binary, but it doesn't have to be for this test
        // mock the payload
        payload = {binaryField: "binField", data: {binField: binaryData}},
        // mock the session
        session = {passport: {user: {username: "admin"}}},
        // mocking the call to the database
        queryFunction = function (org, query, callback) {
          var queryObj = JSON.parse(query.substring(query.indexOf('($$') + 3, query.indexOf('$$)')));
          // make sure that the route has transformed this data to binary
          assert.equal(queryObj.data.binField, "\\x666c657267");

          callback(null, {}); // "I'm pg and I'm returning some data"
        },
        adaptorCallback = function (err, res) {
          // return for mocha
          done();
        };

      // inject the mock into the global variable
      X.database = {query: queryFunction};

      dataRoute.queryDatabase("post", payload, session, adaptorCallback);
    });

  });
}());

