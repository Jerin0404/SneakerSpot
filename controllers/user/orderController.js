const mongoose = require("mongoose");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");

const getCheckoutPage = async (req, res) => {
    try {

        const userId = req.session.user?.id;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            console.error("Invalid or Missing User ID:", userId);
            return res.redirect("/pageNotFound");
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        const findUser = await User.findById(userObjectId);
        if (!findUser) {
            console.error("User not found for ID:", userId);
            return res.redirect("/pageNotFound");
        }
        const addressData = await Address.findOne({ userId: userObjectId });
        const cartData = await Cart.findOne({ userId: userObjectId }).populate("items.productId");

        if (!cartData || !cartData.items || cartData.items.length === 0) {
            console.error("Cart is empty or invalid for user ID:", userId);
            return res.redirect("/shop");
        }

        let grandTotal = cartData.items.reduce((total, item) => {
            if (!item.productId || !item.productId.salePrice || !item.quantity) {
                console.error("Invalid cart item:", item);
                return total;
            }
            return total + item.quantity * item.productId.salePrice;
        }, 0);

        if (!grandTotal || grandTotal <= 0) {
            console.error("Grand Total is empty or invalid, redirecting to shop");
            return res.redirect("/shop");
        }

        const today = new Date();
        const findCoupons = await Coupon.find({
            isList: true,
            createdOn: { $lt: today },
            expireOn: { $gt: today },
            minimumPrice: { $lt: grandTotal },
        });

        res.render("checkoutCart", {
            product: cartData.items,
            user: findUser,
            isCart: true,
            userAddress: addressData,
            grandTotal,
            Coupon: findCoupons,
        });

    } catch (error) {
        console.error("Error in getCheckoutPage:", error);
        res.redirect("/pageNotFound");
    }
};

const deleteProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const userId = req.session.user;
        const user = await User.findById(userId);
        const cartIndex = user.cart.findIndex((item) => item.productId == id);
        user.cart.splice(cartIndex, 1);
        await user.save();
        res.redirect("/checkout");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
    
}

module.exports = { 
    getCheckoutPage,
    deleteProduct,
};