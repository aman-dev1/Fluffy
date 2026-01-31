import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () : Promise<void> => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
    }catch (error) {
        console.log("Error connecting to the database:", error);
        throw error;
    }
};
export default connectDB;
 