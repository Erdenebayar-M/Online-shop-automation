"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const products_1 = require("./routes/products");
const reservations_1 = require("./routes/reservations");
const payment_1 = require("./routes/payment");
const customers_1 = require("./routes/customers");
const mapPage_1 = require("./routes/mapPage");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/products", products_1.productsRouter);
app.use("/reservations", reservations_1.reservationRouter);
app.use("/payment", payment_1.paymentRouter);
app.use("/customers", customers_1.customersRouter);
app.use("/map-page", mapPage_1.mapPageRouter);
app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
//# sourceMappingURL=index.js.map