const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Banner = require("../../models/bannerSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const loadHomepage = async (req, res) => {
    try {
        const today = new Date().toISOString();
        const findBanner = await Banner.find({
            startDate: { $lt: new Date(today) },
            endDate: { $gt: new Date(today) },
        });

        let userData = null;

        if (req.user) {
            userData = req.user;
        } else if (req.session.user) {
            userData = await User.findById(req.session.user.id);
        }

        const categories = await Category.find({ isListed: true });
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        });

        productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
        productData = productData.slice(0, 4);

        res.render("home", {
            user: userData,
            products: productData,
            banner: findBanner || []
        });

    } catch (error) {
        console.error("Home page not loading", error);
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
        const { otp } = req.body;
        console.log("Entered OTP:", otp);

        if (otp !== req.session.userOtp) {
            return res.status(400).json({ success: false, message: "Invalid OTP, Please try again" });
        }


        const user = req.session.userData;
        const passwordHash = await securePassword(user.password);

        const saveUserData = new User({
            name: user.name,
            email: user.email,
            phone: user.phone,
            password: passwordHash
        });

        await saveUserData.save();
        req.session.user = { id: saveUserData._id, name: saveUserData.name };

        delete req.session.userOtp;
        delete req.session.userData;

        console.log("User signed up and logged in:", req.session.user);

        res.json({ success: true, redirectUrl: "/" });

    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};


const resendOtp = async (req, res) => {
    try {
        console.log("Session Data:", req.session);

        if (!req.session.userData) {
            return res.status(400).json({ success: false, message: "Session expired. Please restart signup." });
        }

        const { email } = req.session.userData;
        console.log("Email from session:", email);

        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP:", otp);
            return res.status(200).json({ success: true, message: "OTP Resent Successfully" });
        } else {
            return res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again." });
        }

    } catch (error) {
        console.error("Error resending OTP", error);
        return res.status(500).json({ success: false, message: "Internal Server Error. Please try again." });
    }
};


const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("login");
        }


        const user = await User.findById(req.session.user);

        if (!user) {
            req.session.destroy();
            return res.render("login");
        }

        if (user.isBlocked) {
            req.session.destroy();
            return res.status(403).json({ message: "Your account is blocked by the admin" });
        }

        res.redirect("/");

    } catch (error) {
        console.error("Error in loadLogin:", error);
        res.redirect("/pageNotFound");
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: 0, email });

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

        req.session.user = {
            id: findUser._id,
            name: findUser.name
        };

        res.redirect("/");
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
        let categories = await Category.find({});
        let brands = await Brand.find({});

        const { search, sort, categories: categoryQuery, brands: brandQuery, sizes, minPrice, maxPrice, page = 1 } = req.query;
        const limit = 9;
        const skip = (parseInt(page) - 1) * limit;

        let filter = {
            isBlocked: false,
            quantity: { $gt: 0 },
        };


        if (search) {
            filter.productName = { $regex: search, $options: "i" };
        }
        if (categoryQuery) {
            const categoryArray = Array.isArray(categoryQuery) ? categoryQuery : categoryQuery.split(",");
            filter.category = { $in: categoryArray };
        }

        if (brandQuery) {
            const brandArray = Array.isArray(brandQuery) ? brandQuery : brandQuery.split(",");
            filter.brand = { $in: brandArray };
        }


        if (sizes) {
            const sizeArray = Array.isArray(sizes) ? sizes : sizes.split(",");
            filter.sizes = { $in: sizeArray };
        }
        if (minPrice || maxPrice) {
            filter.salePrice = {};
            if (minPrice) filter.salePrice.$gte = parseFloat(minPrice);
            if (maxPrice) filter.salePrice.$lte = parseFloat(maxPrice);
        }

        let sortOption = {};
        switch (sort) {
            case "priceLowHigh":
                sortOption = { salePrice: 1 };
                break;
            case "priceHighLow":
                sortOption = { salePrice: -1 };
                break;
            case "nameAZ":
                sortOption = { productName: 1 };
                break;
            case "nameZA":
                sortOption = { productName: -1 };
                break;
            case "newArrivals":
                sortOption = { createdAt: -1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }

        const [products, totalProducts] = await Promise.all([
            Product.find(filter).sort(sortOption).skip(skip).limit(limit).lean(),
            Product.countDocuments(filter),
        ]);

        res.render("shop", {
            products,
            totalProducts,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / limit),
            search,
            sort,
            categories,
            brands,
            minPrice,
            maxPrice,
        });
    } catch (error) {
        console.error("Error loading products:", error);
        res.redirect("pageNotFound");
    }
};




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
}