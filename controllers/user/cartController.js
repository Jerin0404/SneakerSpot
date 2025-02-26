const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const mongoose = require("mongoose");

const viewCart = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id;
        const cart = await Cart.findOne({ userId })
            .populate("items.productId", "name image salePrice stock category brand");

        if (!cart || cart.items.length === 0) {
            return res.render("cart", {
                data: [],
                grandTotal: 0,
                user: req.session.user,
                message: "Your cart is empty."
            });
        }

        let grandTotal = 0;

        const formattedCart = cart.items.map(item => {
            const product = item.productId;

            if (!product) {
                console.warn(`Product not found for cart item: ${item._id}`);
                return null;
            }

            const totalPrice = product.salePrice * item.quantity;
            grandTotal += totalPrice;

            return {
                cartId: cart._id,
                productDetails: [product],
                productId: product._id,
                name: product.name || "No Name Available",
                image: product.image ? product.image[0] : "default.jpg",
                category: product.category || "Unknown Category",
                brand: product.brand || "Unknown Brand",
                size: item.size,
                quantity: item.quantity,
                price: product.salePrice,
                totalPrice,
                status: item.status,
                isOutOfStock: product.stock < item.quantity
            };
        }).filter(item => item !== null);

        res.render("cart", {
            data: formattedCart,
            grandTotal,
            user: req.session.user,
            message: ""
        });

    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).render("cart", {
            data: [],
            grandTotal: 0,
            user: req.session.user,
            message: "Internal server error."
        });
    }
};



const addToCart = async (req, res) => {
    try {
        console.log("Received request to add to cart:", req.body);


        if (!req.session || !req.session.user || !req.session.user.id) {
            console.log("User not logged in");
            return res.status(401).json({ status: false, message: "User not logged in" });
        }

        let { productId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            console.log(`Invalid Product ID: ${productId}`);
            return res.status(400).json({ status: false, message: "Invalid Product ID" });
        }

        const userId = req.session.user.id;
        console.log(`User ID: ${userId}, Product ID: ${productId}`);


        const product = await Product.findById(productId).lean();
        if (!product) {
            console.log("Product not found:", productId);
            return res.status(404).json({ status: false, message: "Product not found" });
        }


        if (product.stock <= 0) {
            console.log(`Product ${productId} is out of stock`);
            return res.status(400).json({ status: false, message: "Product is out of stock" });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            console.log(`Creating a new cart for user: ${userId}`);
            cart = new Cart({ userId, items: [] });
        }

        const existingItem = cart.items.find(item => item.productId.toString() === productId);

        if (existingItem) {
            if (existingItem.quantity + 1 > product.stock) {
                console.log(`Exceeds available stock for product: ${productId}`);
                return res.status(400).json({ status: false, message: "Exceeds available stock" });
            }
            existingItem.quantity += 1;
            existingItem.totalPrice = existingItem.quantity * existingItem.price;
        } else {
            cart.items.push({
                productId,
                quantity: 1,
                price: product.salePrice,
                totalPrice: product.salePrice,
                status: "pending"
            });
        }

        await cart.save();
        console.log("Product added to cart successfully");

        res.json({ status: true, message: "Added to cart successfully" });

    } catch (error) {
        console.error("Error adding to cart:", error.message, error.stack);
        res.status(500).json({ status: false, message: "Internal server error", error: error.message });
    }
};
module.exports = {
    viewCart,
    addToCart,
}