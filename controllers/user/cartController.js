const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");

const viewCart = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect("/login"); // Redirect if user not logged in
        }

        const userId = req.session.user.id;
        const cart = await Cart.findOne({ user: userId }).populate("items.productId");

        if (!cart || cart.items.length === 0) {
            return res.render("cart", { 
                data: [], 
                grandTotal: 0, 
                user: req.session.user, // Pass the user object
                message: "Your cart is empty." 
            });
        }

        let grandTotal = 0; // Initialize grand total

        const formattedCart = cart.items.map(item => {
            const product = item.productId;

            if (!product) {
                console.warn(`Product not found for cart item: ${item._id}`);
                return null; // Skip invalid items
            }

            const totalPrice = product.salePrice * item.quantity;
            grandTotal += totalPrice; // Add to grand total

            return {
                cartId: cart._id,
                productId: product._id,
                name: product.name,
                image: product.image,
                size: item.size, // Size from cart item
                quantity: item.quantity,
                price: product.salePrice,
                totalPrice,
                status: item.status,
                isOutOfStock: product.stock < item.quantity
            };
        }).filter(item => item !== null); // Remove null values

        res.render("cart", { 
            data: formattedCart, 
            grandTotal, 
            user: req.session.user, // Pass the user object
            message: "" 
        });

    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).render("cart", { 
            data: [], 
            grandTotal: 0, 
            user: req.session.user, // Ensure user is still passed
            message: "Internal server error." 
        });
    }
};



module.exports = {
    viewCart,
}