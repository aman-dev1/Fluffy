import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined in environment variables");
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Database connected successfully ✅");
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  }
};

export default connectDB;




// const connectDB = async () : Promise<void> => {
//     try {
//         await mongoose.connect(process.env.MONGO_URI as string);
//     }catch (error) {
//         console.log("Error connecting to the database:", error);
//         throw error;
//     }
// };
// export default connectDB;
 
// import mongoose from "mongoose";
