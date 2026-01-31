import dotenv from "dotenv";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { registerUserEvents } from "./userEvents";
import { registerChatEvents } from "./chatEvents";
import Conversation from "../modals/Conversation";

dotenv.config();

export function initializeSocket(server: any): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    jwt.verify(
      token,
      process.env.JWT_SECRET as string,
      (err: any, decoded: any) => {
        if (err) {
          return next(new Error("Authentication error: invalid tolen"));
        }

        let userData = decoded.user;
        socket.data = userData;
        socket.data.userId = userData.id;
        socket.data.user = userData;
        next();
      },
    );
  });

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(
      `User connected: ${userId} username: ${socket.data.username}, Socket ID: ${socket.id}`,
    );

    //register events
    registerChatEvents(io, socket);

    registerUserEvents(io, socket);

    try {
      const conversations = await Conversation.find({
        participants: userId,
      })
        .select("_id participants")
        .lean();

      for (const conversation of conversations) {
        const roomId = conversation._id.toString();
        socket.join(roomId);

        const participantIds = (conversation.participants || []).map((p: any) =>
          p.toString(),
        );

        const connectedSockets = Array.from(io.sockets.sockets.values()).filter(
          (s) => participantIds.includes(s.data.userId),
        );

        connectedSockets.forEach((participantSocket) => {
          participantSocket.join(roomId);
        });

        const populatedConversation = await Conversation.findById(conversation._id)
          .populate({
            path: "participants",
            select: "name avatar email",
          })
          .populate({
            path: "lastMessage",
            select: "content senderId attachment createdAt",
          })
          .lean();

        if (!populatedConversation) {
          continue;
        }

        // sanitize payload similar to how it's done after a newMessage so client always receives a consistent shape
        const safeParticipants = (populatedConversation.participants || []).map((p: any) => ({ _id: p._id, name: p.name, avatar: p.avatar }));
        const last = populatedConversation.lastMessage as any;
        const safeLast = last && typeof last === 'object' ? { id: last._id, content: last.content, attachment: last.attachment || last.attachement || null, createdAt: last.createdAt } : null;

        socket.emit("conversationUpdated", {
          success: true,
          data: {
            _id: populatedConversation._id,
            type: populatedConversation.type,
            name: populatedConversation.name,
            avatar: populatedConversation.avatar,
            participants: safeParticipants,
            lastMessage: safeLast,
            createdAt: populatedConversation.createdAt,
            updatedAt: populatedConversation.updatedAt,
            isNew: false,
          },
        });
      }
    } catch (error) {
      console.log("Error joining conversation rooms:", error);
    }

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}, Socket ID: ${socket.id}`);
    });
  });
  return io;
}
