const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController");
const passport = require("passport");
const profileController = require("../controllers/user/profileController");
const cartController = require("../controllers/user/cartController")
const { userAuth } = require("../middlewares/auth");
const wishlistController = require("../controllers/user/wishlistController");
const addressController = require("../controllers/user/addressController");
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
router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/signup' }),
    (req, res) => {
        if (!req.user) {
            return res.redirect('/signup');
        }
        req.session.user = { id: req.user._id };

        res.redirect('/');
    }
);


//Login Management
router.post("/login", userController.login);
router.get("/logout", userController.logout);

//Forgot Password Management
router.get('/forgot-password', profileController.getForgotPassPage);
router.post("/forgot-email-valid", profileController.forgotEmailValid);
router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp);
router.get("/reset-password", profileController.getResetPassPage);
router.post("/resend-forgot-otp", profileController.resendOtp);
router.post("/updatePassword", profileController.updatePass);

//Profile Management
router.get("/userProfile", userAuth, profileController.userProfile);
//email verification Get&Post
router.get("/change-email", userAuth, profileController.changeEmail);
router.post("/change-email", userAuth, profileController.changeEmailValid);
//Email otp verification
router.post("/verify-email-otp", userAuth, profileController.verifyEmailOtp);
router.post("/update-email", userAuth, profileController.updateEmail);

//Password Updates
router.get('/change-password', userAuth, profileController.changePassword);
router.post("/change-password", userAuth, profileController.changePasswordValid);
router.post("/verify-changepassword-otp", userAuth, profileController.verifyChangePassOtp);

//Shopping page
router.get("/shop",userController.loadShoppingPage);

//Product Management
router.get("/productDetails", userAuth, productController.productDetails);

//wishList Management
router.get("/wishlist", userAuth, wishlistController.loadWishlist);
router.post("/addToWishlist", userAuth, wishlistController.addToWishlist);
router.get("/removeFromWishlist", userAuth, wishlistController.removeProduct);

//Address Management
router.get("/addAddress", userAuth, profileController.addAddress);
router.post("/addAddress", userAuth, profileController.postAddAddress);
router.get("/editAddress", userAuth, profileController.editAddress);
router.post("/editAddress", userAuth, profileController.postEditAddress);
router.get("/deleteAddress", userAuth, profileController.deleteAddress);


//Cart Management
router.get("/cart", userAuth, cartController.getCartPage);
module.exports = router