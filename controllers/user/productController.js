const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");


const productDetails = async (req, res) => {
    try {
        const userId = req.session?.user?.id;
        const userData = userId ? await User.findById(userId) : null;
        const productId = req.query.id;

        if (!productId) {
            return res.redirect("/pageNotFound");
        }

        const product = await Product.findById(productId).populate('category');

        if (!product) {
            return res.redirect("/pageNotFound");
        }

        const findCategory = product.category || {};
        const categoryOffer = findCategory.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;

        let sizes = [];
        if (Array.isArray(product.sizes)) {
            sizes = product.sizes.flatMap(size => 
                typeof size === "string" ? size.split(",") : [size]
            ).map(size => size.trim());
        }

        const basePrice = product.basePrice || 0;
        const baseSize = Math.min(...sizes.map(size => parseInt(size, 10)));

        const sizePrices = sizes.reduce((acc, size) => {
            const numericSize = parseInt(size, 10);
            if (!isNaN(numericSize)) {
                acc[size] = numericSize >= baseSize ? basePrice + (numericSize - baseSize) * 200 : basePrice;
            }
            return acc;
        }, {});
        

        res.render("product-details", {
            user: userData,
            product: { ...product.toObject(), sizes, sizePrices },
            quantity: product.quantity,
            totalOffer,
            category: findCategory,
        });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.redirect("/pageNotFound");
    }
};


module.exports = {
    productDetails
}