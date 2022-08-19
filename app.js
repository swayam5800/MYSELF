var express      =require("express"),
    app          =express(),
    bodyparser   =require("body-parser"),
    mongoose     =require("mongoose");
    passport     =require("passport"),
    Localstrategy=require("passport-local"),
    discussion   =require("./models/discussion"),
    methodoverride=require("method-override"),
    comment      = require("./models/comment"),
    flash         =require("connect-flash"),
    User         = require("./models/user"),
    seedDB       =require("./seed");


var url=process.env.DATABASEURL||"mongodb://localhost/myself_v6";
//mongoose.connect("mongodb://localhost/myself_v6");
mongoose.connect(url);


app.use(bodyparser.urlencoded({extended: true}));
app.set("view engine","ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodoverride("_method"));
app.use(flash());

//seedDB();

//passport configuration
app.use(require("express-session")({
    secret:"Rusty is the best and cuttest dog in world",
    resave:false,
    saveUninitialized:false
 }));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new Localstrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser()); 
app.use(function(req,res,next){
    res.locals.currentUser=req.user;
    res.locals.error    =req.flash("error");
    res.locals.success   =req.flash("success");
    next();
});



//creating new champf=ground every time for test and make proper wor

//=========================================
//all router
//=========================================

app.get("/",function(req,res){

    console.log("request for landing page");
    res.render("landing");
});
//=============================================
//discussion
//=============================================

app.get("/discussions",function(req,res){

    console.log("request for discussion page");
    discussion.find({},function(err,alldiscussion){
        if(err){
            console.log("something went wrong");
        }else{
            res.render("discussion/index",{discussion:alldiscussion});
        }
    });
});
//adding discussion to discussion model
app.post("/discussions",isLoggedIn,function(req,res){
    //excess data from the form
    var topic=req.body.topic;
    var question=req.body.question;
    var author={
        id: req.user._id,
        username:req.user.username
    }
    var newdiscussion={topic: topic , question:question,author : author};
    
    //add data to data base
    discussion.create(newdiscussion,function(err,discuss){
        if(err){
            console.log(err);
        }else{
            //redirect the discussions page
            res.redirect("/discussions");
        }
    });
});
//new page to add discussion
app.get("/discussions/new",isLoggedIn,function(req,res){
    res.render("discussion/new.ejs");
    console.log("Request for form page to add discussion!!");
});

//show rout description of a particular object in brief
app.get("/discussions/:id",function(req,res){
    //find the topics with provide id
    discussion.findById(req.params.id).populate("comments").exec(function(err,founddiscussion){
        if(err){
            console.log("something went wrong");
            console.log(err);
        }else{
            //render show tempelate with that id
        res.render("discussion/show.ejs",{discussion:founddiscussion});
        }
    });
    
});

//=================================
//edit and update discussion route
//==================================

//edit discussion route
app.get("/discussions/:id/edit",checkdiscussionOwnership,function(req,res){
    discussion.findById(req.params.id,function(err,founddiscussion){
        res.render("discussion/edit",{discussion:founddiscussion});
    });
});

//update discussion route
app.put("/discussions/:id",checkdiscussionOwnership,function(req,res){
//find and update the correct discussion and redirect
discussion.findByIdAndUpdate(req.params.id,req.body.discussion,function(err,updateddiscussion){
if(err){
    res.redirect("/discussions");
}else{
    res.redirect("/discussions/"+req.params.id);
}
})
});

//destroy champground
app.delete("/discussions/:id",checkdiscussionOwnership,function(req,res){
//res.send("you are trying to delet it"); 
discussion.findByIdAndRemove(req.params.id, function(err,){
if(err){
    res.redirect("/discussions");
}else{
    res.redirect("/discussions");
}
});
});



//=============================================================
//comment routes
//==============================================================

app.get("/discussions/:id/comments/new",isLoggedIn,function(req,res){
    discussion.findById(req.params.id ,function(err,discussion){
        if(err){
            console.log("something went wrong");
        }else{
            res.render("comments/new",{discussion:discussion});
        }
    });
});

app.post("/discussions/:id/comments",isLoggedIn,function(req,res){
    discussion.findById(req.params.id,function(err,discussion){
        if(err){
            console.log(err);
            res.redirect("/discussions");
        }else{
            comment.create(req.body.comment,function(err,comment){
                if(err){
                    req.flash("error","Something went wrong,Try again!!");
                    console.log(err);
                }else{
                    comment.author.username=req.user.username;
                    comment.author.id=req.user._id;
                    comment.save();

                    discussion.comments.push(comment);
                    discussion.save();
                    res.redirect("/discussions/"+discussion._id);
                    req.flash("success","Successfully added Comment");
                    console.log(comment);
                }
            })
            
        }
    });
});


//=============================================
//comment delet and edit route
//=============================================
//comment form display
app.get("/discussions/:id/comments/:comment_id/edit",checkCommentOwnership,function(req,res){
    comment.findById(req.params.comment_id,function(err,foundcomment){
        if(err){
            res.redirect("back");
        }else{
            res.render("comments/edit",{discussion_id : req.params.id,comment:foundcomment});
        }
    })
    
});
//comment put request
app.put("/discussions/:id/comments/:comment_id",checkCommentOwnership,function(req,res){
    comment.findByIdAndUpdate(req.params.comment_id, req.body.comment,function(err,updatedcomment){
        if(err){
            req.flash("error","Something went wrong,Try again!!");
            res.redirect("back");
        }else{
            res.redirect("/discussions/"+req.params.id);
        }
    });
});
//comment delet
app.delete("/discussions/:id/comments/:comment_id",checkCommentOwnership,function(req,res){
    //find by id and remove
    comment.findByIdAndRemove(req.params.comment_id,function(err){
        if(err){
            res.redirect("back");
        }else{
            req.flash("success","Comment deleted");
            res.redirect("/discussions/"+req.params.id);
        }
    });
});



//==============================================
//AUTH routes
//==============================================

//show register form
app.get("/register",function(req,res){
    res.render("register");
});

//responsible for user singup logic
app.post("/register",function(req,res){
    var newUser= new User ({username:req.body.username});
    User.register(newUser,req.body.password,function(err,user){
        if(err){
            console.log(err);
            req.flash("error", err.message);
            return res.render("register");
        }
        passport.authenticate("local")(req,res,function(){
            //req.flash("success","Welcome to MYSELF "+user.username);
            res.redirect("/");
        });
    });
});

//show login form
app.get("/login",function(req,res){
    res.render("login");
});
//login logic
//app.post("/ogin",middleware,callback)
app.post("/login",passport.authenticate("local",{
   successRedirect:"/",
   failureRedirect:"/login"
}),function(req,res){

});

//logout
app.get("/logout",function(req,res){
    req.logOut();
    //req.flash("success","Logged you out!!")
    res.redirect("/");
});


//=================================
//collection
//=================================
app.get("/col/new",isLoggedIn,function(req,res){
    console.log(req.user);
    res.render("collections/new");
})
app.post("/col",isLoggedIn,function(req,res){
    
    var newcol={link:req.body.link, rating:req.body.rating,platform:req.body.platform,qname:req.body.qname}
    req.user.col.push(newcol);
    req.user.save();
    console.log(req.user);
    res.redirect("/col");

})
app.get("/col",isLoggedIn,function(req,res){
    res.render("collections/show");
})

//==================================
//delet collection
//=================================
app.delete("/col/:id",function(req,res){
    
    var i=0,po=0;
    req.user.col.forEach(function(mycol){
        if(mycol._id.equals(req.params.id)){
            req.user.col.splice(i,1);
            po=1;
            console.log(req.user);
            req.user.save();
            return res.redirect("/col");
        }
        else{
            i++;
        }
    });
    if(po==0)
    {
        console.log("NOT FOUND");
        res.redirect("/col");
    }
    
    });



//====================================
//isloggedin check
//====================================
function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
        //console.log(User);
    }
    //console.log();
    req.flash("error","You need to be logged in to do that");
    res.redirect("/login");
};


//function check the discussion belongs to owner??
function checkdiscussionOwnership(req,res,next){
    if(req.isAuthenticated()){
        discussion.findById(req.params.id,function(err,founddiscussion){
            if(err){
                res.redirect("back");
            }else{
                //does the user owned champground
                if(founddiscussion.author.id.equals(req.user._id)){
                    next();
                }
                //otherwise redirect
                else{
                    req.flash("error","You dont have permission to do that");
                    res.redirect("back");
                }
            }
        });
    }else{
        req.flash("error","You dont have permission to do that");
        res.redirect("back");
    }
}

//check comment ownership
function checkCommentOwnership(req,res,next){
    if(req.isAuthenticated()){
        comment.findById(req.params.comment_id,function(err,foundComment){
            if(err){
                req.flash("error","Champground not found");
                res.redirect("back");
            }else{
                //does the user owned comment
                if(foundComment.author.id.equals(req.user._id)){
                    next();
                }
                //otherwise redirect
                else{
                    req.flash("error","You dont have permission to do that");
                    res.redirect("back");
                }
            }
        });
    }else{
        res.redirect("back");
    }
}



app.get("/materials",function(req,res){

    console.log("request for material page");
    res.render("material");
});
app.get("/materials/1",function(req,res){

    res.render("material/material1");
});
app.get("/materials/2",function(req,res){

    res.render("material/material2");
});
app.get("/materials/3",function(req,res){

    res.render("material/material3");
});
app.get("/materials/4",function(req,res){

    res.render("material/material4");
});
app.get("/materials/5",function(req,res){

    res.render("material/material5");
});
app.get("/materials/6",function(req,res){

    res.render("material/material6");
});

app.listen(process.env.PORT || 3000,function(){
    console.log("MYSELF server has already started!!");
});