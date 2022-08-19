var mongoose=    require("mongoose");
var passportLocalMongoose=require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    username:String,
    password:String,
    col:[
        {
            link:String,
            rating:String,
            platform:String,
            qname:String
        }
    ]
});

UserSchema.plugin(passportLocalMongoose);
module.exports =mongoose.model("User",UserSchema);