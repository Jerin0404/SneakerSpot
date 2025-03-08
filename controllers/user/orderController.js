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

        const cartData = await Cart.findOne({ userId: userObjectId })
            .populate({
                path: "items.productId",
                model: "Product",
            });

        if (!cartData || !cartData.items || cartData.items.length === 0) {
            console.error("Cart is empty or invalid for user ID:", userId);
            return res.redirect("/shop");
        }


        let grandTotal = cartData.items.reduce((total, item) => {
            if (!item.productId || !item.productId.salePrice || !item.quantity) {
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
        const id = req.params.id; // Get product ID from request parameters
        const userId = req.session.user._id; // Assuming you're using sessions for user authentication

        // Find and update the user's cart by removing the product
        const updatedCart = await Cart.findOneAndUpdate(
            { userId },
            { $pull: { products: { productId: id } } }, // Remove the product from cart
            { new: true } // Return the updated cart
        );

        if (!updatedCart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        res.json({ success: true, message: "Product removed successfully" });

    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};



module.exports = {
    getCheckoutPage,
    deleteProduct,
};