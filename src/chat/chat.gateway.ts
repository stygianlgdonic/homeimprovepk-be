import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('ChatGateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, phone: true, role: true, name: true },
      });

      if (!user) {
        client.disconnect(true);
        return;
      }

      (client as any).user = user;
      this.logger.log(`Client connected: ${client.id} (user: ${user.id})`);
    } catch (err) {
      this.logger.warn(`Client ${client.id} authentication failed: ${err.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() chatRoomId: string,
  ) {
    const user = (client as any).user;
    if (!user) throw new WsException('Unauthorized');

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
    });

    if (!room) throw new WsException('Room not found');

    if (room.homeownerId !== user.id && room.thekedaarId !== user.id) {
      throw new WsException('Forbidden');
    }

    await client.join(chatRoomId);
    client.emit('joined_room', { chatRoomId });
    this.logger.log(`User ${user.id} joined room ${chatRoomId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomId: string; content: string },
  ) {
    const user = (client as any).user;
    if (!user) throw new WsException('Unauthorized');

    const { chatRoomId, content } = data;

    if (!chatRoomId || !content || !content.trim()) {
      throw new WsException('Invalid message payload');
    }

    const message = await this.chatService.saveMessage(chatRoomId, user.id, content.trim());

    this.server.to(chatRoomId).emit('new_message', message);

    return message;
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomId: string },
  ) {
    const user = (client as any).user;
    if (!user) throw new WsException('Unauthorized');

    await this.chatService.markMessagesRead(data.chatRoomId, user.id);

    client.emit('messages_read', { chatRoomId: data.chatRoomId });
  }
}
