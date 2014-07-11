
var RedmineWebServer = require("../lib/redmine_web_server").RedmineWebServer;

var fs = require("fs");
var should = require("should");
var sinon = require('sinon');
var util = require('util');
var path = require('path');
var fs = require("fs");




// fake protocol
//----------------------------------------------------------------

function FakeProtocol() {
    var EventEmmitter = require("events").EventEmitter;
    function FakeRes(){
        EventEmmitter.call(this);
    }
    util.inherits(FakeRes,EventEmmitter);

    function FakeReq() {
        this.end = function(){  }
    }
    util.inherits(FakeReq,EventEmmitter);


    this.get_fixture_file = function() {
        return "";
    }
    this.request= function(option, callback) {

        console.log("options",option);
        var res = new FakeRes();
        var req = new FakeReq();
        callback(res);

        var self = this;
        setImmediate(function(){

            fs.readFile(path.join(__dirname, self.get_fixture_file()),function (err, data){

                res.emit("data",data);
                res.statusCode = 200;
                res.emit("end");
            });
        });
        return req;

    }


};



describe("Testing RedmineWebServer with a fake http connection", function () {


    var redmine = new RedmineWebServer({
        url:"http://fakeurl/",
        api_key:"010101010"
    });

    it("should fetch project versions",function(done){

        redmine.http_protocol= new FakeProtocol();
        redmine.http_protocol.get_fixture_file = sinon.stub().returns("fixture_project_versions.json");


        redmine.fetchVersions("project",function (err,versions){

            versions.length.should.eql(16);
            done(err);
        });
    });

    it("should fetch issue statuses",function(done){

        redmine.http_protocol= new FakeProtocol();
        redmine.http_protocol.get_fixture_file = sinon.stub().returns("fixture_issue_statuses.json");

        redmine.fetchIssueStatuses(function (err,issues_statuses){
            issues_statuses.length.should.eql(21);
            done(err);
        });
    });
    it("should fetch roles",function(done){

        redmine.http_protocol= new FakeProtocol();
        redmine.http_protocol.get_fixture_file = sinon.stub().returns("fixture_roles.json");

        redmine.fecthRoles(function (err,roles){
            roles.length.should.eql(6);
            done(err);
        });
    });

    it("should fetch trackers",function(done){

        redmine.http_protocol= new FakeProtocol();
        redmine.http_protocol.get_fixture_file = sinon.stub().returns("fixture_trackers.json");

        redmine.fecthTrackers(function (err,trackers){
            trackers.length.should.eql(12);
            done(err);
        });
    });
});
