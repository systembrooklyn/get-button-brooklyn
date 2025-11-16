// "use client";

// import { useState, useEffect, useRef } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import {
//   getChatbotById,
//   getChatHistory,
//   getChatbotByUserId,
// } from "@/app/actions/chatbot-actions";
// import { createClient } from "@/utils/supabase/client";
// import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { ArrowLeft, Send, Pencil, Zap } from "lucide-react";
// import Link from "next/link";
// import EditChatbotModal from "@/components/edit-chatbot-modal";

// export default function TestChatbotPage() {
//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const botId = searchParams.get("botId");

//   const [chatbot, setChatbot] = useState(null);
//   const [chatbots, setChatbots] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [sending, setSending] = useState(false);
//   const [editOpen, setEditOpen] = useState(false);
//   const [userId, setUserId] = useState(null);
//   const messagesEndRef = useRef(null);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const loadData = async () => {
//       if (!botId) return;

//       try {
//         const supabase = await createClient();
//         const {
//           data: { user },
//         } = await supabase.auth.getUser();

//         if (!user) {
//           router.push("/login");
//           return;
//         }

//         setUserId(user.id);

//         const bot = await getChatbotById(botId);
//         setChatbot(bot);

//         const history = await getChatHistory(botId);
//         setMessages(history || []);

//         const allBots = await getChatbotByUserId(user.id);
//         setChatbots(allBots || []);
//       } catch (error) {
//         console.error("[v0] Error loading data:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadData();
//   }, [botId, router]);

//   const handleSendMessage = async (e) => {
//     e.preventDefault();
//     if (!input.trim() || !botId) return;

//     const userMessage = {
//       id: Math.random().toString(),
//       role: "user",
//       content: input,
//       createdAt: new Date().toISOString(),
//     };

//     setMessages((prev) => [...prev, userMessage]);
//     setInput("");
//     setSending(true);

//     try {
//       const response = await fetch("/api/chat", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           message: input,
//           chatbotId: botId,
//         }),
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || "Failed to get response");
//       }

//       const data = await response.json();

//       const aiMessage = {
//         id: Math.random().toString(),
//         role: "assistant",
//         content: data.message,
//         createdAt: new Date().toISOString(),
//       };

//       setMessages((prev) => [...prev, aiMessage]);

//       const updated = await getChatbotById(botId);
//       setChatbot(updated);
//     } catch (error) {
//       console.error("[v0] Error sending message:", error);
//       const errorMessage = {
//         id: Math.random().toString(),
//         role: "assistant",
//         content: `Error: ${
//           error.message || "Failed to get response. Please try again."
//         }`,
//         createdAt: new Date().toISOString(),
//       };
//       setMessages((prev) => [...prev, errorMessage]);
//     } finally {
//       setSending(false);
//     }
//   };

//   const handleEditUpdate = async (updated) => {
//     setChatbot(updated);
//   };

//   const messagesRemaining = chatbot
//     ? chatbot.messagesLimit - chatbot.messageCount
//     : 0;
//   const totalMessages = chatbots.reduce(
//     (sum, c) => sum + (c.messageCount || 0),
//     0
//   );

//   if (loading) {
//     return (
//       <div className="h-screen flex items-center justify-center bg-background">
//         <div className="text-muted-foreground">Loading chatbot...</div>
//       </div>
//     );
//   }

//   if (!chatbot) {
//     return (
//       <div className="h-screen flex items-center justify-center bg-background">
//         <Card className="p-8 text-center bg-card border-border">
//           <h2 className="text-xl font-semibold text-foreground mb-4">
//             Chatbot not found
//           </h2>
//           <Link href="/chatbot">
//             <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
//               Back to Chatbots
//             </Button>
//           </Link>
//         </Card>
//       </div>
//     );
//   }

//   return (
//     /* Made page full height and fixed dark mode background */
//     <div className="h-[90vh] bg-background flex flex-col">
//       <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-0 overflow-hidden">
//         {/* Sidebar */}
//         <div className="lg:col-span-1 border-r border-border p-6 space-y-6 bg-card overflow-y-auto">
//           <Link href="/chatbot">
//             <Button variant="outline" size="sm" className="w-full gap-2">
//               <ArrowLeft className="w-4 h-4" />
//               Back to Chatbots
//             </Button>
//           </Link>

//           <Card className="p-4 bg-background border-border space-y-3">
//             <div className="flex items-center gap-2">
//               {/* <Zap className="w-4 h-4 text-accent" /> */}
//               <h3 className="font-semibold text-sm text-foreground">
//                 Messages Remaining
//               </h3>
//             </div>
//             <div className="text-center">
//               <p className="text-3xl font-bold text-accent">
//                 {messagesRemaining}
//               </p>
//               <p className="text-xs text-muted-foreground">
//                 of {chatbot.messagesLimit}
//               </p>
//             </div>
//             <div className="w-full bg-muted rounded-full h-2">
//               <div
//                 className="bg-accent h-2 rounded-full transition-all"
//                 style={{
//                   width: `${
//                     ((chatbot.messagesLimit - messagesRemaining) /
//                       chatbot.messagesLimit) *
//                     100
//                   }%`,
//                 }}
//               />
//             </div>
//             <p className="text-xs text-center text-muted-foreground">
//               Account: {totalMessages} / {chatbots.length * 20} messages
//             </p>
//           </Card>

//           {/* Edit Button */}
//           <Button
//             onClick={() => setEditOpen(true)}
//             className="bg-accent text-accent-foreground hover:bg-accent/90 w-full gap-2"
//           >
//             <Pencil className="w-4 h-4" />
//             Edit Chatbot
//           </Button>

//           {/* Chatbot Info */}
//           <Card className="p-4 bg-background border-border space-y-3">
//             <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
//               <div className="text-xl">🤖</div>
//             </div>
//             <div>
//               <h3 className="font-semibold text-foreground">{chatbot.name}</h3>
//               <p className="text-xs text-muted-foreground">{chatbot.tagline}</p>
//             </div>
//           </Card>
//         </div>

//         {/* Main Chat Area */}
//         <div className="lg:col-span-3 flex flex-col bg-background overflow-hidden">
//           <div className="border-b border-border p-4 bg-card shrink-0">
//             <div className="max-w-2xl mx-auto">
//               <h1 className="font-bold text-lg text-foreground">
//                 {chatbot.name}
//               </h1>
//               <p className="text-sm text-muted-foreground">{chatbot.tagline}</p>
//             </div>
//           </div>

//           {/* Chat Messages Area */}
//           <div className="flex-1 overflow-y-auto p-6 space-y-4">
//             <div className="max-w-2xl mx-auto w-full space-y-4">
//               {/* Greeting */}
//               <div className="bg-muted rounded-lg p-4 text-foreground text-sm">
//                 {chatbot.greetingMessage}
//               </div>

//               {/* Messages */}
//               {messages.map((msg, idx) => (
//                 <div
//                   key={idx}
//                   className={`flex ${
//                     msg.role === "user" ? "justify-end" : "justify-start"
//                   }`}
//                 >
//                   <div
//                     className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
//                       msg.role === "user"
//                         ? "bg-accent text-accent-foreground rounded-br-none"
//                         : "bg-muted text-foreground rounded-bl-none"
//                     }`}
//                   >
//                     {msg.content}
//                   </div>
//                 </div>
//               ))}
//               <div ref={messagesEndRef} />
//             </div>
//           </div>

//           {/* Input Area */}
//           <div className="border-t border-border p-6 bg-card shrink-0">
//             <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto">
//               <div className="flex gap-2">
//                 <input
//                   type="text"
//                   value={input}
//                   onChange={(e) => setInput(e.target.value)}
//                   placeholder="Type your message..."
//                   disabled={sending || messagesRemaining <= 0}
//                   className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
//                 />
//                 <Button
//                   type="submit"
//                   disabled={sending || !input.trim() || messagesRemaining <= 0}
//                   className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
//                 >
//                   <Send className="w-4 h-4" />
//                   Send
//                 </Button>
//               </div>
//               {messagesRemaining <= 0 && (
//                 <p className="text-xs text-destructive mt-2">
//                   Messages limit reached (20 messages)
//                 </p>
//               )}
//             </form>
//           </div>
//         </div>
//       </div>

//       {/* Edit Modal */}
//       {chatbot && (
//         <EditChatbotModal
//           isOpen={editOpen}
//           onClose={() => setEditOpen(false)}
//           chatbot={chatbot}
//           onChatbotUpdated={handleEditUpdate}
//         />
//       )}
//     </div>
//   );
// }
