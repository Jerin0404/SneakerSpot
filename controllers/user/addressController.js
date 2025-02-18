const Address = require("../../models/addressSchema");

const getAddressPage = async (req, res) => {
    try {
        const addresses = await Address.find();
        res.render("manageAddress", { addresses });
    } catch (error) {
        res.status(500).send("Error fetching addresses");
    }
}


module.exports = {
    getAddressPage,
}
