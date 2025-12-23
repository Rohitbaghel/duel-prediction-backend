export interface Player {
	id: string;
	socketId: string;
	address: string; // Wallet address
	color: "white" | "black";
}

export interface Room {
	id: string;
	entryFee: number; // Entry fee in stable currency (USD)
	currency: string; // Currency code (e.g., 'USD', 'USDC')
	players: Player[];
	gameState: string; // FEN notation
	status: "waiting" | "active" | "finished";
	currentTurn: "white" | "black";
	createdAt: Date;
	winner?: "white" | "black" | "draw";
}

export interface GameMove {
	from: string;
	to: string;
	promotion?: string;
}

export interface RoomCreateRequest {
	entryFee: number; // Entry fee in stable currency (USD)
	currency?: string; // Currency code (defaults to 'USD')
	playerAddress: string;
}

export interface RoomJoinRequest {
	roomId: string;
	playerAddress: string;
}
