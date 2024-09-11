import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChatroomService {
  @Inject(PrismaService)
  private prismaService: PrismaService;

  async createOneToOneChatroom(friendId: number, userId: number) {
    const { id } = await this.prismaService.chatRoom.create({
      data: {
        name: '聊天室' + Math.random().toString().slice(2, 8),
        type: 0,
      },
      select: {
        id: true,
      },
    });

    await this.prismaService.userChatRoom.create({
      data: {
        userId,
        chatRoomId: id,
      },
    });
    await this.prismaService.userChatRoom.create({
      data: {
        userId: friendId,
        chatRoomId: id,
      },
    });
    return '创建成功';
  }

  async createGroupChatroom(name: string, userId: number) {
    const { id } = await this.prismaService.chatRoom.create({
      data: {
        name,
        type: 1,
      },
    });
    await this.prismaService.userChatRoom.create({
      data: {
        userId,
        chatRoomId: id,
      },
    });
    return '创建成功';
  }

  async list(userId: number) {
    const chatRoomIds = await this.prismaService.userChatRoom.findMany({
      where: {
        userId,
      },
      select: {
        chatRoomId: true,
      },
    });
    const chatRooms = await this.prismaService.chatRoom.findMany({
      where: {
        id: {
          in: chatRoomIds.map((item) => item.chatRoomId),
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        createTime: true,
      },
    });
    const res = [];
    for (let i = 0; i < chatRooms.length; i++) {
      const userIds = await this.prismaService.userChatRoom.findMany({
        where: {
          chatRoomId: chatRooms[i].id,
        },
        select: {
          userId: true,
        },
      });
      res.push({
        ...chatRooms[i],
        userCount: userIds.length,
        userIds: userIds.map((item) => item.userId),
      });
    }

    return res;
  }

  async members(chatRoomId: number) {
    const userIds = await this.prismaService.userChatRoom.findMany({
      where: {
        chatRoomId,
      },
      select: {
        userId: true,
      },
    });
    const users = await this.prismaService.user.findMany({
      where: {
        id: {
          in: userIds.map((item) => item.userId),
        },
      },
      select: {
        id: true,
        username: true,
        nickName: true,
        headPic: true,
        createTime: true,
        email: true,
      },
    });
    return users;
  }

  async info(id: number) {
    const chatroom = await this.prismaService.chatRoom.findUnique({
      where: {
        id,
      },
    });
    return { ...chatroom, users: await this.members(id) };
  }

  async join(id: number, userId: number) {
    const chatRoom = await this.prismaService.chatRoom.findUnique({
      where: {
        id,
      },
    });
    if (chatRoom.type === 0) {
      throw new BadRequestException('一对一聊天室不能加人');
    }

    await this.prismaService.userChatRoom.create({
      data: {
        userId,
        chatRoomId: id,
      },
    });

    return '加入成功';
  }

  async quit(id: number, userId: number) {
    const chatRoom = await this.prismaService.chatRoom.findUnique({
      where: {
        id,
      },
    });
    if (chatRoom.type === 0) {
      throw new BadRequestException('一对一聊天室不能退出');
    }

    await this.prismaService.userChatRoom.deleteMany({
      where: {
        userId,
        chatRoomId: id,
      },
    });

    return '退出成功';
  }
}
