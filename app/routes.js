module.exports = function(app, passport, db, multer, ObjectId) { //caught requirements from server by these parameters

 // Image Upload Code =========================================================================
var storage = multer.diskStorage({
  destination: (req, file, cb) => { //where to upload files to
    cb(null, 'public/images/uploads') //file path
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + ".png") //file name will be called 
  }
});
var upload = multer({storage: storage}); 

// normal routes ===============================================================

    // show the home page (will also have our login links)
    app.get('/', function(req, res) {
        res.render('index.ejs');
    });

    // PROFILE Page=========================
    app.get('/profile', isLoggedIn, function(req, res) {
        db.collection('posts').find({postedBy: req.user._id}).toArray((err, result) => { //only find posts posted by the signed in user req.user._id(logged in users ID)
          if (err) return console.log(err)
          res.render('profile.ejs', {
            user : req.user,
            posts: result
          })
        })
    });
    //feed page=========================
    app.get('/feed', function(req, res) {  //isLoggedIn middleware removed to make feed page public
      db.collection('posts').find().toArray((err, result) => {
        if (err) return console.log(err)
        res.render('feed.ejs', {
          posts: result
        })
      })
  });

  // ellies snippet
  app.get('/post/:zebra', isLoggedIn, function (req, res) { //using :placeholderName puts the property of the placeholder name and value sent of " " on the object req.params.
    let postId = ObjectId(req.params.zebra) 
    db.collection('posts').find({
        _id: postId
    }).toArray((err, result) => {
        db.collection('comments').find({
            "post": postId
        }).toArray((err, mainResult) => {
            console.log(mainResult);
            if (err) return console.log(err)
            res.render('post.ejs', {
                posts: result,
                comments: mainResult
            })
        })
    })
  });


  // post page =========================
  app.get('/post/:zebra', isLoggedIn, function(req, res) { //using :placeholderName puts the property of the placeholder name and value sent of <%= posts[i]._id %>on the object req.params.
    let postId = ObjectId(req.params.zebra) //req.params.zebra is a string and needs to be wrapped in an objectID for it to match whats in mongoDB
    //console.log(postId)
    db.collection('posts').find({
      _id: postId
    }).toArray((err, result) => { //only render one post where the collection matched the postID
      if (err) return console.log(err)
      res.render('post.ejs', {
        posts: result
      })
    })
});


//profile page   //if on the profile page only want the logged in users posts
app.get('/page/:id', isLoggedIn, function(req, res) {  //using :placeholderName puts the property of the placeholder name and value sent of <%= posts[i].postedBy %> on the object req.params.
  let postId = ObjectId(req.params.id)  //req.params.id is a string and needs to be wrapped in an objectID for it to match whats in mongoDB
  db.collection('posts').find({postedBy: postId}).toArray((err, result) => {
    if (err) return console.log(err)
    res.render('page.ejs', { //page view shows 
      posts: result
    })
  })
});

    // LOGOUT ==============================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

// post routes  used to make a post
app.post('/makePost', upload.single('file-to-upload'), (req, res) => {  //upload.single('file-to-upload') helper function
  let user = req.user._id  //saves the logged in user to a variable
  //console.log(user)
  db.collection('posts').save({caption: req.body.caption, img: 'images/uploads/' + req.file.filename, postedBy: user, heartsUp: 0}, (err, result) => {
    if (err) return console.log(err)
    console.log('saved to database')
    res.redirect('/profile')
  }) 
})



// message board routes ===============================================================

    app.post('/messages', (req, res) => {
      db.collection('messages').save({name: req.body.name, msg: req.body.msg, thumbUp: 0, thumbDown:0}, (err, result) => {
        if (err) return console.log(err)
        console.log('saved to database')
        res.redirect('/profile')
      })
    })

  //   <form action="/makePostComment" method="POST"> 
  //   <input type="text" name="comment" placeholder="comment">
  //   <button type="submit">Submit</button>
  //  </form>

  // to save comments to the database
   app.post('/makePostComment/:id', (req, res) => {
     let postId = ObjectId(req.params.id)
     let user = req.user._id  //saves the logged in user to a variable
     console.log(postId)
      db.collection('comments').save({comment: req.body.comment, post: postId, postedBy: user}, (err, result) => {
        if (err) return console.log(err)
        console.log('saved to database')
        res.redirect('/profile')
      })
    })

    app.put('/messages', (req, res) => {
      let postId = ObjectId(req.body.postId)
      db.collection('posts')
      .findOneAndUpdate({
        _id: postId}, {
        $set: {
          heartsUp: req.body.likes + 1
        }
      }, {
        sort: {_id: -1},
        upsert: true
      }, (err, result) => {
        if (err) return res.send(err)
        res.send(result)
      })
    })

    app.delete('/messages', (req, res) => {
      db.collection('messages').findOneAndDelete({name: req.body.name, msg: req.body.msg}, (err, result) => {
        if (err) return res.send(500, err)
        res.send('Message deleted!')
      })
    })

// =============================================================================
// AUTHENTICATE (FIRST LOGIN) ==================================================
// =============================================================================

    // locally --------------------------------
        // LOGIN ===============================
        // show the login form
        app.get('/login', function(req, res) {
            res.render('login.ejs', { message: req.flash('loginMessage') });
        });

        // process the login form
        app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/feed', // redirect to the secure profile section
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

        // SIGNUP =================================
        // show the signup form
        app.get('/signup', function(req, res) {
            res.render('signup.ejs', { message: req.flash('signupMessage') });
        });

        // process the signup form
        app.post('/signup', passport.authenticate('local-signup', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/signup', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, just remove the token
// for local account, remove email and password
// user account will stay active in case they want to reconnect in the future

    // local -----------------------------------
    app.get('/unlink/local', isLoggedIn, function(req, res) {
        var user            = req.user;
        user.local.email    = undefined;
        user.local.password = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });

};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}
