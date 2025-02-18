const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const profileController = require("../controllers/user/profileController");
const { userAuth } = require("../middlewares/auth");
const wishlistController = require("../controllers/user/wishlistController");

//Error Management
router.get("/pageNotFound", userController.pageNotFound);

//Home page & Sign up Management
router.get("/", userController.loadHomepage);
router.get("/signup", userController.loadSignup);
router.get("/login", userController.loadLogin);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

//Google Auth
router.get("/auth/google", passport.authenticate('google', {scope:['profile', 'email']}));
router.get('/auth/google/callback', passport.authenticate('google', {failureRedirect:'/signup'}), (req, res) => {
    res.redirect('/')
});

//Login Management
router.post("/login", userController.login);
router.get("/logout", userController.logout);

//Forgot Password Management
router.get('/forgot-password', profileController.getForgotPassPage);
router.post("/forgot-email-valid", profileController.forgotEmailValid);
router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp);
router.get("/reset-password", profileController.getResetPassPage);
router.post("/resend-forgot-otp", profileController.resendOtp);

//Profile Management
router.get("/userProfile", userAuth, profileController.userProfile);
//email verification Get&Post
router.get("/change-email", userAuth, profileController.changeEmail);
router.post("/change-email", userAuth, profileController.changeEmailValid);
//Email otp verification
router.post("/verify-email-otp", userAuth, profileController.verifyEmailOtp);
router.post("/update-email", userAuth, profileController.updateEmail);

//Password Updates::
router.get('/change-password', userAuth, profileController.changePassword);
router.post("/change-password", userAuth, profileController.changePasswordValid);
router.post("/verify-changepassword-otp", userAuth, profileController.verifyChangePassOtp);



//Shopping page
router.get("/shop",userController.loadShoppingPage);
router.get("/filter", userAuth, userController.filterProduct);
router.get("/filterPrice", userAuth, userController.filterByPrice);

//wishList Management
router.get("/wishlist", userAuth, wishlistController.loadWishlist);

module.exports = router