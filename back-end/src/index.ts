import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { shopsRouter } from "./routes/shops";
import { productsRouter } from "./routes/products";
import { reservationsRouter } from "./routes/reservations";
import { ordersRouter } from "./routes/orders";
import { platformCustomersRouter } from "./routes/platform_customers";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/shops", shopsRouter);
app.use("/products", productsRouter);
app.use("/reservations", reservationsRouter);
app.use("/orders", ordersRouter);
app.use("/platform_customers", platformCustomersRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
