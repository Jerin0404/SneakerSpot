const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const { default: mongoose } = require("mongoose");

function generateOtp() {
    const digits = "1234567890";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

const sendVerificationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        })

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h4>Your OTP: ${otp}</h4><br></b>`
        }
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        return true;

    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}



const getForgotPassPage = async (req, res) => {
    try {
        res.render("forgot-password");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email: email })
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("forgotPass-otp");
                console.log("OTP:", otp);
            } else {
                res.json({ success: false, message: "Failed to send OTP. Please try again" });
            }
        } else {
            res.render("forgot-password", {
                message: "User with this email doesn't exist"
            });
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const verifyForgotPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        console.log("the userOtp", req.session.userOtp);
        if (String(enteredOtp) === String(req.session.userOtp)) {
            res.json({ success: true, redirectUrl: "/reset-password" });
        } else {
            res.json({ success: false, message: "OTP not matching" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "An error occured Please try again" });
    }
}


const getResetPassPage = async (req, res) => {
    try {
        res.render("reset-password");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}


const resendOtp = async (req, res) => {
    try {
        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Resending OTP to email:", email);
        const emailSent = await sendVerificationEmai(email, otp);
        if (emailSent) {
            console.log("Resend OTP:", otp);
            res.status(200).json({ success: true, message: "Resend OTP Successful" });
        }
    } catch (error) {
        console.error("Error in resend otp", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

const userProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({ _id: new mongoose.Types.ObjectId(userId) });
        res.render("profile", {
            user: userData,
        })
    } catch (error) {
        console.error("Error for retrieve profile data", error);
        res.redirect("/pageNotFound");
    }
}

const changeEmail = async (req, res) => {
    try {
        res.render("change-email")
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const changeEmailValid = async (req, res) => {
    try { 
        const { email } = req.body;
        console.log("changeEmail::", req.body);

        const userExists = await User.findOne({ email });
        console.log("exists user", userExists);

        if (userExists) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp; 
                // req.session.userData = req.body;
                req.session.email = email;
                res.render("change-email-otp");
                console.log("OTP:", otp);

            } else {
                res.json("email-error");
            }
        } else {
            
            res.render("change-email", {
                message: "User with this email not exist"
            })
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const verifyEmailOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        
        if (enteredOtp === req.session.userOtp) {
            req.session.userData = req.body.userData;
            res.render("new-email", {
                userData: req.session.userData,
            })
        } else {
            res.render("change-email-otp", {
                message: "OTP not matching",
                userData: req.session.userData
            })
        }

    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


//error in this updateEmail controller
const updateEmail = async (req, res) => {
    try {
        console.log('Post updateEmail:New Email:',req.body);
        console.log('Post updateEmail:New Email:',req.session);
        
        const newEmail = req.body.newEmail;
        const userId = req.session.user.id;
        console.log('Post updateEmail: userId:',userId);

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.redirect("/pageNotFound");
        }

        const updateUser = await User.findByIdAndUpdate(
            userId,
            { email: newEmail },
            { new: true }
        );

        if (!updateUser) {
            return res.redirect("/pageNotFound");
        }

        res.redirect("/userProfile");
    } catch (error) {
        console.error(error);
        console.log(error.message);

        // return res.status(404).send({ status: false, message: "Product not found" });
        res.redirect("/pageNotFound");
    }
}

const changePassword = async (req, res) => {
    try {
        res.render("change-password")
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const changePasswordValid = async (req, res) => {
    try {
        const { email } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-password-otp");
                console.log("OTP:", otp);
            } else {
                res.json({
                    success: false,
                    message: "Failed to send otp. Please try again",

                })
            }
        } else {
            res.render("change-password", {
                message: " User with this email does not exist"
            })
        }
    } catch (error) {
        console.error("Error in change password validation", error);
        res.redirect("/pageNotFound");
    }
}

const verifyChangePassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        if (enteredOtp === req.session.userOtp) {
            res.json({ success: true, redirectUrl: "/reset-password" })
        } else {
            res.json({ success: false, message: "OTP not matching" })
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "An error occured. Please try again later" })
    }
}



module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid,
    verifyChangePassOtp,
}