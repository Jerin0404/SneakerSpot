const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const env = require("dotenv").config();
const crypto = require("crypto");
const Coupon = require("../../models/couponSchema");
const { v4: uuidv4 } = require("uuid");


const getOrderListPageAdmin = async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdOn: -1 });
        const itemsPerPage = 3;
        const currentPage = parseInt(req.query.page) || 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const totalPages = Math.ceil(orders.length / 3);
        const currentOrder = orders.slice(startIndex, endIndex);
        currentOrder.forEach(order => {
            order.orderId = uuidv4();
        });
        res.render("orderList", { orders: currentOrder, totalPages, currentPage });
    } catch (error) {
        res.redirect("/admin/pageerror");
    }
}


const changeOrderStatus = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        const userId = req.query.userId;
        const status = req.query.status;
        await Order.updateOne({ _id: orderId }, { status }).then((data) => console.log(data));

        const findOrder = await Order.findOne({ _id: orderId });

        if (findOrder.status.trim() === "Returned" &&
            ["razorpay", "wallet", "cod"].includes(findOrder.payment)) {
            const findUser = await User.findOne({ _id: userId });
            if (findUser && findUser.wallet !== undefined) {
                findUser.wallet += findOrder.totalPrice;
                await findUser.save();
            } else {
                console.log("User not found or wallet is undefined");
            }

            await Order.updateOne({ _id: orderId }, { status: "Returned" });
            for (const productData of findOrder.product) {
                const productId = productData._id;
                const quantity = productData.quantity;
                const product = await Product.findById(productId);
                if (product) {
                    product.quantity += quantity;
                    await product.save();
                } else {
                    console.log("Product not found");
                }
            }
        }
        return res.redirect("/admin/orderList");
    } catch (error) {
        console.error(error);
        return res.redirect("/pageerror");
    }
}


const getOrderDetailsPageAdmin = async (req, res) => {
    try {
        const orderId = req.query.id;
        const findOrder = await Order.findOne({ _id: orderId }).sort({
            createdOn: 1,
        });

        if (!findOrder) {
            throw new Error('Order not found');
        }

        const totalGrant = 0;
        findOrder.product.forEach((val) => {
            totalGrant += val.price * val.quantity;
        });

        const totalPrice = findOrder.totalPrice;
        const discount = totalGrant - totalPrice;
        const finalAmount = totalPrice;

        findOrder.product.forEach((product) => {
            product.quantity = product.quantity || 1;
        });

        res.render("orderDetails", {
            orders: findOrder,
            orderId: orderId,
            findAmount: finalAmount,
        })
    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror");
    }
}



module.exports = {
    getOrderListPageAdmin,
    changeOrderStatus,
    getOrderDetailsPageAdmin,
}