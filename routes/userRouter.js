const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const profileController = require("../controllers/user/profileController");
const { userAuth } = require("../middlewares/auth");

//Error Management
router.get("/pageNotFound", userController.pageNotFound);

//Home page & Sign up Management
router.get("/", userController.loadHomepage);
router.get("/signup", userController.loadSignup);
router.get("/login", userController.loadLogin);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

router.get("/auth/google", passport.authenticate('google', {scope:['profile', 'email']}));

router.get('/auth/google/callback', passport.authenticate('google', {failureRedirect:'/signup'}), (req, res) => {
    res.redirect('/')
});

//Login Management
router.post("/login", userController.login);
router.get("/logout", userController.logout);

//Profile Management
router.get('/forgot-password', profileController.getForgotPassPage);
router.post("/forgot-email-valid", profileController.forgotEmailValid);
router.post("/verfiy-passForgot-otp", profileController.verifyForgotPassOtp);
router.get("/reset-password", profileController.getResetPassPage);
router.post("/resend-forgot-otp", profileController.resendOtp);
router.get("/userProfile", userAuth, profileController.userProfile);


module.exports = router;