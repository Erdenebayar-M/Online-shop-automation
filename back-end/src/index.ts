import express from "express";
import cors from "cors";

import { productsRouter } from "./routes/products";
import { reservationsRouter } from "./routes/reservations";
import { paymentRouter } from "./routes/payment";
import { customersRouter } from "./routes/customers";
import { mapPageRouter } from "./routes/mapPage";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/products", productsRouter);
app.use("/reservations", reservationsRouter);
app.use("/payment", paymentRouter);
app.use("/customers", customersRouter);
app.use("/map-page", mapPageRouter);

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);
