import type { Request, Response } from "express";
import User from "../modals/user";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/token";


// export const registerUser = async (req: Request, res: Response): Promise<void> => {
//   const { email, password, name, avatar } = req.body;
//   const normalizedEmail = email.trim().toLowerCase();


//   console.log("Register request received:", { email: normalizedEmail, name });

//   try {
//     // Validate inputs
//     if (!email || !password || !name) {
//       res.status(400).json({ success: false, msg: "All fields are required" });
//       return;
//     }

//     // if (password.length < 6) {
//     //   res.status(400).json({ success: false, msg: "Password must be at least 6 characters" });
//     //   return;
//     // }

//     // const normalizedEmail = email.trim().toLowerCase();
    


//     //check if already exists
//     let user = await User.findOne({ email: normalizedEmail });
//     if(user){
//       res.status(400).json({ success: false, msg: "User already exists" });
//       return;
//     }

//     //create new user
//     user = new User({
//       email: normalizedEmail, 
//       password,
//       name,
//       avatar: avatar || "" ,
//     });


//     //hash password
//     const salt = await bcrypt.genSalt(10);
//     user.password = await bcrypt.hash(password, salt);


//     //save user
//     await user.save();
//     console.log("User registered successfully:");


//     //generate token
//     const token = generateToken(user);

//     res.json({
//       success: true,
//       token,
//      });
//   } catch (error) {
//     console.error("Register error:", error);
//     res.status(500).json({ success: false, msg: "Internal server error" });
//   }
// };

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, avatar } = req.body;

  console.log("Register request received:", req.body);

  try {
    if (!email || !password || !name) {
      res.status(400).json({ success: false, msg: "All fields are required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });
    if (user) {
      res.status(400).json({ success: false, msg: "User already exists" });
      return;
    }

    user = new User({
      email: normalizedEmail,
      password,
      name,
      avatar: avatar || "",
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const token = generateToken(user);

    res.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};


export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  

  try {

    // find user by email
    const user = await User.findOne({ email:normalizedEmail });
    if (!user) {
      res.status(400).json({ success: false, msg: "Invalid credentials" });
      return;
    }


    //compair password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ success: false, msg: "Invalid credentials" });
      return;
    }

    //gen token
    const token = generateToken(user);

    res.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

