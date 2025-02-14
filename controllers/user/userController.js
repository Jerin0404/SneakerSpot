const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Banner = require("../../models/bannerSchema")
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const loadHomepage = async (req, res) => {
    try {
        const today = new Date().toISOString();
        const findBanner = await Banner.find({
            startDate:{$lt:new Date(today)},
            endDate:{$gt:new Date(today)},
        })
        let userData = null;
        if(req.user) {
            userData = req.user;
        }else if (req.session.user) {
            userData = await User.findOne({_id:req.session.user});
        }

        const categories = await Category.find({isListed:true});
        let productData = await Product.find (
            {isBlocked:false,
                category:{$in:categories.map(category => category._id)}, quantity:{$gt:0}
            }

        )

        productData.sort((a,b) => new Date(b.createdOn)-new Date(a.createdOn));
        productData = productData.slice(0, 4);

        res.render("home", {
            user: userData,
            products: productData,
            banner: findBanner || []
        })
        // if (user) {
        //     const userData = await User.findOne({ _id: user._id });
        //     res.render("home", { user: userData, products: productData });  // Pass userData to template
        // } else {
        //     res.render("home", { user: null , products:productData});  // Ensure user is always defined
        // }
    } catch (error) {
        console.log("Home page not loading", error);
        res.status(500).send("Server Error");
    }
};


const pageNotFound = async (req, res) => {
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const loadSignup = async (req, res) => {
    try {
        return res.render('signup');
    } catch (error) {
        console.log("Home page not loading", error);
        res.status(500).send("Server Error");
    }
}

function generateOtp () {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail (email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Veriy your account",
            text: `Your OTP is ${otp}`,
            html:`<b>Your OTP: ${otp}</b>`,
        })

        return info.accepted.length > 0
    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}

const signup = async (req, res) => {
    try {
        const {name, phone, email, password, cPassword} = req.body;

        if(password !== cPassword) {
            return res.render("signup", {message: "Password do not match"});
        }
        const findUser = await User.findOne({email});
        if(findUser) {
            return res.render("signup", {message: "User with this email already exist"});
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if(!emailSent) {
            return res.json("email-error")
        }

        req.session.userOtp = otp;
        req.session.userData = {name, phone, email, password};

        res.render("verify-otp");
        console.log("OTP Sent", otp);
    } catch (error) {
        console.error("signup error", error);
        res.redirect("/pageNotFound");

    }
}

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;

    } catch (error) {
        
    }
}

const verifyOtp = async (req, res) => {
    try {
        
        const {otp} = req.body;
        console.log(otp);


        if(otp === req.session.userOtp) {
            const user = req.session.userData
            const passwordHash = await securePassword (user.password);
            const saveUserData = new User ({
                name: user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash
            })

            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({success:true, redirectUrl:"/"})
        }else {
            res.status(400).json({success:false, message:"Invalid OTP, Please try again"});
        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({success:false, message:"An error occured"})
    }
}

const resendOtp = async (req, res) => {
    try {
        const {email} = req.session.userData;
        console.log(email)
        if(!email) {
            return res.status(400).json({success:false, message:"Email not found in session"})
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if(emailSent) {
            console.log("Resend OTP:", otp);
            res.status(200).json({success:true, message:"OTP Resend Successfully"});
        }else {
            res.status(500).json({success:false, message:"Failed to resend OTP. Please try again"});
        }
    } catch (error) {
        console.error("Error resending OTP", error);
        res.status(500).json({success:false, message:"Internal Server Error.Please try again"});
    }
}

const loadLogin = async (req, res) => {
    try {
        if(!req.session.user) {
            return res.render("login");
        }else {
            res.redirect("/");
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: 0, email: email });

        if (!findUser) {
            return res.render("login", { message: "User not found" });
        }
        if (findUser.isBlocked) {
            return res.render("login", { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect Password" });
        }

        req.session.user = { _id: findUser._id, name: findUser.name };
        console.log("User logged in:", req.session.user);

        req.session.save(() => {
            res.redirect("/");
        });

    } catch (error) {
        console.error("Login error", error);
        res.render("login", { message: "Login failed. Please try again later" });
    }
};

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log("Session destruction error:", err.message);
                return res.redirect("/pageNotFound");
            }
            console.log("User logged out");
            return res.redirect("/login");
        });
    } catch (error) {
        console.log("Logout error", error);
        res.redirect("/pageNotFound");
    }
};

const loadShoppingPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        const categories = await Category.find({isListed:true});
        const categoryIds = categories.map((category) => category._id.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page-1) * limit;
        const products = await Product.find({
            isBlocked:false,
            category:{$in:categoryIds},
            quantity:{$gt:0},
        }).sort({createdOn:-1}).skip(skip).limit(limit);
        const totalProducts = await Product.countDocuments({
            isBlocked:false,
            category:{$in:categoryIds},
            quantity: {$gt:0}
        });
        const totalPages = Math.ceil(totalProducts/limit);

        const brands = await Brand.find({isBlocked:false});
        const categoriesWithIds = categories.map(category => ({_id:category._id, name:category.name}));

        res.render("shop", {
            user:userData,
            products:products,
            category:categoriesWithIds,
            brand: brands,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages:totalPages
        })

    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const filterProduct = async (req, res) => { 
    try {
        let findProducts = await Product.find(query).lean();
    findProducts.sort((a,b) => new Date (b.createdOn) - new Date(a.createdOn));
    const categories = await Category.find({isListed:true});

    let itemsPerPage = 6;

    let currentPage = parseInt(req.query.page) || 1;
    let startIndex = (currentPage - 1) * itemsPerPage;
    let endIndex = Math.ceil(findProducts.length/itemsPerPage);
    const currentProduct = findProducts.slice(startIndex, endIndex);
    let userData = null;

    if(user) {
        userData = await User.findOne({_id:user});
        if(userData) {
            const searchEntry = {
                category: findCategory ? findCategory._id:null,
                brand: findBrand ? findBrand.brandName: null,
                searchedOn: new Date(),
            }
            userData.searchHistory.push(searchEntry);
            await userData.save();
        }
    }
        res.session.filteredProducts = currentProduct;
        res.render('shop', {
            products:currentProduct,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
            selectedCategory: category || null,
            selectedBrand: brand || null
        })
    } catch (error) {
        res.redirect('/pageNotFound');
    }
    
}

const filterByPrice = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        const brands = await Brand.find({}).lean();
        const categories = await Category.find({isListed:true}).lean();

        let findProducts = await Product.find({
            salePrice: {$gt:req.query.gt, $lt:req.query.lt},
            isBlocked: false,
            quantity: {$gt: 0}
        }).lean();

        findProducts.sort((a,b) => new Date(b.createdOn) - new Date(a.createdOn));
        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length/itemsPerPage);
        const currentProduct = findProducts.slice(startIndex, endIndex);
        req.session.filteredProducts = findProducts;

        res.render("shop", {
            user: userData,
            products: currentProduct,
            categories: categories,
            brands: brands,
            totalPages,
            currentPage,
        })
    } catch (error) {
        console.log(error);
        res.redirect("/pageNotFound");
    }
}

module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    loadLogin,
    signup,
    verifyOtp,
    resendOtp,
    login,
    logout,
    loadShoppingPage,
    filterProduct,
    filterByPrice,
}