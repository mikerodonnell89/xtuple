/*jshint node:true, indent:2, curly:false, eqeqeq:true, immed:true, latedef:true, newcap:true, noarg:true,
regexp:true, undef:true, strict:true, trailing:true, white:true */
/*global XT:true, X:true, _:true */

(function () {
  "use strict";

  var routes = require('./routes');

  var getIsRestORMs = function (req, res, next) {
    var callback = {},
        payload = {},
        session = {};

    callback = function (result) {
      if (result.isError) {
        return next(new Error("Invalid Request."));
      }

      getResources(req, res, next, result.data);
    };

    payload.nameSpace = "XT";
    payload.type = "Discovery";
    payload.dispatch = {
      functionName: "getIsRestORMs",
      isJSON: true
    };

    // Dummy up session.
    session.passport = {
      "user": {
        "id": req.user.get("username"),
        "username": req.user.get("username"),
        "organization": req.user.get("organization")
      }
    };

    routes.queryDatabase("post", payload, session, callback);
  };

  var getResources = function (req, res, next, orms) {
    var callback = {},
        payload = {},
        rootUrl = req.protocol + "://" + req.host + "/",
        session = {};

    callback = function (result) {
      if (result.isError) {
        return next(new Error("Invalid Request."));
      }

      routeCall(req, res, next, orms, result.data);
    };

    payload.nameSpace = "XT";
    payload.type = "Discovery";
    payload.dispatch = {
      functionName: "getResources",
      isJSON: true,
      parameters: [null, rootUrl]
    };

    // Dummy up session.
    session.passport = {
      "user": {
        "id": req.user.get("username"),
        "username": req.user.get("username"),
        "organization": req.user.get("organization")
      }
    };

    routes.queryDatabase("post", payload, session, callback);
  };

  var routeCall = function (req, res, next, orms, resources) {
    var id,
        error = {error: {}},
        model,
        schema,
        searchableAttributes,
        payload = {},
        session = {},
        callback = function (resp) {
          if (resp.isError) {
            // Google style error object.
            error.error.errors = [{message: resp.status.message}];
            error.error.code = resp.status.code;
            error.error.message = resp.status.message;
            return res.json(resp.status.code, error);
          } else {
            return res.json(resp.status.code, resp);
          }
        };

    //  Get the model id from this req URI.
    if (req.params.model && req.params.id) {
      id = req.params.id;
    }

    // Dummy up session.
    session.passport = {
      "user": {
        "id": req.user.get("username"),
        "username": req.user.get("username"),
        "organization": req.user.get("organization")
      }
    };

    _.each(orms, function (value, key, list) {
      // Find the matching model from this req URI.
      if (req.params.model && value && value.orm_namespace && value.orm_type &&
          req.params.model === value.orm_type.camelToHyphen()) {
        // TODO - Do we need to include "XM" in the name?
        model = value.orm_type;
      }
    });

    if (!model) {
      return res.send(404, "Not Found");
    } else {
      switch (req.method) {
      case "DELETE": // Deletes the specified resource.
        if (!id) {
          return res.send(404, "Not Found");
        }

        payload.nameSpace = "XM";
        payload.type = model;
        payload.id = id + "";

        routes.queryDatabase("delete", payload, session, callback);

        break;
      case "GET": // Requests a representation of the specified resource.
        payload.nameSpace = "XM";

        if (req.params.id) { // This is a single resource request.
          payload.type = model;
          payload.id = id + "";

          routes.queryDatabase("get", payload, session, callback);
        } else { // This is a list request.
          payload.type = resources[model].methods.list.response.$ref;
          payload.query = {};
          // unary plus is a cast to integer
          payload.query.rowLimit = (+req.query.maxResults) || 100;
          // assumption: pageToken is 0-indexed
          payload.query.rowOffset = (+req.query.pageToken) ?
            (+req.query.pageToken) * ((+req.query.maxResults) || 100) :
            0;

          // q represents a full-text search on any text attributes of the model
          payload.query.parameters = [];
          schema = XT.session.schemas.XM.attributes[payload.type.camelize().capitalize()];
          if (req.query.q) {
            searchableAttributes = _.compact(_.map(schema.columns, function (column) {
              return column.category === 'S' ? column.name : null;
            }));
            if (searchableAttributes.length > 0) {
              payload.query.parameters.push({
                attribute: searchableAttributes,
                operator: "MATCHES",
                value: req.query.q
              });
            }
          }

          // We also support field-level filtering, with the MATCHES, >=, or <=
          // operations. These latter two can be requested by appending Min or Max
          // to the end of the attribute name, as advertised in the discovery doc.
          _.each(schema.columns, function (column) {
            var attr = column.name,
              category = column.category,
              operator;

            if (['B', 'D', 'N', 'S'].indexOf(category) < 0) {
              return;
            }
            if (req.query[attr]) {
              if (category === 'S') {
                operator = "MATCHES";
              } else if (category === 'B' || category === 'N') {
                operator = "=";
              }
              payload.query.parameters.push({
                attribute: attr,
                operator: operator,
                value: req.query[attr]
              });
            }

            if (req.query[attr + "Min"]) {
              payload.query.parameters.push({
                attribute: attr,
                operator: ">=",
                value: req.query[attr + "Min"]
              });
            }
            if (req.query[attr + "Max"]) {
              payload.query.parameters.push({
                attribute: attr,
                operator: "<=",
                value: req.query[attr + "Max"]
              });
            }
          });


          routes.queryDatabase("get", payload, session, callback);
        }

        break;
      case "HEAD":
        // Asks for the response identical to the one that would correspond to a GET request, but without the response body.
        // This is useful for retrieving meta-information written in response headers, without having to transport the entire content.
        // TODO - call head method.
        return res.send(); // HEAD doesn't send a body.
      case "OPTIONS":
        // Returns the HTTP methods that the server supports for specified URL.
        // This can be used to check the functionality of a web server by requesting '*' instead of a specific resource.
        // TODO - call options method.
        return res.send('REST API OPTIONS call to model: ' + model);
      case "PATCH": // Is used to apply partial modifications to a resource.
        if (!id || !req.body || !req.body.etag || !req.body.patches) {
          return res.send(404, "Not Found");
        }

        payload.nameSpace = "XM";
        payload.type = model;
        payload.id = id + "";
        payload.etag = req.body.etag;
        payload.patches = req.body.patches;

        routes.queryDatabase("patch", payload, session, callback);

        break;
      case "POST": // Requests that the server accept the entity enclosed in the request as a new subordinate of the web resource identified by the URI.
        if (id || !req.body) {
          return res.send(404, "Not Found");
        }
        // TODO - POST method can also call dispatch functions for "service" endpoints.
        payload.nameSpace = "XM";
        payload.type = model;
        payload.data = req.body;

        routes.queryDatabase("post", payload, session, callback);

        break;
      case "PUT":
        // Requests that the enclosed entity be stored under the supplied URI.
        // TODO - call put method.
        return res.send('REST API does not support PUT calls at this time.');
      default:
        return res.send(404, "Not Found");
      }
    }
  };

  exports.router = [getIsRestORMs];

}());
