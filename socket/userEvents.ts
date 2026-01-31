import { Server as SocketIOServer, Socket } from "socket.io";
import user from "../modals/user";
import { generateToken } from "../utils/token";


export function registerUserEvents(io: SocketIOServer, socket: Socket) {
    socket.on("testSocket", (data) =>{
        socket.emit("testSocketResponse", {message: "realtime update"})
    })

    socket.on("updateProfile", async (data: {name?: string, avatar?: string}) =>{
        console.log("updateProfile event received with data:", data);

        const userId = socket.data.userId;
        if(!userId){
            return socket.emit("updateProfileResponse", {
                success: false, msg: "User not authenticated"});
        }

        try {
            const updateUser = await user.findByIdAndUpdate(
                userId,
                { name: data.name, avatar: data.avatar }
                ,{ new: true}
            );

            if(!updateUser){
                return socket.emit("updateProfileResponse",{
                    success: false, msg: "User not found"
                })
            }

            const newToken =  generateToken(updateUser)

            socket.emit("updateProfileResponse",{
                success: true,
                data: {token: newToken},
                msg: "Profile update successfully",

            })
        }catch{
            console.log("Error updating profile")
            socket.emit("updateProfileResponse", {
                success: false, msg: "Error updating profile"});
        }
    })

    socket.on("getContacts", async ()=>{
        try{
            const currentUserId = socket.data.userId;
            if(!currentUserId){
                socket.emit("getContacts", {
                    success: false,
                    msg: "User not authenticated"
                })
             return;
            }

            const users = await user.find(
                {_id: {$ne: currentUserId}},
                {password: 0}
            ).lean();

            const contacts = users.map((user)=>({
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                avatar: user.avatar,
            }));

            socket.emit("getContacts", {
                success: true,
                data: contacts
            });
        }catch(error){
            console.log("Error fetching contacts:", error);
            socket.emit("getContacts", {
                success: false,
                msg: "Error fetching contacts"
            });
        }
    })
}

