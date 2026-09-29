import express from "express";
import dotenv from "dotenv/config";
import cookieParser from "cookie-parser";

import uploadsRouter from "./routes/uploadsRoutes.js";
import errorHandler from "./middlewares/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import articlesRouter from "./routes/articlesRoutes.js";
import upcomingEventsRouter from "./routes/upcomingEventsRoutes.js";
import pastEventsRouter from "./routes/pastEventsRoutes.js";
import membersRouter from "./routes/membersRoutes.js";
import inquiriesRouter from "./routes/inquiriesRoutes.js";
import corsConfig from "./config/cors.js";


const app = express();

app.use(corsConfig);

app.use(express.json());
app.use(cookieParser());

const serverPort = process.env.PORT || process.env.SERVER_PORT;

//test comment
app.use('/uploads', uploadsRouter);

app.use('/auth', authRoutes);

app.use('/articles', articlesRouter);

app.use('/upcoming-events', upcomingEventsRouter);

app.use('/past-events', pastEventsRouter);

app.use('/members', membersRouter);

app.use('/inquiries', inquiriesRouter);

app.use(errorHandler);

app.listen(serverPort, () => {
  console.log("New server running on port ", serverPort);
});