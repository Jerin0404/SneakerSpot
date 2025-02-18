const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const session = require("express-session");
const passport = require("./config/passport")
const db = require("./config/db");
const userRouter = require("./routes/userRouter");
const adminRouter = require('./routes/adminRouter');
const { checkBlockedUser } = require("./middlewares/auth");
db();

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72*60*60*1000
    }
}))

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.set('cache-control', 'no-store')
    next();
})

// app.use((req, res, next) => {
//     res.locals.user = req.session.user || null;
//     next();
// });

//Pending.......404 error........
// Catch 404 and forward to error handler
// app.use(function (req, res, next) {
//     res.render('/pageNotFound')
//     next(createError(404));
//   });

app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, "views/user"), path.join(__dirname, "views/admin")]);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));



app.use("/", userRouter);
app.use("/admin", adminRouter);
app.use(checkBlockedUser);


app.listen(process.env.PORT, () => {
    console.log("Server is Running");
})


module.exports = app;