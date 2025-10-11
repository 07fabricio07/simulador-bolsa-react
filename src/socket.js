import { io } from "socket.io-client";
const socket = io("https://simulador-bolsa-backend.onrender.com");
export default socket;