import { Server as SocketIOServer, Socket } from "socket.io";
import Conversation from "../modals/Conversation";
import Message from "../modals/Message";

export function registerChatEvents(io: SocketIOServer, socket: Socket) {
  socket.on("getConversations", async () => {
    // console.log("getConversations event received");
    try {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("getConversations", {
          success: false,
          msg: "User not authenticated",
        });
        return;
      }

      const conversations = await Conversation.find({
        participants: userId,
      })
        .sort({ updatedAt: -1 })
        .populate({
          path: "lastMessage",
          select: "content senderId attachment createdAt",
        })
        .populate({
          path: "participants",
          select: "name avatar email",
        })
        .lean();

      

      socket.emit("getConversations", {
        success: true,
        data: conversations,
      });
    } catch (error) {
      console.error("get conversation:", error);
      socket.emit("get Conversations", {
        success: false,
        msg: "failed to get conversations",
      });
    }
  });

  socket.on("newConversation", async (data) => {
console.debug("newConversation event received with data:", data);

    try {
      if (data.type == "direct") {
        const existingConversation = await Conversation.findOne({
          type: "direct",
          participants: { $all: data.participants, $size: 2 },
        })
          .populate({
            path: "participants",
            select: "name avatar email",
          })
          .lean();

        if (existingConversation) {
          socket.emit("newConversation", {
            success: true,
            data: { ...existingConversation, isNew: false },
          });
          return;
        }
      }

      const created = await Conversation.create({
        type: data.type,
        participants: data.participants,
        name: data.name,
        avatar: data.avatar,
        createdBy: socket.data.userId,
      });

      console.debug('DEBUG: Conversation created id', created._id);

      // fetch populated conversation safely
      const conversation = await Conversation.findById(created._id)
        .populate({ path: "participants", select: "name avatar email" })
        .populate({ path: "lastMessage", select: "content senderId attachment createdAt" })
        .lean();

      if (conversation) {
        // sanitize the payload to avoid circular references
        const safeParticipants = (conversation.participants || []).map((p:any) => ({ _id: p._id, name: p.name, avatar: p.avatar }));
        const last = conversation.lastMessage as any;
        const safeLastMessage = last && typeof last === 'object' ? { id: last._id, content: last.content, attachment: last.attachment || last.attachement || null, createdAt: last.createdAt } : null;
        const payload = {
          _id: conversation._id,
          type: conversation.type,
          name: conversation.name,
          avatar: conversation.avatar,
          participants: safeParticipants,
          lastMessage: safeLastMessage,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          isNew: true,
        };

        socket.emit("newConversation", {
          success: true,
          data: payload,
        });
      }
    } catch (error: any) {
      console.error("Error creating conversation:", error?.message || error);
      socket.emit("newConversation", {
        success: false,
        msg: "Error creating conversation",
      });
    }
  });

  socket.on("newMessage", async (data) => {
    console.debug("newMessage event received with data:", data);
    try {
      console.log("DEBUG: validating newMessage payload", { conversationId: data?.conversationId, hasAttachment: !!data?.attachment });
      const senderId = data.senderId || data.sender?.id;
      if(!senderId){
        console.log("ERROR: newMessage missing senderId", data);
        socket.emit("newMessage", { success: false, msg: "senderId missing" });
        return;
      }

      if(!data?.conversationId){
        console.log("ERROR: newMessage missing conversationId", data);
        socket.emit("newMessage", { success: false, msg: "conversationId missing" });
        return;
      }

      // verify conversation exists
      const conv = await Conversation.findById(data.conversationId).select("_id participants").lean();
      if(!conv){
        console.log("ERROR: conversation not found for id", data.conversationId);
        socket.emit("newMessage", { success: false, msg: "conversation not found" });
        return;
      }

      const message = await Message.create({
        conversationId: data.conversationId,
        senderId: senderId,
        content: data.content,
        attachment: data.attachment || data.attachement,
      });

      io.to(data.conversationId).emit("newMessage", {
        success: true,
        data: {
          id: (message as any)._id,
          content: data.content,
          sender: {
            id: senderId,
            name: data.sender?.name || null,
            avatar: data.sender?.avatar || null,
          },
          attachment: data.attachment || data.attachement || null,
          createdAt: (message as any).createdAt || new Date().toISOString(),
          conversationId: data.conversationId,
        },
      });

      const updated = await Conversation.findByIdAndUpdate(
        data.conversationId,
        { lastMessage: (message as any)._id },
        { new: true }
      );
      console.debug('DEBUG: Updated conversation after message', updated);

      // Emit updated conversation with populated lastMessage
      const updatedConversation = await Conversation.findById(data.conversationId)
        .populate({ path: "participants", select: "name avatar email" })
        .populate({ path: "lastMessage", select: "content senderId attachment createdAt" })
        .lean();

      if(updatedConversation){
        const safeParticipants2 = (updatedConversation.participants || []).map((p:any) => ({ _id: p._id, name: p.name, avatar: p.avatar }));
        const last = updatedConversation.lastMessage as any;
        const safeLast = last && typeof last === 'object' ? { id: last._id, content: last.content, attachment: last.attachment || last.attachement || null, createdAt: last.createdAt } : null;
        const convPayload = {
          _id: updatedConversation._id,
          type: updatedConversation.type,
          name: updatedConversation.name,
          avatar: updatedConversation.avatar,
          participants: safeParticipants2,
          lastMessage: safeLast,
          createdAt: updatedConversation.createdAt,
          updatedAt: updatedConversation.updatedAt,
          isNew: false,
        };
        console.debug('DEBUG: Emitting conversationUpdated payload', convPayload);
        try{
          console.debug('DEBUG: Emitting conversationUpdated payload (json)', JSON.stringify(convPayload));
        }catch(err){
          console.debug('DEBUG: JSON stringify failed', err);
        }
        io.to(data.conversationId).emit("conversationUpdated", { success: true, data: convPayload });
      }
    } catch (error: any) {
      console.error("Error creating message:", error?.message || error, error?.stack || "");
      socket.emit("newMessage", {
        success: false,
        msg: "Error creating message",
        error: error?.message || null,
      });
    }
  });

  socket.on("getMessages", async (data:  {conversationId: String})  => {
    console.debug("getMessages event received with data:", data);
    try {
      const messages = await Message.find({
        conversationId: data.conversationId,
      })
        .sort({ createdAt: 1 })
        .populate({ path: "senderId", select: "name avatar email" })
        .lean();

        const messagesWithSender = messages.map(message => {
          const msgAny: any = message as any;
          const attachment = msgAny.attachment || msgAny.attachement || null;
          return ({
            ...message,
            id: message._id,
            attachment,
            sender: {
              id: (message.senderId as any)?._id,
              name: (message.senderId as any)?.name,
              avatar: (message.senderId as any)?.avatar,
            }
          });
        });

        socket.emit("getMessages", {
          success: true,
          data: messagesWithSender
        });
      
    } catch (error) {
      console.log("Error creating message:", error);
      socket.emit("newMessage", {
        success: false,
        msg: "Error getting messages",
      });
    }

  })
}
