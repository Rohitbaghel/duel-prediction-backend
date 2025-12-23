// sockets/index.ts
import { Server } from "socket.io"
import type { Server as HttpServer } from "http"
import type { Socket } from "socket.io"
import { roomService } from "../services/roomService.js";
import { chessService } from "../services/chessService.js";
import type {
	RoomCreateRequest,
	RoomJoinRequest,
	GameMove
} from "../types/game.js";

export function initSockets(server: HttpServer): void {
  const io = new Server(server, {
    cors: { origin: "*" },
  })

  io.on("connection", (socket: Socket) => {
		console.log("🔌 socket connected", socket.id);

		// Create a new room
		socket.on("create_room", (data: RoomCreateRequest) => {
			try {
				const room = roomService.createRoom(data, socket.id);
				chessService.initializeGame(room.id);

				socket.join(room.id);
				socket.emit("room_created", room);

				// Notify all clients about available rooms update
				io.emit("rooms_updated", roomService.getAvailableRooms());

				console.log(
					`✅ Room created: ${room.id} by ${data.playerAddress}`
				);
			} catch (error) {
				socket.emit("error", { message: "Failed to create room" });
				console.error("Error creating room:", error);
			}
		});

		// Join an existing room
		socket.on("join_room", (data: RoomJoinRequest) => {
			try {
				const result = roomService.joinRoom(data, socket.id);

				if (!result.success) {
					socket.emit("join_room_error", { message: result.error });
					return;
				}

				const room = result.room;
				socket.join(room.id);

				// Initialize game if both players are present
				if (room.players.length === 2) {
					chessService.initializeGame(room.id);
				}

				// Notify the joining player
				socket.emit("room_joined", room);

				// Notify all players in the room
				io.to(room.id).emit("room_updated", room);

				// Notify all clients about available rooms update
				io.emit("rooms_updated", roomService.getAvailableRooms());

				console.log(
					`✅ Player ${data.playerAddress} joined room ${room.id}`
				);
			} catch (error) {
				socket.emit("error", { message: "Failed to join room" });
				console.error("Error joining room:", error);
			}
		});

		// Get list of available rooms
		socket.on("get_rooms", () => {
			const rooms = roomService.getAvailableRooms();
			socket.emit("rooms_list", rooms);
		});

		// Get room details
		socket.on("get_room", (roomId: string) => {
			const room = roomService.getRoom(roomId);
			if (room) {
				socket.emit("room_details", room);
			} else {
				socket.emit("error", { message: "Room not found" });
			}
		});

		// Make a chess move
		socket.on(
			"make_move",
			(data: {
				roomId: string;
				move: GameMove;
				playerAddress: string;
			}) => {
				try {
					const room = roomService.getRoom(data.roomId);
					if (!room) {
						socket.emit("move_error", {
							message: "Room not found"
						});
						return;
					}

					const player = room.players.find(
						p => p.address === data.playerAddress
					);
					if (!player) {
						socket.emit("move_error", {
							message: "Player not in room"
						});
						return;
					}

					const result = chessService.makeMove(
						data.roomId,
						data.move,
						player.color
					);

					if (!result.success) {
						socket.emit("move_error", { message: result.error });
						return;
					}

					// Broadcast move to all players in the room
					const updatedRoom = roomService.getRoom(data.roomId);
					io.to(data.roomId).emit("move_made", {
						move: data.move,
						gameState: result.gameState,
						room: updatedRoom,
						isGameOver: result.isGameOver,
						winner: result.winner
					});

					console.log(
						`♟️ Move made in room ${data.roomId} by ${data.playerAddress}`
					);
				} catch (error) {
					socket.emit("move_error", {
						message: "Failed to make move"
					});
					console.error("Error making move:", error);
				}
			}
		);

		// Get current game state
		socket.on("get_game_state", (roomId: string) => {
			const room = roomService.getRoom(roomId);
			const gameState = chessService.getGameState(roomId);

			if (room && gameState) {
				socket.emit("game_state", {
					room,
					gameState
				});
			} else {
				socket.emit("error", { message: "Game state not found" });
			}
		});

		// Handle disconnection
		socket.on("disconnect", () => {
			console.log("🔌 socket disconnected", socket.id);

			// Remove player from rooms
			const rooms = roomService.getAllRooms();
			rooms.forEach(room => {
				const player = room.players.find(p => p.socketId === socket.id);
				if (player) {
					roomService.removePlayerFromRoom(room.id, socket.id);
					chessService.removeGame(room.id);

					// Notify other players in the room
					io.to(room.id).emit("player_left", { roomId: room.id });
					io.emit("rooms_updated", roomService.getAvailableRooms());
				}
			});
		});
  })

  global.io = io
}
